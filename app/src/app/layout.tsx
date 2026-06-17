import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Display — dramatic editorial serif (use big; italics for verdict drama)
const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// Mono — addresses, attestation data, receipts (the cryptographic-proof texture).
// Exposed as --font-geist-mono to match globals.css; JetBrains Mono for reliability.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Body / UI
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VERDICT — Settle It On-Chain",
  description:
    "A public AI courtroom on 0G. Two people, one AI judge that can't be bribed, the money's already locked. Every verdict is served by a cryptographically verified TEE serving stack — inspect the proof yourself.",
  openGraph: {
    title: "VERDICT — Settle It On-Chain",
    description:
      "A public AI courtroom on 0G. Pick a side before the gavel drops.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${mono.variable} ${hanken.variable}`}
    >
      <body className="grain">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
