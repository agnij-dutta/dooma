// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";

contract EscrowTest is Test {
    Escrow internal escrow;

    address internal resolver = makeAddr("resolver");
    address internal feeRecipient = makeAddr("feeRecipient");
    address internal alice = makeAddr("alice"); // creator / Party A
    address internal bob = makeAddr("bob"); // opponent / Party B
    address internal eve = makeAddr("eve"); // outsider

    uint16 internal constant FEE_BPS = 250; // 2.5%
    uint256 internal constant STAKE = 1 ether;
    bytes32 internal constant CLAIM = keccak256("is a hot dog a sandwich?");
    bytes32 internal constant PROOF = keccak256("proof-bundle-root");

    uint64 internal constant ACCEPT_WINDOW = 1 days;
    uint64 internal constant RESOLVE_WINDOW = 2 days;

    function setUp() public {
        escrow = new Escrow(resolver, feeRecipient, FEE_BPS);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(eve, 10 ether);
    }

    // ---- helpers ----------------------------------------------------------

    function _create() internal returns (uint256 id) {
        vm.prank(alice);
        id = escrow.createCase{value: STAKE}(CLAIM, bob, ACCEPT_WINDOW, RESOLVE_WINDOW);
    }

    function _createAndAccept() internal returns (uint256 id) {
        id = _create();
        vm.prank(bob);
        escrow.acceptCase{value: STAKE}(id);
    }

    // ---- constructor ------------------------------------------------------

    function test_constructor_setsImmutables() public view {
        assertEq(escrow.resolver(), resolver);
        assertEq(escrow.feeRecipient(), feeRecipient);
        assertEq(escrow.feeBps(), FEE_BPS);
    }

    function test_constructor_revertsZeroResolver() public {
        vm.expectRevert(Escrow.ZeroAddress.selector);
        new Escrow(address(0), feeRecipient, FEE_BPS);
    }

    function test_constructor_revertsFeeTooHigh() public {
        vm.expectRevert(Escrow.FeeTooHigh.selector);
        new Escrow(resolver, feeRecipient, 1001);
    }

    // ---- createCase -------------------------------------------------------

    function test_createCase_happy() public {
        uint256 id = _create();
        Escrow.Case memory c = escrow.getCase(id);
        assertEq(c.creator, alice);
        assertEq(c.opponent, bob);
        assertEq(c.stake, STAKE);
        assertEq(c.claimHash, CLAIM);
        assertEq(uint8(c.status), uint8(Escrow.Status.Open));
        assertEq(address(escrow).balance, STAKE);
        assertEq(escrow.pot(id), STAKE);
    }

    function test_createCase_incrementsIds() public {
        uint256 a = _create();
        uint256 b = _create();
        assertEq(a, 0);
        assertEq(b, 1);
        assertEq(escrow.nextCaseId(), 2);
    }

    function test_createCase_revertsZeroStake() public {
        vm.prank(alice);
        vm.expectRevert(Escrow.InvalidStake.selector);
        escrow.createCase{value: 0}(CLAIM, bob, ACCEPT_WINDOW, RESOLVE_WINDOW);
    }

    function test_createCase_revertsSelfDispute() public {
        vm.prank(alice);
        vm.expectRevert(Escrow.SelfDispute.selector);
        escrow.createCase{value: STAKE}(CLAIM, alice, ACCEPT_WINDOW, RESOLVE_WINDOW);
    }

    function test_createCase_revertsZeroOpponent() public {
        vm.prank(alice);
        vm.expectRevert(Escrow.ZeroAddress.selector);
        escrow.createCase{value: STAKE}(CLAIM, address(0), ACCEPT_WINDOW, RESOLVE_WINDOW);
    }

    function test_createCase_revertsZeroWindows() public {
        vm.prank(alice);
        vm.expectRevert(Escrow.InvalidDeadlines.selector);
        escrow.createCase{value: STAKE}(CLAIM, bob, 0, RESOLVE_WINDOW);
    }

    // ---- acceptCase -------------------------------------------------------

    function test_acceptCase_happy() public {
        uint256 id = _createAndAccept();
        Escrow.Case memory c = escrow.getCase(id);
        assertEq(uint8(c.status), uint8(Escrow.Status.Active));
        assertEq(address(escrow).balance, STAKE * 2);
        assertEq(escrow.pot(id), STAKE * 2);
        // resolveDeadline finalized to absolute timestamp
        assertEq(c.resolveDeadline, uint64(block.timestamp) + RESOLVE_WINDOW);
    }

    function test_acceptCase_revertsWrongOpponent() public {
        uint256 id = _create();
        vm.prank(eve);
        vm.expectRevert(Escrow.NotOpponent.selector);
        escrow.acceptCase{value: STAKE}(id);
    }

    function test_acceptCase_revertsStakeMismatch() public {
        uint256 id = _create();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Escrow.StakeMismatch.selector, STAKE, STAKE + 1));
        escrow.acceptCase{value: STAKE + 1}(id);
    }

    function test_acceptCase_revertsAfterDeadline() public {
        uint256 id = _create();
        vm.warp(block.timestamp + ACCEPT_WINDOW + 1);
        vm.prank(bob);
        vm.expectRevert(Escrow.DeadlinePassed.selector);
        escrow.acceptCase{value: STAKE}(id);
    }

    function test_acceptCase_revertsDoubleAccept() public {
        uint256 id = _createAndAccept();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Escrow.WrongStatus.selector, Escrow.Status.Open, Escrow.Status.Active));
        escrow.acceptCase{value: STAKE}(id);
    }

    // ---- resolve ----------------------------------------------------------

    function test_resolve_paysWinnerMinusFee() public {
        uint256 id = _createAndAccept();
        uint256 pot = STAKE * 2;
        uint256 fee = (pot * FEE_BPS) / 10_000;
        uint256 payout = pot - fee;

        uint256 aliceBefore = alice.balance;
        uint256 feeBefore = feeRecipient.balance;

        vm.prank(resolver);
        escrow.resolve(id, alice, PROOF);

        assertEq(alice.balance, aliceBefore + payout);
        assertEq(feeRecipient.balance, feeBefore + fee);
        assertEq(address(escrow).balance, 0);

        Escrow.Case memory c = escrow.getCase(id);
        assertEq(uint8(c.status), uint8(Escrow.Status.Resolved));
        assertEq(c.winner, alice);
        assertEq(c.proofRoot, PROOF);
        assertEq(escrow.pot(id), 0);
    }

    function test_resolve_winnerCanBeOpponent() public {
        uint256 id = _createAndAccept();
        uint256 payout = (STAKE * 2) - ((STAKE * 2) * FEE_BPS) / 10_000;
        uint256 bobBefore = bob.balance;
        vm.prank(resolver);
        escrow.resolve(id, bob, PROOF);
        assertEq(bob.balance, bobBefore + payout);
    }

    function test_resolve_zeroFee() public {
        Escrow noFee = new Escrow(resolver, feeRecipient, 0);
        vm.prank(alice);
        uint256 id = noFee.createCase{value: STAKE}(CLAIM, bob, ACCEPT_WINDOW, RESOLVE_WINDOW);
        vm.prank(bob);
        noFee.acceptCase{value: STAKE}(id);

        uint256 aliceBefore = alice.balance;
        uint256 feeBefore = feeRecipient.balance;
        vm.prank(resolver);
        noFee.resolve(id, alice, PROOF);
        assertEq(alice.balance, aliceBefore + STAKE * 2);
        assertEq(feeRecipient.balance, feeBefore); // no fee transfer
    }

    function test_resolve_revertsNotResolver() public {
        uint256 id = _createAndAccept();
        vm.prank(eve);
        vm.expectRevert(Escrow.NotResolver.selector);
        escrow.resolve(id, alice, PROOF);
    }

    function test_resolve_revertsWinnerNotParticipant() public {
        uint256 id = _createAndAccept();
        vm.prank(resolver);
        vm.expectRevert(Escrow.WinnerNotParticipant.selector);
        escrow.resolve(id, eve, PROOF);
    }

    function test_resolve_revertsNotActive() public {
        uint256 id = _create(); // still Open
        vm.prank(resolver);
        vm.expectRevert(abi.encodeWithSelector(Escrow.WrongStatus.selector, Escrow.Status.Active, Escrow.Status.Open));
        escrow.resolve(id, alice, PROOF);
    }

    function test_resolve_revertsDoubleResolve() public {
        uint256 id = _createAndAccept();
        vm.prank(resolver);
        escrow.resolve(id, alice, PROOF);
        vm.prank(resolver);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow.WrongStatus.selector, Escrow.Status.Active, Escrow.Status.Resolved)
        );
        escrow.resolve(id, alice, PROOF);
    }

    // ---- reclaimUnaccepted ------------------------------------------------

    function test_reclaimUnaccepted_happy() public {
        uint256 id = _create();
        vm.warp(block.timestamp + ACCEPT_WINDOW + 1);
        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        escrow.reclaimUnaccepted(id);
        assertEq(alice.balance, aliceBefore + STAKE);
        assertEq(address(escrow).balance, 0);
        assertEq(uint8(escrow.getCase(id).status), uint8(Escrow.Status.Refunded));
    }

    function test_reclaimUnaccepted_revertsBeforeDeadline() public {
        uint256 id = _create();
        vm.prank(alice);
        vm.expectRevert(Escrow.DeadlineNotReached.selector);
        escrow.reclaimUnaccepted(id);
    }

    function test_reclaimUnaccepted_revertsNotCreator() public {
        uint256 id = _create();
        vm.warp(block.timestamp + ACCEPT_WINDOW + 1);
        vm.prank(eve);
        vm.expectRevert(Escrow.NotParticipant.selector);
        escrow.reclaimUnaccepted(id);
    }

    function test_reclaimUnaccepted_revertsIfActive() public {
        uint256 id = _createAndAccept();
        vm.warp(block.timestamp + ACCEPT_WINDOW + 1);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Escrow.WrongStatus.selector, Escrow.Status.Open, Escrow.Status.Active));
        escrow.reclaimUnaccepted(id);
    }

    // ---- timeoutRefund ----------------------------------------------------

    function test_timeoutRefund_happy() public {
        uint256 id = _createAndAccept();
        vm.warp(block.timestamp + RESOLVE_WINDOW + 1);
        uint256 aliceBefore = alice.balance;
        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        escrow.timeoutRefund(id);
        assertEq(alice.balance, aliceBefore + STAKE);
        assertEq(bob.balance, bobBefore + STAKE);
        assertEq(address(escrow).balance, 0);
        assertEq(uint8(escrow.getCase(id).status), uint8(Escrow.Status.Refunded));
    }

    function test_timeoutRefund_revertsBeforeDeadline() public {
        uint256 id = _createAndAccept();
        vm.prank(alice);
        vm.expectRevert(Escrow.DeadlineNotReached.selector);
        escrow.timeoutRefund(id);
    }

    function test_timeoutRefund_revertsNotParticipant() public {
        uint256 id = _createAndAccept();
        vm.warp(block.timestamp + RESOLVE_WINDOW + 1);
        vm.prank(eve);
        vm.expectRevert(Escrow.NotParticipant.selector);
        escrow.timeoutRefund(id);
    }

    function test_timeoutRefund_revertsAfterResolved() public {
        uint256 id = _createAndAccept();
        vm.prank(resolver);
        escrow.resolve(id, alice, PROOF);
        vm.warp(block.timestamp + RESOLVE_WINDOW + 1);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow.WrongStatus.selector, Escrow.Status.Active, Escrow.Status.Resolved)
        );
        escrow.timeoutRefund(id);
    }

    // ---- reentrancy -------------------------------------------------------

    function test_resolve_reentrancyBlocked() public {
        // Winner is a malicious contract that re-enters resolve() on receive().
        ReentrantWinner attacker = new ReentrantWinner(escrow);
        vm.deal(address(attacker), 10 ether);

        // attacker files as creator, bob accepts
        uint256 id = attacker.fileCase{value: STAKE}(bob, CLAIM, ACCEPT_WINDOW, RESOLVE_WINDOW);
        vm.prank(bob);
        escrow.acceptCase{value: STAKE}(id);

        attacker.arm(id);
        // resolve pays the attacker; its receive() attempts re-entry which must
        // revert inside the guarded call -> the whole low-level send fails ->
        // resolve reverts with TransferFailed (funds stay safe, no double-pay).
        vm.prank(resolver);
        vm.expectRevert(Escrow.TransferFailed.selector);
        escrow.resolve(id, address(attacker), PROOF);

        // case is untouched and funds remain escrowed
        assertEq(address(escrow).balance, STAKE * 2);
        assertEq(uint8(escrow.getCase(id).status), uint8(Escrow.Status.Active));
    }

    // ---- fuzz -------------------------------------------------------------

    function testFuzz_resolve_conservesFunds(uint96 stake, uint16 feeBps) public {
        stake = uint96(bound(stake, 1, 100 ether));
        feeBps = uint16(bound(feeBps, 0, escrow.MAX_FEE_BPS()));
        Escrow e = new Escrow(resolver, feeRecipient, feeBps);

        vm.deal(alice, stake);
        vm.deal(bob, stake);
        vm.prank(alice);
        uint256 id = e.createCase{value: stake}(CLAIM, bob, ACCEPT_WINDOW, RESOLVE_WINDOW);
        vm.prank(bob);
        e.acceptCase{value: stake}(id);

        uint256 pot = uint256(stake) * 2;
        vm.prank(resolver);
        e.resolve(id, alice, PROOF);

        // every wei accounted for: winner payout + fee == pot, contract drained
        uint256 fee = (pot * feeBps) / 10_000;
        assertEq(alice.balance, pot - fee);
        assertEq(feeRecipient.balance, fee);
        assertEq(address(e).balance, 0);
    }
}

/// @dev Malicious winner that tries to re-enter resolve() when paid.
contract ReentrantWinner {
    Escrow public immutable escrow;
    uint256 public targetId;
    bool public armed;

    constructor(Escrow escrow_) {
        escrow = escrow_;
    }

    function fileCase(address opponent, bytes32 claimHash, uint64 acceptWindow, uint64 resolveWindow)
        external
        payable
        returns (uint256)
    {
        return escrow.createCase{value: msg.value}(claimHash, opponent, acceptWindow, resolveWindow);
    }

    function arm(uint256 id) external {
        targetId = id;
        armed = true;
    }

    receive() external payable {
        if (armed) {
            armed = false; // only attempt once
            // re-entrancy attempt — guarded, must revert and bubble up as a failed send
            escrow.resolve(targetId, address(this), bytes32(0));
        }
    }
}
