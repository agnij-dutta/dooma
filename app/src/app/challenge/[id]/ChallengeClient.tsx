"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ButtonLink, Button } from "@/components/ui";
import { useAcceptCase, escrowConfigured } from "@/lib/useEscrow";

export function ChallengeClient({
  id,
  title,
  partyA,
  stake,
  status,
  onchainId,
  opponentAddress,
}: {
  id: string;
  title: string;
  partyA: string;
  stake: string;
  status: string;
  onchainId?: number;
  opponentAddress?: string;
}) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { acceptCase } = useAcceptCase();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "signing" | "confirming" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  const isOnChain = escrowConfigured && onchainId !== undefined && !!opponentAddress;
  const isSummoned =
    isConnected && opponentAddress && address?.toLowerCase() === opponentAddress.toLowerCase();
  const canAccept = isOnChain && status === "open" && isSummoned;

  async function accept() {
    setError(null);
    if (onchainId === undefined) {
      setError("This case is not bound to the live escrow.");
      return;
    }
    setBusy(true);
    try {
      setPhase("signing");
      const hash = await acceptCase({ onchainId, stakeOg: stake });

      setPhase("confirming");
      const { waitForTransactionReceipt } = await import("@wagmi/core");
      const { wagmiConfig } = await import("@/lib/wagmi");
      await waitForTransactionReceipt(wagmiConfig, { hash });

      setPhase("saving");
      await fetch("/api/cases/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, txAccept: hash }),
      });
      router.push(`/v/${id}`);
    } catch (err) {
      setError(toUserError(err));
      setBusy(false);
      setPhase("idle");
    }
  }

  const phaseLabel =
    phase === "signing"
      ? "Confirm in wallet…"
      : phase === "confirming"
        ? `Matching ${stake} OG on 0G…`
        : phase === "saving"
          ? "Entering the arena…"
          : `Accept & match ${stake} OG`;

  return (
    <div className="spotlight gold-frame surface-leather rounded-2xl p-9 text-center">
      <div className="mb-3 inline-block">
        <span className="stamp stamp--oxblood text-sm">Summons</span>
      </div>
      <div className="mb-3 text-5xl text-gold-bright">⚖</div>
      <h1 className="font-display text-4xl leading-tight text-bone">You&apos;ve been called to court.</h1>
      <p className="mx-auto mt-4 max-w-sm font-sans text-bone-dim">
        <span className="font-semibold text-bone">{partyA}</span> filed{" "}
        <span className="font-display italic text-gold-bright">&ldquo;{title}&rdquo;</span> against you and
        staked <span className="font-mono text-gold-bright">{stake} OG</span>. Match the stake to accept — or
        forfeit.
      </p>

      <div className="mt-7 flex flex-col items-center gap-3">
        {!isOnChain ? (
          // Legacy / off-chain case — no on-chain accept available.
          <ButtonLink href={`/v/${id}`} size="lg" className="w-full">
            View the case
          </ButtonLink>
        ) : status !== "open" ? (
          <ButtonLink href={`/v/${id}`} size="lg" className="w-full">
            {status === "decided" ? "View the verdict" : "Case already in session — view it"}
          </ButtonLink>
        ) : !isConnected ? (
          <>
            <p className="font-sans text-sm text-bone-dim">Connect the summoned wallet to accept.</p>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </>
        ) : !isSummoned ? (
          <p className="font-sans text-sm text-oxblood-bright">
            This wallet is not the summoned party. Only{" "}
            <span className="font-mono">
              {opponentAddress?.slice(0, 6)}…{opponentAddress?.slice(-4)}
            </span>{" "}
            can accept this case.
          </p>
        ) : (
          <Button onClick={accept} disabled={busy || !canAccept} size="lg" className="w-full">
            {busy ? phaseLabel : `Accept & match ${stake} OG`}
          </Button>
        )}

        {error && <p className="font-sans text-sm text-oxblood-bright">{error}</p>}

        <Link
          href={`/v/${id}`}
          className="font-mono text-[0.72rem] uppercase tracking-widest text-bone-faint hover:text-gold-bright"
        >
          View the case first
        </Link>
      </div>

      <p className="mt-7 font-mono text-[0.66rem] leading-relaxed text-bone-faint">
        Accepting calls <span className="text-bone-dim">Escrow.acceptCase()</span> live on 0G — your stake is
        matched into the on-chain pot.
      </p>
    </div>
  );
}

function toUserError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/user rejected|denied|rejected the request/i.test(msg)) return "Transaction rejected in wallet.";
  if (/insufficient funds/i.test(msg)) return "Insufficient OG balance to match the stake + gas.";
  if (/StakeMismatch/i.test(msg)) return "Stake amount mismatch — must match the creator exactly.";
  if (/chain|network|switch/i.test(msg)) return "Switch your wallet to 0G Galileo testnet (16602) and retry.";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
