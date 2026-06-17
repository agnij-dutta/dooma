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
 * CHEAP REAL RULER — any OpenAI-compatible LLM via an API key.
 *
 * The verified 0G Compute path needs a funded ledger (3 OG, contract-enforced,
 * refundable). To get REAL, intelligent verdicts WITHOUT that — for ~cents, or
 * free on Groq/OpenRouter free tiers — set in .env.local:
 *   LLM_API_KEY=...            (required to enable this path)
 *   LLM_BASE_URL=https://api.openai.com/v1   (or groq / openrouter / local)
 *   LLM_MODEL=gpt-4o-mini      (any chat model the endpoint serves)
 *
 * HONESTY: this is the demo ruling path. It is NOT the 0G verified-inference
 * network — so it carries no TEE attestation over its output. The live
 * AttestationPanel separately proves the 0G serving stack is real; it does not
 * claim to cover a verdict produced here. Never imply otherwise (SPEC §3).
 * Any failure (network / bad JSON) falls back to the offline mock so the demo
 * never breaks.
 */
export class LLMRuler implements Ruler {
  async rule(input: CaseInput): Promise<VerdictResult> {
    try {
      // Plain fetch to the OpenAI-compatible /chat/completions endpoint — no SDK
      // dependency, works with OpenAI / Groq / OpenRouter / local servers alike.
      const baseURL = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
      const res = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: buildPrompt(input) }],
          temperature: 0,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) throw new Error(`LLM ${res.status}`);
      const data = await res.json();
      const raw: string = data?.choices?.[0]?.message?.content ?? "";
      const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const p = JSON.parse(json) as Partial<VerdictResult>;
      if (!p.reasoning) throw new Error("no reasoning in model output");
      const winner: "A" | "B" = p.winner === "B" ? "B" : "A";
      const confidence = Math.max(0, Math.min(1, Number(p.confidence) || 0.5));
      return {
        winner,
        confidence: Number(confidence.toFixed(2)),
        reasoning: String(p.reasoning),
        citation: String(p.citation ?? "—"),
      };
    } catch {
      // never break the demo — fall back to the deterministic offline ruling
      return new MockRuler().rule(input);
    }
  }
}

/**
 * The REAL 0G Compute (verified-inference) ruler — gated on a funded ledger
 * (3 OG, contract-enforced). Call shapes confirmed by the spike:
 *   const broker = await createZGComputeNetworkBroker(wallet);
 *   await broker.inference.acknowledgeProviderSigner(provider);
 *   const meta = await broker.inference.getServiceMetadata(provider);
 *   const headers = await broker.inference.getRequestHeaders(provider, prompt);
 *   const openai = new OpenAI({ baseURL: meta.endpoint, apiKey: "", defaultHeaders: headers });
 *   const completion = await openai.chat.completions.create({ model: meta.model, messages, temperature: 0 });
 *   await broker.inference.processResponse(provider, answer, completion.id);
 * Drops in behind this same interface once the ledger is funded.
 */

/**
 * Picks the best available ruler — NO funded 0G ledger required to demo:
 *   1. LLM_API_KEY set  → real, cheap LLM verdicts (demo ruling).
 *   2. otherwise        → deterministic offline mock (zero config, free).
 * The verified 0G Compute path slots in at tier 0 once a ledger is funded.
 */
export function getRuler(): Ruler {
  if (process.env.LLM_API_KEY) return new LLMRuler();
  return new MockRuler();
}
