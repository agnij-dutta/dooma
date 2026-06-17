import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCase } from "@/lib/store";
import { CaseDetail } from "@/components/CaseDetail";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const c = getCase(params.id);
  if (!c) return { title: "VERDICT" };
  const title = c.status === "decided" ? `⚖️ ${c.winnerLabel} wins — ${c.title}` : `⚖️ ${c.title}`;
  // OG image is the colocated opengraph-image route; Next wires it automatically.
  return {
    title,
    description: c.question,
    openGraph: { title, description: c.question, type: "article" },
    twitter: { card: "summary_large_image", title, description: c.question },
  };
}

export default function CasePage({ params }: { params: { id: string } }) {
  const c = getCase(params.id);
  if (!c) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <CaseDetail initial={c} />
      </main>
    </>
  );
}
