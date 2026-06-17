"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui";

const FIELDS = [
  { name: "title", label: "Case title", placeholder: "Is a hot dog a sandwich?", textarea: false },
  {
    name: "question",
    label: "Resolution question + ruling criterion",
    placeholder: "Resolve: … Rule YES if …",
    textarea: true,
  },
  { name: "partyA", label: "Party A (you)", placeholder: "TeamSandwich", textarea: false },
  { name: "partyB", label: "Party B (opponent)", placeholder: "TeamNotASandwich", textarea: false },
  { name: "evidenceA", label: "Your evidence", placeholder: "Why you're right…", textarea: true },
  { name: "evidenceB", label: "Opponent's evidence", placeholder: "Their side…", textarea: true },
  { name: "stake", label: "Stake per side (OG)", placeholder: "0.5", textarea: false },
] as const;

export default function FilePage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const c = await res.json();
      router.push(`/v/${c.id}`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "failed to file case");
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-ink-400 bg-ink/60 p-3 font-sans text-sm text-bone placeholder:text-bone-faint outline-none transition-colors focus:border-gold/60";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <div className="spotlight mb-8">
          <p className="eyebrow mb-2">Submit to the docket</p>
          <h1 className="font-display text-5xl text-bone">File a Case</h1>
          <p className="mt-3 font-sans text-sm leading-relaxed text-bone-dim">
            State the claim and the exact ruling criterion. Inputs are committed before the AI ever
            sees them. Escrow staking wires to{" "}
            <span className="font-mono text-gold/80">Escrow.sol</span> once deployed.
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
                  required
                  rows={3}
                  placeholder={f.placeholder}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                  className={inputCls}
                />
              ) : (
                <input
                  required
                  placeholder={f.placeholder}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                  className={inputCls}
                />
              )}
            </div>
          ))}

          {error && <p className="font-sans text-sm text-oxblood-bright">{error}</p>}

          <Button type="submit" disabled={busy} size="lg" className="w-full">
            {busy ? "Filing…" : "File Case & Open the Arena ⚖"}
          </Button>
        </form>
      </main>
    </>
  );
}
