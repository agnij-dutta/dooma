import { NextResponse } from "next/server";
import { getCase, updateCase } from "@/lib/store";
import { getRuler, buildPrompt } from "@/lib/ruling";
import { resolveOnChain } from "@/lib/resolveOnChain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * "Drop the gavel" — runs the ruler, writes the verdict to the store, and (when
 * the case is bound to a live Escrow case) settles ON-CHAIN via the resolver
 * signer: maps winner A|B -> creator|opponent address, commits a proofRoot
 * (keccak256 of the verdict JSON), and calls Escrow.resolve().
 *
 * GRACEFUL FALLBACK: if the case has no onchainId, or NEXT_PUBLIC_ESCROW_ADDRESS
 * / RESOLVER_PRIVATE_KEY are unset, the on-chain step is skipped and only the
 * store is updated — the demo never hard-breaks.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "need {id}" }, { status: 400 });

  const c = getCase(body.id);
  if (!c) return NextResponse.json({ error: "case not found" }, { status: 404 });
  if (c.status === "decided") return NextResponse.json(c);

  const input = {
    question: c.question,
    partyA: c.partyA,
    partyB: c.partyB,
    evidenceA: c.evidenceA,
    evidenceB: c.evidenceB,
  };
  // Prompt assembled deterministically (skeptic-reproducible) — even for the mock.
  void buildPrompt(input);

  const verdict = await getRuler().rule(input);
  const winnerLabel = verdict.winner === "A" ? c.partyA : c.partyB;
  const loserLabel = verdict.winner === "A" ? c.partyB : c.partyA;

  // --- on-chain settlement (best-effort; never blocks the demo) ---
  let txResolve: string | undefined;
  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  const canSettle =
    c.onchainId !== undefined &&
    !!escrowAddress &&
    !!process.env.RESOLVER_PRIVATE_KEY &&
    !!c.creatorAddress &&
    !!c.opponentAddress;

  if (canSettle) {
    const winnerAddress = verdict.winner === "A" ? c.creatorAddress! : c.opponentAddress!;
    try {
      txResolve = await resolveOnChain({
        onchainId: c.onchainId!,
        winnerAddress,
        verdict,
      });
    } catch (err) {
      // Log but don't fail the request — the verdict still lands in the store.
      console.error("[resolve] on-chain settlement failed:", err);
    }
  }

  const updated = updateCase(c.id, {
    status: "decided",
    verdict,
    winnerLabel,
    loserLabel,
    ...(txResolve ? { txResolve } : {}),
  });
  return NextResponse.json(updated);
}
