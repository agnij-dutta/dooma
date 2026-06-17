/**
 * VERDICT — wagmi v2 + viem hooks (REFERENCE SNIPPET, not wired into the app).
 * ---------------------------------------------------------------------------
 * Copy/adapt into the Next.js app (e.g. app/src/lib/escrowHooks.ts). It is
 * intentionally self-contained and copy-paste-ready.
 *
 * Imports assume the app's existing modules:
 *   - escrowAbi  from "@/lib/escrowAbi"   (verified to match the deployed contract)
 *   - chain 16602 lives in "@/lib/chain"  (ogGalileoTestnet)
 *
 * The deployed address is read from NEXT_PUBLIC_ESCROW_ADDRESS at build time.
 *
 * NOTE ON VOTING: the contract has NO on-chain vote function. Per SPEC §4 the
 * crowd "take-a-side" hot-take vote is off-chain/free. The only on-chain writes
 * are createCase / acceptCase / resolve / reclaimUnaccepted / timeoutRefund.
 * `resolve` is resolver-only and is normally called by the BACKEND signer, not
 * the browser — a useResolve hook is included only for an admin/dev panel.
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, type Address, type Hex } from "viem";

import { escrowAbi } from "@/lib/escrowAbi";
import { ogGalileoTestnet } from "@/lib/chain";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const ESCROW_ADDRESS = process.env
  .NEXT_PUBLIC_ESCROW_ADDRESS as Address | undefined;

const CHAIN_ID = ogGalileoTestnet.id; // 16602

/** Guard: every write must have an address configured. */
function requireAddress(): Address {
  if (!ESCROW_ADDRESS) {
    throw new Error("NEXT_PUBLIC_ESCROW_ADDRESS is not set — deploy Escrow first.");
  }
  return ESCROW_ADDRESS;
}

// Mirrors the on-chain enum Status.
export enum CaseStatus {
  None = 0,
  Open = 1,
  Active = 2,
  Resolved = 3,
  Refunded = 4,
}

// Shape returned by getCase() (the Case struct, as a viem-decoded object).
export type CaseView = {
  creator: Address;
  opponent: Address;
  stake: bigint;
  acceptDeadline: bigint;
  resolveDeadline: bigint;
  status: CaseStatus;
  claimHash: Hex;
  proofRoot: Hex;
  winner: Address;
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * useCreateCase — Party A files a case and stakes `msg.value`.
 * createCase(bytes32 claimHash, address opponent, uint64 acceptWindow, uint64 resolveWindow) payable
 *
 * Windows are in SECONDS. acceptWindow = time for B to accept; resolveWindow =
 * time AFTER acceptance for the resolver to rule.
 */
export function useCreateCase() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  async function createCase(args: {
    claimHash: Hex; // keccak256 of question + ruling criterion
    opponent: Address;
    stakeOg: string; // e.g. "0.1" (OG) — converted to wei here
    acceptWindowSecs: bigint; // e.g. 86400n (1 day)
    resolveWindowSecs: bigint; // e.g. 172800n (2 days)
  }) {
    return writeContractAsync({
      address: requireAddress(),
      abi: escrowAbi,
      functionName: "createCase",
      chainId: CHAIN_ID,
      args: [args.claimHash, args.opponent, args.acceptWindowSecs, args.resolveWindowSecs],
      value: parseEther(args.stakeOg),
    });
  }

  return { createCase, hash, isPending, error, receipt };
}

/**
 * useAcceptCase — Party B accepts and matches the stake EXACTLY.
 * acceptCase(uint256 id) payable
 *
 * `stakeOg` must equal the creator's stake or the tx reverts (StakeMismatch).
 * Read it first via useCase(id).stake.
 */
export function useAcceptCase() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  async function acceptCase(id: bigint, stakeWei: bigint) {
    return writeContractAsync({
      address: requireAddress(),
      abi: escrowAbi,
      functionName: "acceptCase",
      chainId: CHAIN_ID,
      args: [id],
      value: stakeWei, // pass the exact stake read from getCase(id).stake
    });
  }

  return { acceptCase, hash, isPending, error, receipt };
}

/**
 * useResolve — resolver-ONLY. Writes the verdict and pays the winner.
 * resolve(uint256 id, address winner, bytes32 proofRoot)
 *
 * In production this is called by the BACKEND signer (the constructor
 * `resolver`), not the browser. Exposed here only for an admin/dev panel; a
 * normal user wallet calling this reverts with NotResolver.
 */
export function useResolve() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  async function resolve(id: bigint, winner: Address, proofRoot: Hex) {
    return writeContractAsync({
      address: requireAddress(),
      abi: escrowAbi,
      functionName: "resolve",
      chainId: CHAIN_ID,
      args: [id, winner, proofRoot],
    });
  }

  return { resolve, hash, isPending, error, receipt };
}

/**
 * useReclaimUnaccepted — creator reclaims stake if B never accepted in time.
 * reclaimUnaccepted(uint256 id)
 */
export function useReclaimUnaccepted() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  async function reclaim(id: bigint) {
    return writeContractAsync({
      address: requireAddress(),
      abi: escrowAbi,
      functionName: "reclaimUnaccepted",
      chainId: CHAIN_ID,
      args: [id],
    });
  }

  return { reclaim, hash, isPending, error, receipt };
}

/**
 * useTimeoutRefund — either party forces a refund if the resolver missed the
 * deadline. Both parties get their stake back.
 * timeoutRefund(uint256 id)
 */
export function useTimeoutRefund() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  async function timeoutRefund(id: bigint) {
    return writeContractAsync({
      address: requireAddress(),
      abi: escrowAbi,
      functionName: "timeoutRefund",
      chainId: CHAIN_ID,
      args: [id],
    });
  }

  return { timeoutRefund, hash, isPending, error, receipt };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * useCase — read a single case's full struct.
 * getCase(uint256 id) view returns (Case)
 */
export function useCase(id: bigint | undefined) {
  return useReadContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "getCase",
    chainId: CHAIN_ID,
    args: id === undefined ? undefined : [id],
    query: { enabled: Boolean(ESCROW_ADDRESS) && id !== undefined },
  }) as ReturnType<typeof useReadContract> & { data: CaseView | undefined };
}

/**
 * usePot — current escrowed pot for a case (stake while Open, 2*stake while
 * Active, 0 otherwise).
 * pot(uint256 id) view returns (uint256)
 */
export function usePot(id: bigint | undefined) {
  return useReadContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "pot",
    chainId: CHAIN_ID,
    args: id === undefined ? undefined : [id],
    query: { enabled: Boolean(ESCROW_ADDRESS) && id !== undefined },
  });
}

/**
 * useNextCaseId — total cases created so far (also the id of the next case).
 * Useful for paginating the Arena feed backwards from (nextCaseId - 1).
 * nextCaseId() view returns (uint256)
 */
export function useNextCaseId() {
  return useReadContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "nextCaseId",
    chainId: CHAIN_ID,
    query: { enabled: Boolean(ESCROW_ADDRESS) },
  });
}

/** useResolverAddress — the immutable resolver the contract trusts. */
export function useResolverAddress() {
  return useReadContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "resolver",
    chainId: CHAIN_ID,
    query: { enabled: Boolean(ESCROW_ADDRESS) },
  });
}
