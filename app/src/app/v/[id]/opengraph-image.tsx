import { ImageResponse } from "@vercel/og";
import { getCase } from "@/lib/store";

export const runtime = "nodejs";
export const alt = "VERDICT card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const c = getCase(params.id);

  const title = c?.title ?? "VERDICT";
  const decided = c?.status === "decided" && c.verdict;
  const winner = decided ? c!.winnerLabel! : c?.partyA ?? "Party A";
  const loser = decided ? c!.loserLabel! : c?.partyB ?? "Party B";
  const rawQuote = decided ? c!.verdict!.reasoning : "Pick a side before the gavel drops.";
  const quote = `“${rawQuote.length > 160 ? `${rawQuote.slice(0, 157)}…` : rawQuote}”`;
  const stake = c?.stake ?? "0";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0f",
          backgroundImage:
            "radial-gradient(circle at 50% -10%, rgba(212,175,55,0.25), transparent 55%)",
          padding: "56px 64px",
          color: "#f4f4f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
            {"⚖️ VERDICT"}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#d4af37" }}>
            {`${stake} OG / side`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#a1a1aa" }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 64, fontWeight: 800 }}>
            <span style={{ color: "#22c55e" }}>{winner}</span>
            <span style={{ fontSize: 36, color: "#52525b" }}>defeats</span>
            <span style={{ color: "#71717a", textDecoration: "line-through" }}>{loser}</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#d4d4d8",
              maxWidth: 1000,
              lineHeight: 1.3,
            }}
          >
            {quote}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 26,
            color: "#22c55e",
            fontWeight: 600,
          }}
        >
          <span>{"✅ Verified by TEE"}</span>
          <span style={{ color: "#52525b", fontWeight: 400 }}>{"· tap to inspect proof"}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
