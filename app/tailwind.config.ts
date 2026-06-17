import type { Config } from "tailwindcss";

/** rgb(var(--token) / <alpha-value>) so Tailwind opacity modifiers work with our CSS vars. */
const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        sans: ["var(--font-sans)"],
      },
      colors: {
        ink: {
          DEFAULT: rgb("--ink"),
          700: rgb("--ink-700"),
          600: rgb("--ink-600"),
          500: rgb("--ink-500"),
          400: rgb("--ink-400"),
        },
        gold: {
          DEFAULT: rgb("--gold"),
          bright: rgb("--gold-bright"),
          deep: rgb("--gold-deep"),
        },
        bone: {
          DEFAULT: rgb("--bone"),
          dim: rgb("--bone-dim"),
          faint: rgb("--bone-faint"),
        },
        parchment: rgb("--parchment"),
        verdict: {
          DEFAULT: rgb("--verdict"),
          bright: rgb("--verdict-bright"),
        },
        oxblood: {
          DEFAULT: rgb("--oxblood"),
          bright: rgb("--oxblood-bright"),
        },
        leather: {
          DEFAULT: rgb("--leather"),
          edge: rgb("--leather-edge"),
        },
        // backward-compat aliases used by existing components
        gavel: rgb("--gold"),
        loser: rgb("--oxblood"),
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        gold: "var(--shadow-gold)",
      },
      transitionTimingFunction: {
        court: "var(--ease-court)",
      },
    },
  },
  plugins: [],
};

export default config;
