"use client";

import Link from "next/link";
import type { Case } from "@/lib/types";

const STATUS_LABEL: Record<Case["status"], string> = {
  open: "OPEN · take a side",
  in_session: "IN SESSION · gavel pending",
  decided: "DECIDED",
};

const STATUS_STYLE: Record<Case["status"], string> = {
  open: "bg-blue-500/15 text-blue-300",
  in_session: "bg-gavel/15 text-gavel",
  decided: "bg-verdict/15 text-verdict",
};

export function CaseCard({ c }: { c: Case }) {
  const total = c.votesA + c.votesB || 1;
  const pctA = Math.round((c.votesA / total) * 100);

  return (
    <Link
      href={`/v/${c.id}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 transition hover:border-gavel/50"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`}>
          {STATUS_LABEL[c.status]}
        </span>
        <span className="text-xs text-zinc-500">{c.stake} OG / side</span>
      </div>

      <h3 className="mb-1 text-lg font-semibold text-zinc-100">{c.title}</h3>

      {c.status === "decided" && c.verdict ? (
        <p className="mb-3 text-sm text-zinc-400">
          <span className="font-semibold text-verdict">{c.winnerLabel}</span> defeats{" "}
          <span className="text-zinc-500 line-through">{c.loserLabel}</span>
        </p>
      ) : (
        <p className="mb-3 text-sm text-zinc-400">
          {c.partyA} <span className="text-zinc-600">vs</span> {c.partyB}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-loser/40">
          <div className="h-full bg-blue-400" style={{ width: `${pctA}%` }} />
        </div>
        <span>
          {pctA}% / {100 - pctA}%
        </span>
      </div>
    </Link>
  );
}
