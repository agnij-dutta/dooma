"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ButtonLink } from "@/components/ui";

/* ============================================================================
   ACT I — THE SUMMONS
   The curtain rising on a midnight courtroom. Pediment + columns + a giant
   embossed scales watermark, a layered spotlight, an engraved maxim, and a
   kinetic gavel strike that punctuates the headline.
   ========================================================================== */

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();

  const rise = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease, delay },
  });

  return (
    <section className="spotlight relative overflow-hidden px-5 pb-20 pt-24 text-center sm:pt-32">
      {/* atmospheric courthouse facade */}
      <div className="pediment" aria-hidden>
        <div className="pediment__roof" />
        <div className="pediment__cols" />
      </div>
      <span className="scales-watermark" aria-hidden>
        ⚖
      </span>

      {/* docket-line eyebrow */}
      <motion.p
        {...rise(0.05)}
        className="mx-auto mb-7 inline-flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-gold-bright"
      >
        <span className="live-dot" aria-hidden />
        No. 001 · Night Court · In Session
      </motion.p>

      {/* the headline + kinetic gavel */}
      <div className="relative mx-auto max-w-4xl">
        <motion.h1
          {...rise(0.18)}
          className="font-display text-[3.4rem] leading-[0.95] text-bone text-balance sm:text-[5.5rem]"
        >
          An AI judge that{" "}
          <span className="relative inline-block italic text-gold-bright">
            can&apos;t be bribed.
            {/* a gold strike sweeps under the gold phrase — the gavel landing */}
            {!reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-1/2 h-1 w-full -translate-x-1/2 rounded-full"
                style={{ background: "rgb(var(--gold-bright))" }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: [0, 0, 1, 1], opacity: [0, 0, 0.9, 0] }}
                transition={{ duration: 1.1, times: [0, 0.68, 0.74, 1], ease, delay: 0.55 }}
              />
            )}
          </span>
        </motion.h1>
      </div>

      {/* manifesto subhead */}
      <motion.p
        {...rise(0.32)}
        className="mx-auto mt-7 max-w-2xl font-sans text-lg text-bone-dim text-pretty sm:text-xl"
      >
        Two people. One verdict. The money&apos;s already locked on-chain — pick a side before the
        gavel drops.
      </motion.p>

      {/* the two doors */}
      <motion.div
        {...rise(0.44)}
        className="mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <ButtonLink href="/file" size="lg">
          File a Case
        </ButtonLink>
        <ButtonLink href="/arena" variant="ghost" size="lg">
          Walk the Gallery
        </ButtonLink>
      </motion.div>

      {/* trust microline */}
      <motion.p
        {...rise(0.56)}
        className="mt-7 font-mono text-xs uppercase tracking-[0.16em] text-bone-faint"
      >
        Every verdict is served in a verified enclave. Don&apos;t trust us —{" "}
        <a href="#audit" className="text-gold/80 underline-offset-4 hover:text-gold-bright hover:underline">
          audit the court →
        </a>
      </motion.p>

      {/* the engraved maxim, set under the seal of the court */}
      <motion.div {...rise(0.7)} className="mt-14 flex flex-col items-center gap-2">
        <div className="act-divider w-56 max-w-[60vw]">
          <span className="act-divider__mark" aria-hidden>
            ⚖
          </span>
        </div>
        <p className="embossed font-display text-xl italic tracking-[0.3em] sm:text-2xl">
          SINE FAVORE
        </p>
        <p className="font-sans text-xs text-bone-faint">Without favor. The judge owes no one.</p>
      </motion.div>
    </section>
  );
}
