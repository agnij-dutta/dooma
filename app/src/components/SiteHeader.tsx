"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

/* ---- masthead link: editorial letterspaced caps, engraved hover ---------- */
function MastheadLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative whitespace-nowrap font-sans text-[0.8rem] uppercase tracking-[0.2em] text-bone-dim transition-colors duration-[var(--t-fast)] hover:text-gold-bright"
    >
      {children}
      <span className="absolute -bottom-1.5 left-1/2 h-px w-0 -translate-x-1/2 bg-gold-bright/80 transition-all duration-[var(--t-normal)] ease-court group-hover:w-full" />
    </Link>
  );
}

/* ---- wallet as a brass nameplate (no crypto-pill chrome) ----------------- */
function WalletPlate() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
        const connected = mounted && account && chain;
        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="group inline-flex items-center gap-2 border border-gold/45 px-4 py-2 font-sans text-[0.74rem] uppercase tracking-[0.2em] text-gold-bright transition-all duration-[var(--t-fast)] hover:border-gold hover:bg-gold/10"
              style={{ borderRadius: 2 }}
            >
              <span className="transition-transform duration-[var(--t-normal)] ease-court group-hover:-rotate-12">⚖</span>
              Take the Bench
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              className="border border-oxblood/50 px-4 py-2 font-sans text-[0.74rem] uppercase tracking-[0.2em] text-oxblood-bright"
              style={{ borderRadius: 2 }}
            >
              Wrong court
            </button>
          );
        }
        return (
          <button
            onClick={openAccountModal}
            className="inline-flex items-center gap-2 border border-ink-400 bg-ink-700/60 px-4 py-2 font-mono text-[0.72rem] tracking-[0.1em] text-bone-dim transition-all duration-[var(--t-fast)] hover:border-gold/45 hover:text-gold-bright"
            style={{ borderRadius: 2 }}
          >
            <span className="text-gold-bright">⚖</span>
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-[var(--t-normal)] ease-court ${
        scrolled ? "bg-ink/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div
        className={`mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 transition-all duration-[var(--t-normal)] ease-court ${
          scrolled ? "py-3" : "py-5"
        }`}
      >
        {/* left — nav */}
        <nav className="hidden items-center justify-start gap-7 md:flex">
          <MastheadLink href="/#record">The Record</MastheadLink>
          <MastheadLink href="/arena">The Gallery</MastheadLink>
        </nav>

        {/* center — the engraved masthead */}
        <Link href="/" className="group flex flex-col items-center justify-self-center">
          <div className="flex items-center gap-2.5">
            <span className="text-xl leading-none text-gold-bright transition-transform duration-[var(--t-normal)] ease-court group-hover:-rotate-[14deg]">
              ⚖
            </span>
            <span className="embossed font-display text-[1.7rem] leading-none tracking-[0.16em] text-bone">
              DOOMA
            </span>
          </div>
          <span className="mt-1 font-display text-[0.72rem] italic tracking-[0.1em] text-gold/55">
            sine favore
          </span>
        </Link>

        {/* right — file a case + the bench */}
        <div className="hidden items-center justify-end gap-6 md:flex">
          <MastheadLink href="/file">File a Case</MastheadLink>
          <WalletPlate />
        </div>

        {/* mobile — wallet only on the right */}
        <div className="col-start-3 flex justify-end md:hidden">
          <WalletPlate />
        </div>
      </div>

      {/* the molding — a double gold hairline, like a carved lintel */}
      <div
        className={`transition-opacity duration-[var(--t-normal)] ${scrolled ? "opacity-100" : "opacity-70"}`}
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/45 to-transparent" />
        <div className="mt-[3px] h-px w-full bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
      </div>
    </header>
  );
}
