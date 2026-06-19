import { JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes, parseUnits } from "ethers";
import { escrowAbi } from "@/lib/escrowAbi";
import type { VerdictResult } from "@/lib/types";

/**
 * Server-side Escrow.resolve() via the trusted resolver signer (ethers v6).
 * Called only from the nodejs resolve route. Maps a VERDICT verdict onto the
 * on-chain payout: the winner address gets the pot (minus fee), and a proofRoot
 * commits the verdict bundle.
 *
 * 0G testnet enforces a minimum ~2 gwei priority fee — we set explicit
 * maxPriorityFeePerGas (3 gwei) and maxFeePerGas (5 gwei) overrides or the tx
 * is rejected by the sequencer.
 */
export async function resolveOnChain(args: {
  onchainId: number;
  winnerAddress: string;
  verdict: VerdictResult;
}): Promise<string> {
  const rpcUrl =
    process.env.OG_RPC_URL ?? process.env.NEXT_PUBLIC_OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  const pk = process.env.RESOLVER_PRIVATE_KEY;
  if (!escrowAddress) throw new Error("NEXT_PUBLIC_ESCROW_ADDRESS unset");
  if (!pk) throw new Error("RESOLVER_PRIVATE_KEY unset");

  const provider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
  const wallet = new Wallet(pk, provider);
  const escrow = new Contract(escrowAddress, escrowAbi as unknown as [], wallet);

  // proofRoot commits the verdict JSON (deterministic; reproducible by skeptics).
  const proofRoot = keccak256(toUtf8Bytes(JSON.stringify(args.verdict)));

  // 0G testnet min priority fee guard — explicit EIP-1559 overrides.
  const tx = await escrow.resolve(BigInt(args.onchainId), args.winnerAddress, proofRoot, {
    maxPriorityFeePerGas: parseUnits("3", "gwei"),
    maxFeePerGas: parseUnits("5", "gwei"),
  });
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}
