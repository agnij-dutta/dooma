import { NextResponse } from "next/server";
import { getCase, updateCase } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Records an on-chain acceptCase: flips the off-chain case to `in_session` and
 * stores the accept tx hash. The money already moved on-chain (the browser
 * sent acceptCase before calling this); this only syncs the content store.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "need {id}" }, { status: 400 });

  const c = getCase(body.id);
  if (!c) return NextResponse.json({ error: "case not found" }, { status: 404 });

  const updated = updateCase(c.id, {
    status: "in_session",
    txAccept: typeof body.txAccept === "string" ? body.txAccept : c.txAccept,
  });
  return NextResponse.json(updated);
}
