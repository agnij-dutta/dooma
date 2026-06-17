"use client";

import { useEffect, useState } from "react";
import type { AttestationSummary } from "@/lib/types";

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 font-sans text-sm">
      <span className={ok ? "text-verdict-bright" : "text-oxblood-bright"}>{ok ? "✓" : "✗"}</span>
      <span className="text-bone-dim">{label}</span>
    </li>
  );
}

/**
 * The KEYSTONE panel. Hits /api/attestation which calls the REAL 0G testnet
 * (verifyService + getSignerRaDownloadLink) — no funds needed.
 *
 * HONEST COPY: "Verified TEE serving stack (dstack)" + "request integrity".
 * Never "provably the model said it" (SPEC §3).
 */
export function AttestationPanel({ provider }: { provider: string }) {
  const [data, setData] = useState<AttestationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/attestation?provider=${provider}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => alive && setError(String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [provider]);

  return (
    <div className="gold-frame relative overflow-hidden rounded-xl surface-leather p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="eyebrow">Certificate of Attestation</p>
        {data?.success && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-verdict/40 bg-verdict/10 px-2.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-widest text-verdict-bright">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-verdict-bright" />
            Live · 0G testnet
          </span>
        )}
      </div>

      {loading && (
        <p className="font-sans text-sm text-bone-faint">Verifying serving stack against 0G testnet…</p>
      )}

      {error && <p className="font-sans text-sm text-oxblood-bright">Could not reach attestation: {error}</p>}

      {data && (
        <>
          <div className="mb-4 flex items-center gap-4">
            <a
              href={data.raReportURL}
              target="_blank"
              rel="noreferrer"
              title="Inspect the remote-attestation report"
              className="seal seal--verified gavel-drop !h-16 !w-16 shrink-0 transition-transform hover:scale-105"
            >
              <span className="text-center font-mono text-[0.5rem] uppercase leading-tight tracking-widest">
                Verified
                <br />
                by TEE
              </span>
            </a>
            <div>
              <div className="font-display text-xl text-bone">Verified serving stack</div>
              <div className="font-mono text-[0.7rem] uppercase tracking-wider text-bone-faint">
                {data.teeVerifier} · Intel TDX enclave
              </div>
            </div>
          </div>

          <ul className="mb-4 space-y-1.5">
            <Check ok={data.checks.quoteValid} label="TEE quote valid" />
            <Check ok={data.checks.imageIntegrity} label="Serving-image integrity" />
            <Check ok={data.checks.signerMatch} label="Signer address match (on-chain)" />
          </ul>

          <div className="mb-4 rounded-md border border-ink-400 bg-ink/50 p-3 font-mono text-[0.66rem] leading-relaxed text-bone-faint">
            <div>provider {data.provider.slice(0, 10)}…{data.provider.slice(-6)}</div>
            {data.signerAddresses[0] && (
              <div>signer {data.signerAddresses[0].slice(0, 10)}…{data.signerAddresses[0].slice(-6)}</div>
            )}
            <div className="mt-1 break-all text-bone-faint/70">quote {data.quotePreview}</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={data.raReportURL}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm bg-gold px-3 py-1.5 font-sans text-sm font-semibold text-ink shadow-gold transition-all hover:bg-gold-bright"
            >
              Inspect proof ↗
            </a>
            <a
              href={data.verifierURL}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[0.7rem] text-bone-dim underline-offset-2 hover:text-gold-bright hover:underline"
            >
              open-source verifier ({data.teeVerifier}) ↗
            </a>
          </div>

          <div className="my-4 gold-rule" />

          <p className="font-mono text-[0.68rem] leading-relaxed text-bone-faint">
            Proves the request was served by a genuine, cryptographically attested TEE serving
            stack — the exact verified image, not a swapped machine — and wasn&apos;t forged in
            transit. It does <span className="text-bone-dim">not</span> prove a specific model
            produced an exact output (the model currently runs centralized behind the verified
            enclave). Full output-binding lands when 0G lists an LLM-in-TEE provider — zero app
            changes.
          </p>
        </>
      )}
    </div>
  );
}
