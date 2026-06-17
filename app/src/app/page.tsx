import Link from "next/link";
import { listCases } from "@/lib/store";
import { ButtonLink, Pill } from "@/components/ui";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { DocketTape, type TapeCase } from "@/components/DocketTape";

export const dynamic = "force-dynamic";

/* ----------------------------------------------------------------------------
   THE RECORD — build the live tape from real cases, then salt with a couple of
   brand-spec sample rulings so the docket reads full and funny (Roast Court +
   a serious flagship), per BRAND §5.2. Real cases always link out.
   -------------------------------------------------------------------------- */
const SAMPLE_TAPE: TapeCase[] = [
  {
    id: "hotdog",
    no: 47,
    title: "Is a hot dog a sandwich?",
    status: "decided",
    winnerLabel: "maya",
    loserLabel: "dev",
    partyA: "maya",
    partyB: "dev",
    stake: "0.8",
    votes: 353,
  },
  {
    id: "open-freelance",
    no: 52,
    title: "Did he fumble the bag?",
    status: "open",
    partyA: "Freelancer",
    partyB: "Client",
    stake: "0.25",
    votes: 318,
    gavelInMs: 2 * 3600_000 + 14 * 60_000 + 9_000,
  },
  {
    id: "earth-sun",
    no: 51,
    title: "Who owes who the 50?",
    status: "in_session",
    partyA: "Ada",
    partyB: "Boris",
    stake: "1.0",
    votes: 120,
  },
];

function toTape(): TapeCase[] {
  const real = listCases();
  const chips: TapeCase[] = real.map((c, i) => ({
    id: c.id,
    no: 60 + i,
    title: c.title,
    status: c.status,
    winnerLabel: c.winnerLabel,
    loserLabel: c.loserLabel,
    partyA: c.partyA,
    partyB: c.partyB,
    stake: c.stake,
    votes: c.votesA + c.votesB,
    gavelInMs: c.status !== "decided" ? 5 * 3600_000 : undefined,
  }));
  // interleave: sample flavor first so it reads "full", then the real docket
  return [...SAMPLE_TAPE, ...chips];
}

/* ---- small presentational helpers (page-local) --------------------------- */
function ActHeader({
  act,
  eyebrow,
  title,
  body,
  center,
}: {
  act: string;
  eyebrow: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className={center ? "flex justify-center" : ""}>
        <span className="act-label">
          <span className="act-numeral text-lg not-italic">{act}</span>
          {eyebrow}
        </span>
      </div>
      <h2 className="mt-4 font-display text-[2.4rem] leading-tight text-bone sm:text-5xl">{title}</h2>
      {body && (
        <p className={`mt-4 font-sans text-bone-dim ${center ? "mx-auto max-w-xl" : "max-w-xl"}`}>
          {body}
        </p>
      )}
    </div>
  );
}

function ActDivider() {
  return (
    <div className="act-divider mx-auto max-w-5xl px-5 py-2">
      <span className="act-divider__mark" aria-hidden>
        ⚖
      </span>
    </div>
  );
}

const PROCEEDING = [
  {
    n: "01",
    t: "File the case",
    d: "Write the question and the exact rule for winning. Lock your stake. Send your opponent a challenge link — they match it or they forfeit.",
  },
  {
    n: "02",
    t: "Enter the evidence",
    d: "Both sides submit statements and links, committed on-chain before the judge ever reads a word. No stuffing the record after the fact.",
  },
  {
    n: "03",
    t: "The gavel drops",
    d: "The AI judge rules inside a verified enclave, weighs both sides against the rule, and names a winner with cited reasoning.",
  },
  {
    n: "04",
    t: "The pot pays",
    d: "Escrow releases to the winner automatically. The verdict mints a sealed card. The gallery's correct callers climb the leaderboard.",
  },
];

