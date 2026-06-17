"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ============================================================================
   ACT II — THE RECORD (the live docket tape)
   Court records scrolling past: decided verdicts (winner vs struck loser),
   open cases (live countdown), and in-deliberation cases. Monospace, edge
   fades, pause-on-hover.
   ========================================================================== */

export interface TapeCase {
  id: string;
  no: number;
  title: string;
  status: "open" | "in_session" | "decided";
  winnerLabel?: string;
  loserLabel?: string;
  partyA: string;
  partyB: string;
  stake: string;
  votes: number;
  /** ms-from-now the gavel drops, for open/in-session countdowns */
  gavelInMs?: number;
}

function fmt(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function Chip({ c, now }: { c: TapeCase; now: number }) {
  const base =
    "tape-chip flex min-w-[20rem] flex-col justify-center gap-1.5 px-7 py-3 font-mono text-[0.78rem] transition-colors hover:bg-ink-700/50";

  if (c.status === "decided") {
    return (
      <Link href={`/v/${c.id}`} className={`${base} group`}>
        <span className="flex items-center gap-2 text-bone">
          <span className="text-gold/70">⚖</span>
          <span className="text-bone-faint">No.{String(c.no).padStart(3, "0")}</span>
          <span className="truncate italic text-bone-dim group-hover:text-gold-bright">
            &ldquo;{c.title}&rdquo;
          </span>
        </span>
        <span className="flex items-center gap-2 text-[0.72rem]">
          <span className="text-bone-faint">WINNER:</span>
          <span className="font-semibold text-verdict-bright">@{c.winnerLabel}</span>
          <span className="text-bone-faint">·</span>
          <span className="text-oxblood-bright line-through decoration-oxblood/70">
            @{c.loserLabel}
          </span>
          <span className="text-bone-faint">·</span>
          <span className="text-gold/80">{c.stake} OG</span>
          <span className="text-bone-faint">·</span>
          <span className="text-verdict-bright">✓ TEE</span>
        </span>
      </Link>
    );
  }

  if (c.status === "in_session") {
    return (
      <Link href={`/v/${c.id}`} className={`${base} group`}>
        <span className="flex items-center gap-2 text-bone">
          <span className="text-gold-bright">◷</span>
          <span className="text-bone-faint">No.{String(c.no).padStart(3, "0")}</span>
          <span className="truncate italic text-bone-dim group-hover:text-gold-bright">
            &ldquo;{c.title}&rdquo;
          </span>
        </span>
        <span className="flex items-center gap-2 text-[0.72rem] text-bone-faint">
          <span className="text-gold-bright">DELIBERATING…</span>
          <span>the judge is reading the record.</span>
        </span>
      </Link>
    );
  }

  // open — taking sides, live countdown
  const remain = c.gavelInMs != null ? c.gavelInMs - (now % (c.gavelInMs + 1)) : 0;
  return (
    <Link href={`/v/${c.id}`} className={`${base} group`}>
      <span className="flex items-center gap-2 text-bone">
        <span className="live-dot text-oxblood-bright" aria-hidden />
        <span className="text-bone-faint">No.{String(c.no).padStart(3, "0")}</span>
        <span className="truncate italic text-bone-dim group-hover:text-gold-bright">
          &ldquo;{c.title}&rdquo;
        </span>
      </span>
      <span className="flex items-center gap-2 text-[0.72rem] text-bone-faint">
        <span className="text-gold-bright">IN SESSION</span>
        <span>· gavel in {fmt(remain)} ·</span>
        <span className="text-bone-dim">{c.votes} took a side</span>
        <span className="text-gold/70 group-hover:text-gold-bright">· take yours →</span>
      </span>
    </Link>
  );
}

export function DocketTape({ cases }: { cases: TapeCase[] }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const start = Date.now();
    setNow(0);
    const id = setInterval(() => setNow(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, []);

  if (cases.length === 0) return null;
  // duplicate the run for a seamless -50% scroll
  const run = [...cases, ...cases];

  return (
    <div className="surface-docket border-y border-ink-400">
      {/* labeled rail */}
      <div className="flex items-center gap-3 border-b border-ink-400/60 px-5 py-2">
        <span className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.24em] text-oxblood-bright">
          <span className="live-dot" aria-hidden />
          The Record — Live
        </span>
        <span className="hidden font-mono text-[0.66rem] uppercase tracking-[0.18em] text-bone-faint sm:inline">
          · every case, every ruling, on the public record
        </span>
      </div>

      <div className="tape" aria-label="Live docket tape">
        <div className="tape-track">
          {run.map((c, i) => (
            <Chip key={`${c.id}-${i}`} c={c} now={now} />
          ))}
        </div>
      </div>
    </div>
  );
}
