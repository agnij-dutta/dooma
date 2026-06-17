import { NextResponse } from "next/server";
import { vote } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.id || (body.side !== "A" && body.side !== "B")) {
    return NextResponse.json({ error: "need {id, side:'A'|'B'}" }, { status: 400 });
  }
  const updated = vote(body.id, body.side);
  if (!updated) return NextResponse.json({ error: "case not found" }, { status: 404 });
  return NextResponse.json({ votesA: updated.votesA, votesB: updated.votesB });
}
