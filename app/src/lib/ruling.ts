import type { VerdictResult } from "./types";

/**
 * The AI ruling interface. The MVP ships a MOCK implementation.
 *
 * WHY MOCKED: billed 0G Compute inference needs a funded ledger (min 3 OG;
 * faucet drips 0.1/day) — we're blocked on that (see SPIKE_FINDINGS.md). The
 * TEE *attestation* path (verifyService / getSignerRaDownloadLink) needs NO
 * funds and is wired live — that's the keystone. The ruling itself drops in
 * behind this same interface the moment the ledger is funded.
 *
 * HONESTY: even when live, the attestation proves a "verified TEE serving
 * stack + request integrity" — NOT "provably the model said it". Copy must
 * never overclaim. See SPEC §3 NEVER-SAY list.
 */
export interface CaseInput {
  question: string;
  partyA: string;
  partyB: string;
  evidenceA: string;
  evidenceB: string;
}

export interface Ruler {
  rule(input: CaseInput): Promise<VerdictResult>;
}

/**
 * Builds the FIXED, adversarially-symmetric prompt from committed inputs.
 * Deterministic: skeptics can reproduce prompt == template(inputs). Exported
 * so the real 0G path reuses the exact same prompt assembly.
 */
export function buildPrompt(input: CaseInput): string {
  return [
    "You are VERDICT, an impartial adjudicator. Weigh both parties' evidence",
    "equally. You must cite the specific fact or principle your ruling rests on.",
    "Reply with STRICT JSON only:",
    '{"winner":"A|B","confidence":0..1,"reasoning":"one sentence","citation":"short basis"}',
    "",
    `QUESTION / RULING CRITERION: ${input.question}`,
    "",
    `PARTY A (${input.partyA}) EVIDENCE: ${input.evidenceA}`,
    `PARTY B (${input.partyB}) EVIDENCE: ${input.evidenceB}`,
    "",
    "If neither side clearly prevails, lower confidence below 0.5.",
  ].join("\n");
}

/** Deterministic, offline mock ruling — good enough to exercise the full UI. */
export class MockRuler implements Ruler {
  async rule(input: CaseInput): Promise<VerdictResult> {
    // Trivial heuristic: longer, more specific evidence "wins". Deterministic.
    const score = (s: string) => s.length + (s.match(/\d/g)?.length ?? 0) * 5;
    const a = score(input.evidenceA);
    const b = score(input.evidenceB);
    const winner = a >= b ? "A" : "B";
    const margin = Math.abs(a - b) / Math.max(a, b, 1);
    const confidence = Math.min(0.95, 0.5 + margin / 2);
    const winnerName = winner === "A" ? input.partyA : input.partyB;
    return {
      winner,
      confidence: Number(confidence.toFixed(2)),
      reasoning: `${winnerName}'s evidence is more specific and better grounded in the ruling criterion, so the dispute resolves in their favor. (MOCK ruling — real 0G Compute inference drops in once the ledger is funded.)`,
      citation: "Stubbed ruling; pending funded 0G Compute ledger.",
    };
  }
}

/**
 * The REAL 0G Compute ruler — IMPLEMENTATION SKETCH, gated on a funded ledger.
 * Uncomment + wire once wallet >= 3 OG. Call shapes confirmed by the spike.
 *
 *   import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";
 *   import { ethers } from "ethers";
 *   import OpenAI from "openai";
 *
 *   const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
 *   const broker = await createZGComputeNetworkBroker(wallet);
 *   await broker.inference.acknowledgeProviderSigner(provider);
 *   const meta = await broker.inference.getServiceMetadata(provider);   // {endpoint, model}
 *   const headers = await broker.inference.getRequestHeaders(provider, prompt);
 *   const openai = new OpenAI({ baseURL: meta.endpoint, apiKey: "", defaultHeaders: headers });
 *   const completion = await openai.chat.completions.create({ model: meta.model, messages: [...], temperature: 0 });
 *   await broker.inference.processResponse(provider, answer, completion.id); // signature check
 *
 * For now we always return the mock.
 */
export function getRuler(): Ruler {
  return new MockRuler();
}
