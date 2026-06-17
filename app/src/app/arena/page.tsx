import { listCases } from "@/lib/store";
import { DocketCard, SectionHeading, ButtonLink, StatPill } from "@/components/ui";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export default function Arena() {
  const cases = listCases();
  const inSession = cases.filter((c) => c.status === "in_session");
  const open = cases.filter((c) => c.status === "open");
  const decided = cases.filter((c) => c.status === "decided");

  const totalStake = cases.reduce((s, c) => s + Number(c.stake || 0) * 2, 0);
  const totalVotes = cases.reduce((s, c) => s + c.votesA + c.votesB, 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="spotlight mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-2">The Docket</p>
            <h1 className="font-display text-5xl text-bone">The Arena</h1>
            <p className="mt-2 max-w-md font-sans text-bone-dim">
              Live disputes, in session and settled. Pick a side before the gavel drops.
            </p>
          </div>
          <ButtonLink href="/file" size="lg">
            File a Case
          </ButtonLink>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Cases on the docket" value={cases.length} />
          <StatPill label="In session" value={inSession.length} />
          <StatPill label="OG escrowed" value={totalStake.toFixed(2)} />
          <StatPill label="Crowd votes cast" value={totalVotes.toLocaleString()} />
        </div>

        <Section title="In Session" eyebrow="The gavel is poised" cases={inSession} empty="No cases in session." />
        <Section title="Open · awaiting a challenger" eyebrow="Summons issued" cases={open} empty="No open cases." />
        <Section title="Settled" eyebrow="The record" cases={decided} empty="No verdicts yet." />
      </main>
    </>
  );
}

function Section({
  title,
  eyebrow,
  cases,
  empty,
}: {
  title: string;
  eyebrow: string;
  cases: ReturnType<typeof listCases>;
  empty: string;
}) {
  return (
    <section className="mb-12">
      <SectionHeading eyebrow={eyebrow} title={title} className="mb-5" />
      {cases.length === 0 ? (
        <p className="font-mono text-sm text-bone-faint">{empty}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c, i) => (
            <div key={c.id} className="reveal" style={{ animationDelay: `${i * 70}ms` }}>
              <DocketCard c={c} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
