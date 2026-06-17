// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VERDICT Escrow
/// @notice A deliberately boring, two-party escrow for the VERDICT AI courtroom.
///         Party A files a case and stakes; Party B accepts and matches the stake.
///         A single trusted `resolver` (the VERDICT backend signer) writes the
///         verdict and triggers the payout. The resolver can ONLY pay one of the
///         two parties — it can never redirect funds to an arbitrary address, and
///         it never takes custody. The off-chain proof bundle (committed via
///         `proofRoot`) makes any dishonest resolution publicly detectable.
///
///         Security posture: no upgradability, no admin stake withdrawal, no
///         arbitrary external calls. ReentrancyGuard + checks-effects-interactions
///         on every payout path. Funds can only ever leave to a case participant.
///
/// @dev    Native-OG stakes only (MVP). ERC20 stakes are a documented stretch.
contract Escrow is ReentrancyGuard {
    // --------------------------------------------------------------------- //
    //                                Types                                  //
    // --------------------------------------------------------------------- //

    enum Status {
        None, // 0 — case id never created
        Open, // 1 — A staked, awaiting B
        Active, // 2 — B matched, in session / awaiting verdict
        Resolved, // 3 — verdict written, winner paid
        Refunded // 4 — refunded/timed out, both parties made whole
    }

    struct Case {
        address creator; // Party A
        address opponent; // Party B (the only address allowed to accept)
        uint256 stake; // per-party stake; pot == 2 * stake once Active
        uint64 acceptDeadline; // B must accept by this timestamp, else A can reclaim
        uint64 resolveDeadline; // resolver must rule by this timestamp, else either party can force refund
        Status status;
        bytes32 claimHash; // hash of the dispute question + ruling criterion (committed off-chain inputs)
        bytes32 proofRoot; // root of the 0G Storage proof bundle, set on resolve
        address winner; // set on resolve
    }

    // --------------------------------------------------------------------- //
    //                              Storage                                  //
    // --------------------------------------------------------------------- //

    /// @notice Address allowed to write verdicts. Immutable — no admin handover.
    address public immutable resolver;

    /// @notice Address that collects the protocol fee. Immutable.
    address public immutable feeRecipient;

    /// @notice Protocol fee in basis points (e.g. 250 == 2.5%), taken from the pot on resolve.
    uint16 public immutable feeBps;

    uint16 public constant MAX_FEE_BPS = 1000; // hard cap: 10%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    uint256 public nextCaseId;
    mapping(uint256 => Case) private _cases;

    // --------------------------------------------------------------------- //
    //                               Events                                  //
    // --------------------------------------------------------------------- //

    event CaseCreated(
        uint256 indexed id,
        address indexed creator,
        address indexed opponent,
        uint256 stake,
        bytes32 claimHash,
        uint64 acceptDeadline,
        uint64 resolveDeadline
    );
    event CaseAccepted(uint256 indexed id, address indexed opponent, uint256 stake);
    event CaseResolved(
        uint256 indexed id,
        address indexed winner,
        address indexed loser,
        uint256 payout,
        uint256 fee,
        bytes32 proofRoot
    );
    event CaseRefunded(uint256 indexed id, uint256 amountPerParty, string reason);
    event PayoutSent(uint256 indexed id, address indexed to, uint256 amount);

    // --------------------------------------------------------------------- //
    //                               Errors                                  //
    // --------------------------------------------------------------------- //

    error ZeroAddress();
    error FeeTooHigh();
    error InvalidStake();
    error InvalidDeadlines();
    error SelfDispute();
    error NotOpponent();
    error NotResolver();
    error NotParticipant();
    error WrongStatus(Status expected, Status actual);
    error StakeMismatch(uint256 expected, uint256 actual);
    error DeadlinePassed();
    error DeadlineNotReached();
    error WinnerNotParticipant();
    error TransferFailed();

    // --------------------------------------------------------------------- //
    //                             Constructor                               //
    // --------------------------------------------------------------------- //

    constructor(address resolver_, address feeRecipient_, uint16 feeBps_) {
        if (resolver_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        resolver = resolver_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
    }

    // --------------------------------------------------------------------- //
    //                             External API                              //
    // --------------------------------------------------------------------- //

    /// @notice File a case. Creator stakes `msg.value`. Opponent must later match it.
    /// @param claimHash hash committing the dispute question + ruling criterion.
    /// @param opponent the only address allowed to accept (Party B).
    /// @param acceptWindow seconds from now within which B must accept.
    /// @param resolveWindow seconds AFTER acceptance within which the resolver must rule.
    /// @return id the new case id.
    function createCase(bytes32 claimHash, address opponent, uint64 acceptWindow, uint64 resolveWindow)
        external
        payable
        returns (uint256 id)
    {
        if (msg.value == 0) revert InvalidStake();
        if (opponent == address(0)) revert ZeroAddress();
        if (opponent == msg.sender) revert SelfDispute();
        if (acceptWindow == 0 || resolveWindow == 0) revert InvalidDeadlines();

        id = nextCaseId++;
        Case storage c = _cases[id];
        c.creator = msg.sender;
        c.opponent = opponent;
        c.stake = msg.value;
        c.claimHash = claimHash;
        c.status = Status.Open;
        c.acceptDeadline = uint64(block.timestamp) + acceptWindow;
        // resolveDeadline is provisional until acceptance; we store the window
        // and finalize the absolute deadline in acceptCase. Store window for now.
        c.resolveDeadline = resolveWindow;

        emit CaseCreated(id, msg.sender, opponent, msg.value, claimHash, c.acceptDeadline, resolveWindow);
    }

    /// @notice Opponent accepts and matches the stake exactly. Case goes Active.
    function acceptCase(uint256 id) external payable nonReentrant {
        Case storage c = _cases[id];
        if (c.status != Status.Open) revert WrongStatus(Status.Open, c.status);
        if (msg.sender != c.opponent) revert NotOpponent();
        if (block.timestamp > c.acceptDeadline) revert DeadlinePassed();
        if (msg.value != c.stake) revert StakeMismatch(c.stake, msg.value);

        c.status = Status.Active;
        // Finalize the absolute resolve deadline from the stored window.
        c.resolveDeadline = uint64(block.timestamp) + c.resolveDeadline;

        emit CaseAccepted(id, msg.sender, msg.value);
    }

    /// @notice Resolver writes the verdict and pays the winner (pot minus fee).
    /// @dev    `winner` MUST be one of the two participants — resolver cannot
    ///         redirect funds to an arbitrary address.
    function resolve(uint256 id, address winner, bytes32 proofRoot) external nonReentrant {
        if (msg.sender != resolver) revert NotResolver();
        Case storage c = _cases[id];
        if (c.status != Status.Active) revert WrongStatus(Status.Active, c.status);
        if (winner != c.creator && winner != c.opponent) revert WinnerNotParticipant();

        // --- effects (state finalized before any value transfer) ---
        uint256 pot = c.stake * 2;
        uint256 fee = (pot * feeBps) / BPS_DENOMINATOR;
        uint256 payout = pot - fee;
        address loser = winner == c.creator ? c.opponent : c.creator;

        c.status = Status.Resolved;
        c.winner = winner;
        c.proofRoot = proofRoot;
        c.stake = 0; // zero out accounting so funds can't be double-spent

        // --- interactions ---
        if (fee > 0) _send(id, feeRecipient, fee);
        _send(id, winner, payout);

        emit CaseResolved(id, winner, loser, payout, fee, proofRoot);
    }

    /// @notice Creator reclaims their stake if the opponent never accepted in time.
    /// @dev    Only valid while Open and past the accept deadline.
    function reclaimUnaccepted(uint256 id) external nonReentrant {
        Case storage c = _cases[id];
        if (c.status != Status.Open) revert WrongStatus(Status.Open, c.status);
        if (msg.sender != c.creator) revert NotParticipant();
        if (block.timestamp <= c.acceptDeadline) revert DeadlineNotReached();

        uint256 amount = c.stake;
        c.status = Status.Refunded;
        c.stake = 0;

        _send(id, c.creator, amount);
        emit CaseRefunded(id, amount, "unaccepted");
    }

    /// @notice If the resolver fails to rule before the resolve deadline, either
    ///         participant can force a refund: both parties get their stake back.
    function timeoutRefund(uint256 id) external nonReentrant {
        Case storage c = _cases[id];
        if (c.status != Status.Active) revert WrongStatus(Status.Active, c.status);
        if (msg.sender != c.creator && msg.sender != c.opponent) revert NotParticipant();
        if (block.timestamp <= c.resolveDeadline) revert DeadlineNotReached();

        uint256 amount = c.stake;
        address creator = c.creator;
        address opponent = c.opponent;

        c.status = Status.Refunded;
        c.stake = 0;

        _send(id, creator, amount);
        _send(id, opponent, amount);
        emit CaseRefunded(id, amount, "timeout");
    }

    // --------------------------------------------------------------------- //
    //                              Views                                    //
    // --------------------------------------------------------------------- //

    function getCase(uint256 id) external view returns (Case memory) {
        return _cases[id];
    }

    function pot(uint256 id) external view returns (uint256) {
        Case storage c = _cases[id];
        if (c.status == Status.Active) return c.stake * 2;
        if (c.status == Status.Open) return c.stake;
        return 0;
    }

    // --------------------------------------------------------------------- //
    //                              Internal                                 //
    // --------------------------------------------------------------------- //

    function _send(uint256 id, address to, uint256 amount) private {
        (bool success,) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit PayoutSent(id, to, amount);
    }
}
