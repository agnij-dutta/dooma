import { NextResponse } from "next/server";
import { listCases, createCase } from "@/lib/store";
import { DEFAULT_PROVIDER } from "@/lib/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listCases());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const required = ["title", "question", "partyA", "partyB", "evidenceA", "evidenceB", "stake"];
  for (const k of required) {
    if (!body[k] || typeof body[k] !== "string") {
      return NextResponse.json({ error: `missing field: ${k}` }, { status: 400 });
    }
  }

  const c = createCase({
    title: body.title,
    question: body.question,
    partyA: body.partyA,
    partyB: body.partyB,
    evidenceA: body.evidenceA,
    evidenceB: body.evidenceB,
    stake: body.stake,
    provider: typeof body.provider === "string" ? body.provider : DEFAULT_PROVIDER,
  });
  return NextResponse.json(c, { status: 201 });
}
