"use client";

/**
 * DOOMA — live Escrow client hooks (wagmi v2 + viem).
 * ---------------------------------------------------------------------------
 * Wires the deployed Escrow (NEXT_PUBLIC_ESCROW_ADDRESS) on 0G Galileo
 * testnet (chain 16602). The off-chain JSON store holds content + votes; this
 * file is the on-chain money path: createCase / acceptCase + a getCase read.
 *
 * resolve() is resolver-only and runs SERVER-SIDE (api/cases/resolve) — never
 * from the browser — so there is intentionally no useResolve here.
 */

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { parseEther, keccak256, toBytes, type Address, type Hex } from "viem";

import { escrowAbi } from "@/lib/escrowAbi";
import { ogGalileoTestnet } from "@/lib/chain";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const ESCROW_ADDRESS = process.env
  .NEXT_PUBLIC_ESCROW_ADDRESS as Address | undefined;

export const OG_CHAIN_ID = ogGalileoTestnet.id; // 16602

/** Sane defaults (seconds): B has 7 days to accept; resolver has 2 days to rule. */
export const ACCEPT_WINDOW_SECS = 7n * 24n * 60n * 60n; // 604800
export const RESOLVE_WINDOW_SECS = 2n * 24n * 60n * 60n; // 172800

/** True only when an escrow address is configured at build time. */
export const escrowConfigured = Boolean(ESCROW_ADDRESS);

// Mirrors the on-chain enum Status.
export enum CaseStatus {
  None = 0,
  Open = 1,
  Active = 2,
  Resolved = 3,
  Refunded = 4,
}

// Shape returned by getCase() (the Case struct, viem-decoded).
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

/**
 * computeClaimHash — DETERMINISTIC commitment of the dispute inputs.
 * keccak256(question | criterion | evidenceA | evidenceB).
 *
 * Shared by the browser (createCase) and the server (resolve) so the on-chain
 * claimHash is reproducible by any skeptic from the committed inputs. The
 * "criterion" lives inside `question` in this app's data model, so we pass the
 * same four fields the ruler sees.
 */
export function computeClaimHash(input: {
  question: string;
  evidenceA: string;
  evidenceB: string;
  criterion?: string;
}): Hex {
  const criterion = input.criterion ?? "";
  const preimage = `${input.question}|${criterion}|${input.evidenceA}|${input.evidenceB}`;
  return keccak256(toBytes(preimage));
}

function requireAddress(): Address {
  if (!ESCROW_ADDRESS) {
    throw new Error("NEXT_PUBLIC_ESCROW_ADDRESS is not set — the contract is unconfigured.");
  }
  return ESCROW_ADDRESS;
}

// ---------------------------------------------------------------------------
// Chain guard
// ---------------------------------------------------------------------------

/**
 * useEnsureChain — returns helpers to confirm/switch the wallet onto 16602.
 * Call `await ensureChain()` before any write; it prompts a switch if needed
 * and throws if the user rejects.
 */
export function useEnsureChain() {
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const wrongChain = chainId !== OG_CHAIN_ID;

  async function ensureChain() {
    if (chainId === OG_CHAIN_ID) return;
    await switchChainAsync({ chainId: OG_CHAIN_ID });
  }

  return { chainId, wrongChain, ensureChain };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * useCreateCase — Party A files a case and stakes `value`.
 * createCase(bytes32 claimHash, address opponent, uint64 acceptWindow, uint64 resolveWindow) payable
 */
export function useCreateCase() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { ensureChain } = useEnsureChain();
  const receipt = useWaitForTransactionReceipt({ hash });

  async function createCase(args: {
    claimHash: Hex;
    opponent: Address;
    stakeOg: string; // e.g. "0.5" OG
    acceptWindowSecs?: bigint;
    resolveWindowSecs?: bigint;
  }): Promise<Hex> {
    await ensureChain();
    return writeContractAsync({
      address: requireAddress(),
      abi: escrowAbi,
      functionName: "createCase",
      chainId: OG_CHAIN_ID,
      args: [
        args.claimHash,
        args.opponent,
        args.acceptWindowSecs ?? ACCEPT_WINDOW_SECS,
        args.resolveWindowSecs ?? RESOLVE_WINDOW_SECS,
      ],
      value: parseEther(args.stakeOg),
    });
  }

  return { createCase, hash, isPending, error, receipt, reset };
}

/**
 * useAcceptCase — Party B accepts and matches the stake EXACTLY.
 * acceptCase(uint256 id) payable
 */
export function useAcceptCase() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { ensureChain } = useEnsureChain();
  const receipt = useWaitForTransactionReceipt({ hash });

  async function acceptCase(args: { onchainId: number; stakeOg: string }): Promise<Hex> {
    await ensureChain();
    return writeContractAsync({
      address: requireAddress(),
      abi: escrowAbi,
      functionName: "acceptCase",
      chainId: OG_CHAIN_ID,
      args: [BigInt(args.onchainId)],
      value: parseEther(args.stakeOg),
    });
  }

  return { acceptCase, hash, isPending, error, receipt, reset };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * useEscrowCase — read a single case's full on-chain struct.
 * getCase(uint256 id) view returns (Case)
 */
export function useEscrowCase(onchainId: number | undefined) {
  const enabled = escrowConfigured && onchainId !== undefined;
  const res = useReadContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "getCase",
    chainId: OG_CHAIN_ID,
    args: onchainId === undefined ? undefined : [BigInt(onchainId)],
    query: { enabled },
  });
  return res as typeof res & { data: CaseView | undefined };
}
