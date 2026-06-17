import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ============================================================================
   VERDICT — "NIGHT COURT" component kit
   Presentational primitives built on globals.css tokens + utilities.
   ========================================================================== */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---- Button ------------------------------------------------------------- */
type ButtonVariant = "gold" | "ghost" | "danger";
type CommonBtn = { variant?: ButtonVariant; size?: "sm" | "md" | "lg"; className?: string; children: ReactNode };
type ButtonProps = CommonBtn & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-sm font-sans font-semibold tracking-tight transition-all duration-[var(--t-fast)] ease-court focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none";
const btnSizes = { sm: "px-3 py-1.5 text-sm", md: "px-5 py-2.5 text-[0.95rem]", lg: "px-7 py-3.5 text-base" };
const btnVariants: Record<ButtonVariant, string> = {
  gold: "bg-gold text-ink shadow-gold hover:bg-gold-bright hover:-translate-y-px active:translate-y-0",
  ghost: "border border-gold/40 text-gold-bright hover:border-gold hover:bg-gold/10",
  danger: "border border-oxblood/50 text-oxblood-bright hover:bg-oxblood/15",
};

export function Button({ variant = "gold", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button className={cx(btnBase, btnSizes[size], btnVariants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "gold",
  size = "md",
  className,
  children,
  external,
}: CommonBtn & { href: string; external?: boolean }) {
  const cls = cx(btnBase, btnSizes[size], btnVariants[variant], className);
  if (external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/* ---- Stamp (rubber-stamp status label) ---------------------------------- */
const stampTone: Record<string, string> = {
  open: "stamp--bone",
  in_session: "stamp--gold",
  decided: "stamp--verdict",
  verified: "stamp--verdict",
  oxblood: "stamp--oxblood",
};
const stampLabel: Record<string, string> = {
  open: "Open",
  in_session: "In Session",
  decided: "Settled",
  verified: "Verified",
};
export function Stamp({ kind, children }: { kind: keyof typeof stampTone; children?: ReactNode }) {
  return <span className={cx("stamp text-[0.7rem]", stampTone[kind])}>{children ?? stampLabel[kind] ?? kind}</span>;
}

/* ---- Pill / Badge ------------------------------------------------------- */
export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-ink-400 bg-ink-700/70 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-bone-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---- SectionHeading (eyebrow + serif title) ----------------------------- */
export function SectionHeading({
  eyebrow,
  title,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-6", className)}>
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h2 className="font-display text-3xl text-bone sm:text-4xl">{title}</h2>
    </div>
  );
}

/* ---- StatPill ----------------------------------------------------------- */
export function StatPill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="surface-docket rounded-md border border-ink-400 px-4 py-3">
      <div className="font-display text-2xl text-gold-bright">{value}</div>
      <div className="font-mono text-[0.68rem] uppercase tracking-wider text-bone-faint">{label}</div>
    </div>
  );
}

/* ---- AddressMono -------------------------------------------------------- */
export function AddressMono({ value, className }: { value: string; className?: string }) {
  const short = value?.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
  return <span className={cx("font-mono text-bone-dim", className)} title={value}>{short}</span>;
}

/* ---- VoteBar (A vs B tug-of-war) ---------------------------------------- */
export function VoteBar({
  a,
  b,
  labelA,
  labelB,
}: {
  a: number;
  b: number;
  labelA: string;
  labelB: string;
}) {
  const total = Math.max(a + b, 1);
  const pctA = Math.round((a / total) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between font-mono text-[0.7rem] uppercase tracking-wider">
        <span className="text-verdict-bright">{labelA} · {pctA}%</span>
        <span className="text-oxblood-bright">{100 - pctA}% · {labelB}</span>
      </div>
      <div className="relative flex h-2.5 overflow-hidden rounded-full bg-ink-600">
        <div className="h-full bg-verdict/70 transition-all duration-[var(--t-slow)] ease-court" style={{ width: `${pctA}%` }} />
        <div className="h-full flex-1 bg-oxblood/60" />
        <div className="absolute inset-y-0 w-px bg-gold-bright/80" style={{ left: `${pctA}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[0.66rem] text-bone-faint">
        <span>{a.toLocaleString()} votes</span>
        <span>{b.toLocaleString()} votes</span>
      </div>
    </div>
  );
}

/* ---- DocketCard (case card = a stamped case file) ----------------------- */
export interface DocketCardCase {
  id: string;
  title: string;
  partyA: string;
  partyB: string;
  stake: string;
  status: "open" | "in_session" | "decided";
  votesA: number;
  votesB: number;
  winnerLabel?: string;
  loserLabel?: string;
}

export function DocketCard({ c }: { c: DocketCardCase }) {
  const decided = c.status === "decided";
  return (
    <Link
      href={`/v/${c.id}`}
      className="group relative block overflow-hidden rounded-lg border border-ink-400 surface-docket p-5 transition-all duration-[var(--t-normal)] ease-court hover:-translate-y-0.5 hover:border-gold/45 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-bone-faint">
          Case · {c.id.slice(0, 10)}
        </span>
        <Stamp kind={c.status} />
      </div>

      <h3 className="font-display text-xl leading-snug text-bone group-hover:text-gold-bright">{c.title}</h3>

      <div className="mt-3 flex items-center gap-2 font-sans text-sm">
        {decided ? (
          <>
            <span className="font-semibold text-verdict-bright">{c.winnerLabel}</span>
            <span className="text-bone-faint">defeats</span>
            <span className="text-oxblood-bright line-through decoration-oxblood/70">{c.loserLabel}</span>
          </>
        ) : (
          <>
            <span className="text-bone-dim">{c.partyA}</span>
            <span className="font-display italic text-bone-faint">v.</span>
            <span className="text-bone-dim">{c.partyB}</span>
          </>
        )}
      </div>

      <div className="my-4 gold-rule" />

      <VoteBar a={c.votesA} b={c.votesB} labelA={c.partyA} labelB={c.partyB} />

      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-bone-faint">
          Stake <span className="text-gold-bright">{c.stake} OG</span> / side
        </span>
        <span className="font-mono text-[0.7rem] text-gold/70 opacity-0 transition-opacity group-hover:opacity-100">
          Open file →
        </span>
      </div>
    </Link>
  );
}
