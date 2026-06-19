import { notFound } from "next/navigation";
import { getCase } from "@/lib/store";
import { SiteHeader } from "@/components/SiteHeader";
import { ChallengeClient } from "./ChallengeClient";

export const dynamic = "force-dynamic";

/**
 * Challenge link — "you've been called to court. Accept or forfeit."
 * Server component loads the case content; the client island handles the
 * wallet-gated Escrow.acceptCase() flow.
 */
export default function ChallengePage({ params }: { params: { id: string } }) {
  const c = getCase(params.id);
  if (!c) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-5 py-8">
        <ChallengeClient
          id={c.id}
          title={c.title}
          partyA={c.partyA}
          stake={c.stake}
          status={c.status}
          onchainId={c.onchainId}
          opponentAddress={c.opponentAddress}
        />
      </main>
    </>
  );
}
