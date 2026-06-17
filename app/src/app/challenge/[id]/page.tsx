import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase } from "@/lib/store";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Challenge link — "@you've been called to court. Accept or forfeit."
 * The invite virus: every case drags in a second person. Matching the stake
 * via Escrow.acceptCase wires up once the contract is deployed.
 */
export default function ChallengePage({ params }: { params: { id: string } }) {
  const c = getCase(params.id);
  if (!c) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-5 py-8">
        <div className="spotlight gold-frame surface-leather rounded-2xl p-9 text-center">
          <div className="mb-3 inline-block">
            <span className="stamp stamp--oxblood text-sm">Summons</span>
          </div>
          <div className="mb-3 text-5xl text-gold-bright">⚖</div>
          <h1 className="font-display text-4xl leading-tight text-bone">
            You&apos;ve been called to court.
          </h1>
          <p className="mx-auto mt-4 max-w-sm font-sans text-bone-dim">
            <span className="font-semibold text-bone">{c.partyA}</span> filed{" "}
            <span className="font-display italic text-gold-bright">&ldquo;{c.title}&rdquo;</span>{" "}
            against you and staked{" "}
            <span className="font-mono text-gold-bright">{c.stake} OG</span>. Match the stake to
            accept — or forfeit.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3">
            <ButtonLink href={`/v/${c.id}`} size="lg" className="w-full">
              Accept &amp; match {c.stake} OG
            </ButtonLink>
            <Link
              href={`/v/${c.id}`}
              className="font-mono text-[0.72rem] uppercase tracking-widest text-bone-faint hover:text-gold-bright"
            >
              View the case first
            </Link>
          </div>

          <p className="mt-7 font-mono text-[0.66rem] leading-relaxed text-bone-faint">
            Stake matching calls <span className="text-bone-dim">Escrow.acceptCase()</span> on 0G —
            wired once the contract is deployed.
          </p>
        </div>
      </main>
    </>
  );
}
