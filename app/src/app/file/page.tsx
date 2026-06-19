"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  decodeEventLog,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui";
import { escrowAbi } from "@/lib/escrowAbi";
import {
  useCreateCase,
  useEnsureChain,
  computeClaimHash,
  escrowConfigured,
} from "@/lib/useEscrow";

type TextField = { name: string; label: string; placeholder: string; textarea: boolean };

const FIELDS: readonly TextField[] = [
  { name: "title", label: "Case title", placeholder: "Is a hot dog a sandwich?", textarea: false },
  {
    name: "question",
    label: "Resolution question + ruling criterion",
    placeholder: "Resolve: … Rule YES if …",
    textarea: true,
  },
  { name: "evidenceA", label: "Your evidence", placeholder: "Why you're right…", textarea: true },
  { name: "evidenceB", label: "Opponent's evidence", placeholder: "Their side…", textarea: true },
  { name: "partyA", label: "Your display name (optional)", placeholder: "TeamSandwich", textarea: false },
  { name: "partyB", label: "Opponent display name (optional)", placeholder: "TeamNotASandwich", textarea: false },
  { name: "stake", label: "Stake per side (OG)", placeholder: "0.5", textarea: false },
];

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/** Pulls the new case id out of the createCase receipt's CaseCreated event. */
function parseOnchainId(logs: readonly { topics: readonly Hex[]; data: Hex }[]): number | undefined {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: escrowAbi,
        topics: log.topics as [Hex, ...Hex[]],
        data: log.data,
      });
      if (decoded.eventName === "CaseCreated") {
        return Number((decoded.args as { id: bigint }).id);
      }
    } catch {
      // not one of our events — skip
    }
  }
  return undefined;
}

export default function FilePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { wrongChain } = useEnsureChain();
  const { createCase } = useCreateCase();

  const [form, setForm] = useState<Record<string, string>>({});
  const [opponent, setOpponent] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "signing" | "confirming" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  const opponentValid = isAddress(opponent);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!escrowConfigured) {
      setError("Escrow contract is not configured. Set NEXT_PUBLIC_ESCROW_ADDRESS.");
      return;
    }
    if (!isConnected) {
      setError("Connect a wallet on 0G Galileo testnet to stake and file.");
      return;
    }
    if (!opponentValid) {
      setError("Enter a valid opponent wallet address (0x…).");
      return;
    }

    setBusy(true);
    try {
      const question = form.question ?? "";
      const evidenceA = form.evidenceA ?? "";
      const evidenceB = form.evidenceB ?? "";
      const stake = (form.stake ?? "").trim();
      const claimHash = computeClaimHash({ question, evidenceA, evidenceB });

      // 1) on-chain createCase (ensureChain runs inside the hook)
      setPhase("signing");
      const hash = await createCase({
        claimHash,
        opponent: opponent as Address,
        stakeOg: stake,
      });

      // 2) wait for the receipt + parse the new on-chain id from the event log
      setPhase("confirming");
      const { waitForTransactionReceipt } = await import("@wagmi/core");
      const { wagmiConfig } = await import("@/lib/wagmi");
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      const onchainId = parseOnchainId(receipt.logs);
      if (onchainId === undefined) {
        throw new Error("Could not read the new case id from the transaction.");
      }
      const creatorAddress = receipt.from;

      // 3) persist content + on-chain linkage to the off-chain store
      setPhase("saving");
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          question,
          evidenceA,
          evidenceB,
          partyA: form.partyA?.trim() || shortAddr(creatorAddress),
          partyB: form.partyB?.trim() || shortAddr(opponent),
          stake,
          onchainId,
          claimHash,
          creatorAddress,
          opponentAddress: opponent,
          txCreate: hash,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "failed to save case");
      }
      const c = await res.json();
      router.push(`/v/${c.id}`);
    } catch (err) {
      setError(toUserError(err));
      setBusy(false);
      setPhase("idle");
    }
  }

  const inputCls =
    "w-full rounded-md border border-ink-400 bg-ink/60 p-3 font-sans text-sm text-bone placeholder:text-bone-faint outline-none transition-colors focus:border-gold/60";

  const phaseLabel =
    phase === "signing"
      ? "Confirm in wallet…"
      : phase === "confirming"
        ? "Staking on 0G…"
        : phase === "saving"
          ? "Opening the arena…"
          : "File Case & Open the Arena ⚖";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <div className="spotlight mb-8">
          <p className="eyebrow mb-2">Submit to the docket</p>
          <h1 className="font-display text-5xl text-bone">File a Case</h1>
          <p className="mt-3 font-sans text-sm leading-relaxed text-bone-dim">
            State the claim and the exact ruling criterion. Inputs are committed (hashed) before the
            AI ever sees them, and your stake is escrowed live by{" "}
            <span className="font-mono text-gold/80">Escrow.sol</span> on 0G.
          </p>
        </div>

        <form onSubmit={submit} className="surface-docket space-y-5 rounded-xl border border-ink-400 p-6 sm:p-7">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="mb-1.5 block font-mono text-[0.7rem] uppercase tracking-[0.16em] text-bone-dim">
                {f.label}
              </label>
              {f.textarea ? (
                <textarea
                  required={f.name !== "partyA" && f.name !== "partyB"}
                  rows={3}
                  placeholder={f.placeholder}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                  className={inputCls}
                />
              ) : (
                <input
                  required={f.name === "title" || f.name === "stake"}
                  placeholder={f.placeholder}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                  className={inputCls}
                />
              )}
            </div>
          ))}

          {/* Opponent wallet — the contract requires a SPECIFIC opponent. */}
          <div>
            <label className="mb-1.5 block font-mono text-[0.7rem] uppercase tracking-[0.16em] text-bone-dim">
              Opponent wallet address (required)
            </label>
            <input
              required
              placeholder="0x… — the only address allowed to accept"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value.trim())}
              className={inputCls}
            />
            {opponent.length > 0 && !opponentValid && (
              <p className="mt-1 font-mono text-[0.66rem] text-oxblood-bright">Not a valid 0x address.</p>
            )}
          </div>

          {/* Wallet / chain status */}
          <div className="flex items-center justify-between rounded-md border border-ink-400 bg-ink/40 px-4 py-3">
            <span className="font-mono text-[0.7rem] uppercase tracking-widest text-bone-faint">
              {!isConnected
                ? "Wallet not connected"
                : wrongChain
                  ? "Wrong network — switch to 0G"
                  : "Ready on 0G Galileo"}
            </span>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>

          {error && <p className="font-sans text-sm text-oxblood-bright">{error}</p>}

          <Button type="submit" disabled={busy} size="lg" className="w-full">
            {busy ? phaseLabel : "File Case & Open the Arena ⚖"}
          </Button>
        </form>
      </main>
    </>
  );
}

function toUserError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/user rejected|denied|rejected the request/i.test(msg)) return "Transaction rejected in wallet.";
  if (/insufficient funds/i.test(msg)) return "Insufficient OG balance to cover stake + gas.";
  if (/chain|network|switch/i.test(msg)) return "Switch your wallet to 0G Galileo testnet (16602) and retry.";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
