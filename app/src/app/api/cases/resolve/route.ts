import { NextResponse } from "next/server";
import { getCase, updateCase } from "@/lib/store";
import { getRuler, buildPrompt } from "@/lib/ruling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * "Drop the gavel" — runs the (currently MOCK) ruler and writes the verdict to
 * the case store. In production this also: assembles the deterministic prompt
 * from committed inputs, calls 0G Compute, captures verifyService attestation,
 * bundles the proof to 0G Storage, then calls Escrow.resolve() on-chain. Those
 * steps are gated on a funded ledger + a deployed contract (see README).
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

  const updated = updateCase(c.id, {
    status: "decided",
    verdict,
    winnerLabel,
    loserLabel,
  });
  return NextResponse.json(updated);
}
