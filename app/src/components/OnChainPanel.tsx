"use client";

import type { Case } from "@/lib/types";
import { useEscrowCase, CaseStatus } from "@/lib/useEscrow";

const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://chainscan-galileo.0g.ai";

const STATUS_LABEL: Record<number, string> = {
  [CaseStatus.None]: "Not on-chain",
  [CaseStatus.Open]: "Open · awaiting opponent",
  [CaseStatus.Active]: "Active · staked & in session",
  [CaseStatus.Resolved]: "Resolved · winner paid",
  [CaseStatus.Refunded]: "Refunded",
};

function short(h?: string) {
  if (!h) return "";
  return h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h;
}

function TxRow({ label, hash }: { label: string; hash?: string }) {
  if (!hash) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-bone-faint">{label}</span>
      <a
        href={`${EXPLORER}/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold/80 hover:text-gold-bright"
      >
        {short(hash)} ↗
      </a>
    </div>
  );
}

/**
 * On-chain status + escrow tx trail. Reads live getCase() when the case is
 * bound to the contract; degrades to a quiet "off-chain" note otherwise so the
 * panel never hard-crashes with no wallet / unconfigured contract.
 */
export function OnChainPanel({ c }: { c: Case }) {
  const onChain = c.onchainId !== undefined;
  const { data } = useEscrowCase(c.onchainId);

  if (!onChain) {
    return (
      <div className="rounded-xl border border-ink-400 surface-docket p-4 font-mono text-[0.72rem] leading-relaxed text-bone-faint">
        <div className="mb-1 uppercase tracking-widest text-bone-dim">Escrow</div>
        This case is off-chain (legacy). No live stake bound to{" "}
        <span className="text-gold/70">Escrow.sol</span>.
      </div>
    );
  }

  const liveStatus =
    data?.status !== undefined ? STATUS_LABEL[data.status] ?? "—" : "loading…";

  return (
    <div className="rounded-xl border border-ink-400 surface-docket p-4 font-mono text-[0.72rem] leading-relaxed">
      <div className="mb-2 flex items-center justify-between">
        <span className="uppercase tracking-widest text-bone-dim">Escrow · 0G</span>
        <span className="text-verdict-bright">#{c.onchainId}</span>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-bone-faint">Status</span>
        <span className="text-bone-dim">{liveStatus}</span>
      </div>

      <div className="space-y-1.5">
        <TxRow label="Filed" hash={c.txCreate} />
        <TxRow label="Accepted" hash={c.txAccept} />
        <TxRow label="Resolved" hash={c.txResolve} />
        {!c.txCreate && !c.txAccept && !c.txResolve && (
          <span className="text-bone-faint">No transactions recorded yet.</span>
        )}
      </div>

      {c.creatorAddress && (
        <div className="mt-3 border-t border-ink-400 pt-2 text-[0.66rem] text-bone-faint">
          <div>A {c.creatorAddress.slice(0, 6)}…{c.creatorAddress.slice(-4)}</div>
          {c.opponentAddress && (
            <div>B {c.opponentAddress.slice(0, 6)}…{c.opponentAddress.slice(-4)}</div>
          )}
        </div>
      )}
    </div>
  );
}
