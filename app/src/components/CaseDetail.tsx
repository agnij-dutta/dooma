"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import type { Case } from "@/lib/types";
import { AttestationPanel } from "./AttestationPanel";
import { OnChainPanel } from "./OnChainPanel";
import { Button, ButtonLink, Stamp, VoteBar } from "@/components/ui";

export function CaseDetail({ initial }: { initial: Case }) {
  const [c, setC] = useState<Case>(initial);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { address, isConnected } = useAccount();

  const isSummonedOpponent =
    isConnected &&
    !!c.opponentAddress &&
    address?.toLowerCase() === c.opponentAddress.toLowerCase();
  const showAcceptCta = c.status === "open" && c.onchainId !== undefined && isSummonedOpponent;

  async function castVote(side: "A" | "B") {
    const res = await fetch("/api/cases/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, side }),
    });
    if (res.ok) {
      const { votesA, votesB } = await res.json();
      setC((prev) => ({ ...prev, votesA, votesB }));
    }
  }

  async function dropGavel() {
    setBusy(true);
    try {
      const res = await fetch("/api/cases/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      if (res.ok) setC(await res.json());
    } finally {
      setBusy(false);
    }
  }

  function share() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* ---- The filing ---- */}
        <div className="surface-docket rounded-xl border border-ink-400 p-6 sm:p-7">
          <div className="mb-3 flex items-start justify-between gap-3">
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-bone-faint">
              Case · {c.id}
            </span>
            <Stamp kind={c.status} />
          </div>
          <h1 className="font-display text-3xl leading-tight text-bone sm:text-4xl">{c.title}</h1>
          <p className="mt-3 font-sans text-sm leading-relaxed text-bone-dim">{c.question}</p>

          <div className="my-5 gold-rule" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-verdict/25 bg-verdict/[0.04] p-4">
              <div className="mb-1.5 font-mono text-[0.66rem] uppercase tracking-widest text-verdict-bright">
                Petitioner · {c.partyA}
              </div>
              <p className="font-sans text-sm text-bone-dim">{c.evidenceA}</p>
            </div>
            <div className="rounded-lg border border-oxblood/25 bg-oxblood/[0.04] p-4">
              <div className="mb-1.5 font-mono text-[0.66rem] uppercase tracking-widest text-oxblood-bright">
                Respondent · {c.partyB}
              </div>
              <p className="font-sans text-sm text-bone-dim">{c.evidenceB}</p>
            </div>
          </div>
        </div>

        {/* ---- Accept CTA (only the summoned opponent, while open) ---- */}
        {showAcceptCta && (
          <div className="gold-frame surface-leather rounded-xl p-5 text-center">
            <p className="font-display text-xl text-bone">You&apos;ve been summoned to this case.</p>
            <p className="mt-1 font-sans text-sm text-bone-dim">
              Match <span className="font-mono text-gold-bright">{c.stake} OG</span> to enter the arena.
            </p>
            <ButtonLink href={`/challenge/${c.id}`} size="lg" className="mt-4">
              Accept &amp; match {c.stake} OG
            </ButtonLink>
          </div>
        )}

        {/* ---- Crowd takes a side ---- */}
        <div className="surface-docket rounded-xl border border-ink-400 p-6">
          <h2 className="mb-4 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-bone-dim">
            Who&apos;s right? <span className="text-bone-faint">— free, no wallet</span>
          </h2>
          <VoteBar a={c.votesA} b={c.votesB} labelA={c.partyA} labelB={c.partyB} />
          {c.status !== "decided" && (
            <div className="mt-5 flex gap-3">
              <Button
                variant="ghost"
                onClick={() => castVote("A")}
                className="flex-1 !border-verdict/40 !text-verdict-bright hover:!bg-verdict/10"
              >
                Side with {c.partyA}
              </Button>
              <Button
                variant="ghost"
                onClick={() => castVote("B")}
                className="flex-1 !border-oxblood/40 !text-oxblood-bright hover:!bg-oxblood/10"
              >
                Side with {c.partyB}
              </Button>
            </div>
          )}
        </div>

        {/* ---- Verdict / gavel ---- */}
        {c.status === "decided" && c.verdict ? (
          <div className="gavel-drop gold-frame relative overflow-hidden rounded-xl surface-leather p-7">
            <div className="absolute -right-3 top-4">
              <Stamp kind="decided">Settled</Stamp>
            </div>
            <p className="eyebrow mb-3">⚖ The Verdict</p>
            <p className="font-display text-3xl text-bone">
              <span className="text-verdict-bright">{c.winnerLabel}</span>{" "}
              <span className="italic text-bone-faint">defeats</span>{" "}
              <span className="text-oxblood-bright line-through decoration-oxblood/70">{c.loserLabel}</span>
            </p>
            <p className="mt-4 font-display text-lg italic text-bone-dim">&ldquo;{c.verdict.reasoning}&rdquo;</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.72rem] text-bone-faint">
              <span>Confidence {Math.round(c.verdict.confidence * 100)}%</span>
              <span className="text-ink-400">|</span>
              <span>Basis: {c.verdict.citation}</span>
            </div>
          </div>
        ) : (
          <Button onClick={dropGavel} disabled={busy} size="lg" variant="gold" className="w-full">
            {busy ? "Deliberating…" : "Drop the Gavel"}
          </Button>
        )}

        <button
          onClick={share}
          className="w-full rounded-sm border border-ink-400 py-2.5 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-bone-dim transition-colors hover:border-gold/40 hover:text-gold-bright"
        >
          {copied ? "Link copied ✓" : "Share this verdict"}
        </button>
      </div>

      {/* ---- Sidebar: the wax-sealed certificate ---- */}
      <div className="space-y-4">
        <OnChainPanel c={c} />
        <AttestationPanel provider={c.provider} />
        <div className="rounded-xl border border-ink-400 surface-docket p-4 font-mono text-[0.72rem] leading-relaxed text-bone-faint">
          <div className="mb-1 uppercase tracking-widest text-bone-dim">Verdict Card</div>
          The shareable card unfurls automatically when this page is posted —{" "}
          <span className="text-gold/70">/v/{c.id}/opengraph-image</span>.
        </div>
      </div>
    </div>
  );
}
