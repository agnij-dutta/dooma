import { NextResponse } from "next/server";
import { fetchAttestation } from "@/lib/attestation";
import { DEFAULT_PROVIDER } from "@/lib/chain";

// Hits the LIVE 0G testnet. Never statically cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") ?? DEFAULT_PROVIDER;
  try {
    const summary = await fetchAttestation(provider);
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "attestation failed", provider },
      { status: 502 },
    );
  }
}