export default function Landing() {
  const tape = toTape();

  return (
    <>
      <SiteHeader />

      {/* ===================== ACT I — THE SUMMONS ===================== */}
      <Hero />

      {/* ===================== ACT II — THE RECORD ===================== */}
      <section id="record" className="scroll-mt-20">
        <DocketTape cases={tape} />
      </section>

      {/* ===================== ACT III — THE PROCEEDING ===================== */}
      <section id="proceeding" className="scroll-mt-20 px-5 py-24">
        <div className="mx-auto max-w-5xl">
          <ActHeader
            act="Act III"
            eyebrow="The Proceeding · How a case is settled"
            title="Four steps from beef to verdict."
            body="No lawyers. No waiting room. No one to bribe."
          />

          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-ink-400 bg-ink-400 sm:grid-cols-2 lg:grid-cols-4">
            {PROCEEDING.map((s) => (
              <div key={s.n} className="surface-docket flex flex-col p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-display text-5xl italic text-gold/45">{s.n}</span>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-bone-faint">
                    Exhibit {s.n}
                  </span>
                </div>
                <h3 className="font-display text-2xl text-bone">{s.t}</h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-bone-dim">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ActDivider />

      {/* ===================== ACT IV — AUDIT THE COURT ===================== */}
      <section id="audit" className="scroll-mt-20 px-5 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="gold-frame relative overflow-hidden rounded-xl surface-leather p-8 sm:p-12">
            <ActHeader
              act="Act IV"
              eyebrow="The Proof · Don't trust us"
              title={
                <>
                  Audit the <span className="italic text-gold-bright">court.</span>
                </>
              }
              body="The loser always says it was rigged. Here, they can't — and you don't have to take our word for it."
            />

            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[auto,1fr]">
              {/* the wax seal */}
              <div className="flex shrink-0 flex-col items-center gap-3">
                <div className="seal seal--verified !h-32 !w-32">
                  <div className="text-center leading-tight">
                    <div className="font-display text-3xl">⚖</div>
                    <div className="font-mono text-[0.55rem] uppercase tracking-widest">Verified</div>
                    <div className="font-mono text-[0.55rem] uppercase tracking-widest">by TEE</div>
                  </div>
                </div>
                <Pill className="!border-verdict/40 !text-verdict-bright">dstack · Intel TDX</Pill>
              </div>

              {/* the three proof points */}
              <ul className="space-y-5">
                {[
                  {
                    t: "A judge in a sealed room.",
                    d: (
                      <>
                        Every verdict is served inside a cryptographically attested hardware enclave
                        (Intel TDX). We can&apos;t quietly swap in a machine that rules our way — and the
                        attestation report is public. Pull it. Check it against the open-source
                        verifier. Out of band. Right now.
                      </>
                    ),
                  },
                  {
                    t: "Inputs locked before the ruling.",
                    d: (
                      <>
                        The question, the rule, and both sides&apos; evidence are committed on-chain
                        <em className="text-bone"> before</em> the judge sees them. The prompt is
                        assembled by a published template — not by us, not by either party.
                      </>
                    ),
                  },
                  {
                    t: "What we prove, exactly.",
                    d: (
                      <>
                        Today the proof covers the{" "}
                        <span className="text-bone-dim">serving stack and request integrity</span> —
                        that the verdict was served by the genuine verified enclave we committed to,
                        untampered in transit. It does <strong className="text-bone">not</strong> claim
                        the model&apos;s output is cryptographically bound to the enclave; that&apos;s on the
                        roadmap the moment 0G lists an LLM-in-TEE provider. We&apos;d rather tell you where
                        the proof ends than pretend it doesn&apos;t.
                      </>
                    ),
                  },
                ].map((p) => (
                  <li key={p.t} className="border-l border-gold/30 pl-4">
                    <h3 className="font-display text-xl text-bone">{p.t}</h3>
                    <p className="mt-1 font-sans text-sm leading-relaxed text-bone-dim">{p.d}</p>
                  </li>
                ))}
                <li className="pl-4">
                  <Link
                    href="/arena"
                    className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-gold-bright hover:underline"
                  >
                    Verify a verdict →
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <ActDivider />

      {/* ===================== ACT V — STEP UP TO THE BENCH ===================== */}
      <section className="spotlight relative px-5 py-28 text-center">
        <ActHeader
          act="Act V"
          eyebrow="The docket is open"
          title={
            <>
              Got a <span className="italic text-gold-bright">score to settle?</span>
            </>
          }
          body="File a case in under a minute. Or walk the gallery, take sides, and collect when you call it right. No wallet needed to watch."
          center
        />
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/file" size="lg">
            File a Case
          </ButtonLink>
          <ButtonLink href="/arena" variant="ghost" size="lg">
            Walk the Gallery
          </ButtonLink>
        </div>
      </section>

      {/* ===================== THE CLOSING OF THE COURT ===================== */}
      <footer className="relative border-t border-ink-400 surface-docket">
        <div className="spotlight mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center">
          {/* the seal — the closing emblem */}
          <div className="seal seal--verified gavel-drop !h-[5.5rem] !w-[5.5rem]">
            <span className="font-display text-3xl">⚖</span>
          </div>

          {/* the adjournment */}
          <p className="mt-10 font-display text-4xl text-bone sm:text-5xl">
            This court is <span className="italic text-gold-bright">adjourned.</span>
          </p>
          <p className="mt-3 font-sans text-bone-dim">
            Filed in public. Sealed on-chain. Owed to no one.
          </p>

          {/* the maxim */}
          <div className="my-10 flex w-full flex-col items-center">
            <div className="gold-rule w-32" />
            <p className="embossed mt-7 font-display text-2xl italic tracking-[0.34em]">SINE FAVORE</p>
            <p className="mt-1.5 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-bone-faint">
              the judge owes no one
            </p>
          </div>

          {/* one tight row of essential links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 font-mono text-[0.72rem] uppercase tracking-[0.16em]">
            <Link href="/arena" className="text-bone-dim transition-colors hover:text-gold-bright">
              The Gallery
            </Link>
            <Link href="/file" className="text-bone-dim transition-colors hover:text-gold-bright">
              File a Case
            </Link>
            <Link href="/#audit" className="text-bone-dim transition-colors hover:text-gold-bright">
              Verify a Verdict
            </Link>
            <a
              href="https://x.com/0G_labs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-bone-dim transition-colors hover:text-gold-bright"
            >
              X
            </a>
            <a
              href="https://docs.0g.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-bone-dim transition-colors hover:text-gold-bright"
            >
              0G Docs
            </a>
          </nav>

          {/* fine print — one line */}
          <p className="mt-12 font-mono text-[0.64rem] uppercase tracking-[0.22em] text-bone-faint">
            VERDICT · Built on 0G · <span className="text-verdict-bright/80">✓ Verified by TEE</span>
          </p>
        </div>
      </footer>
    </>
  );
}
