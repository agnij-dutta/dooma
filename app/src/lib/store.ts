import fs from "node:fs";
import path from "node:path";
import type { Case } from "./types";

/**
 * Dead-simple JSON-file case store for the MVP. No database. Survives dev
 * server restarts; seeded on first run. Server-only (uses node:fs).
 *
 * NOTE: this is intentionally not concurrency-safe — fine for a single-process
 * hackathon demo. Swap for Vercel KV / Postgres post-MVP.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "cases.json");
// Vercel serverless has a read-only FS except /tmp — fall back there so writes
// never crash. (Cross-instance persistence isn't guaranteed on serverless; for
// that, swap this for Vercel KV / Postgres. Fine for the demo.)
const TMP_PATH = path.join("/tmp", "verdict-cases.json");

// Module-level cache: source of truth within a warm instance, seeded on first read.
let cache: Case[] | null = null;

const SEED: Case[] = [
  {
    id: "hotdog",
    title: "Is a hot dog a sandwich?",
    question:
      "Resolve: Is a hot dog a sandwich? Rule YES if a hot dog meets the standard culinary definition of a sandwich (filling enclosed by bread).",
    partyA: "TeamSandwich",
    partyB: "TeamNotASandwich",
    evidenceA:
      "A sandwich is any filling between or within bread. A hot dog is a sausage in a sliced bun — structurally identical to a sub.",
    evidenceB:
      "Cultural and culinary convention treats hot dogs as their own category; the USDA and most diners distinguish them from sandwiches.",
    stake: "0.5",
    provider: "0xa48f01287233509FD694a22Bf840225062E67836",
    status: "in_session",
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    votesA: 142,
    votesB: 211,
  },
  {
    id: "earth-sun",
    title: "Earth–Sun distance bet",
    question:
      "Resolve: Is Earth's average distance to the Sun about 150 million km? Rule on the factual claim.",
    partyA: "Ada",
    partyB: "Boris",
    evidenceA: "1 AU is defined as ~149.6 million km. The claim is correct.",
    evidenceB: "I claimed it's closer to 100 million km.",
    stake: "1.0",
    provider: "0xa48f01287233509FD694a22Bf840225062E67836",
    status: "decided",
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    votesA: 489,
    votesB: 12,
    verdict: {
      winner: "A",
      confidence: 0.99,
      reasoning:
        "The mean Earth–Sun distance is one astronomical unit, ~149.6 million km, so the claim of about 150 million km is correct.",
      citation: "IAU definition of the astronomical unit (149,597,870.7 km).",
    },
    winnerLabel: "Ada",
    loserLabel: "Boris",
  },
  {
    id: "open-freelance",
    title: "Did the logo deliverable meet the brief?",
    question:
      "Resolve: Did the delivered logo satisfy the agreed brief (vector format, 3 concepts, 2 revision rounds)? Rule for the freelancer if the brief was met, else for the client.",
    partyA: "Freelancer",
    partyB: "Client",
    evidenceA:
      "Delivered 3 vector concepts and completed 2 revision rounds as specified in the brief, on time.",
    evidenceB:
      "Only 2 concepts felt distinct and the second revision was late by a day.",
    stake: "0.25",
    provider: "0xa48f01287233509FD694a22Bf840225062E67836",
    status: "open",
    createdAt: Date.now() - 1000 * 60 * 30,
    votesA: 33,
    votesB: 27,
  },
];

function tryReadFile(p: string): Case[] | null {
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8")) as Case[];
  } catch {
    /* unreadable — fall through */
  }
  return null;
}

function readAll(): Case[] {
  if (cache) return cache;
  cache = tryReadFile(STORE_PATH) ?? tryReadFile(TMP_PATH) ?? SEED.map((c) => ({ ...c }));
  return cache;
}

function writeAll(cases: Case[]): void {
  cache = cases; // always update the in-memory source of truth first
  // best-effort persistence — never throw on a read-only FS
  for (const p of [STORE_PATH, TMP_PATH]) {
    try {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(cases, null, 2));
      return;
    } catch {
      /* read-only (e.g. bundled path on Vercel) — try the next location */
    }
  }
}

export function listCases(): Case[] {
  return [...readAll()].sort((a, b) => b.createdAt - a.createdAt);
}

export function getCase(id: string): Case | undefined {
  return readAll().find((c) => c.id === id);
}

export function createCase(input: Omit<Case, "id" | "createdAt" | "status" | "votesA" | "votesB">): Case {
  const cases = readAll();
  const id = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}-${Date.now().toString(36)}`;
  const next: Case = {
    ...input,
    id,
    status: "open",
    createdAt: Date.now(),
    votesA: 0,
    votesB: 0,
  };
  cases.push(next);
  writeAll(cases);
  return next;
}

export function updateCase(id: string, patch: Partial<Case>): Case | undefined {
  const cases = readAll();
  const idx = cases.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  cases[idx] = { ...cases[idx], ...patch };
  writeAll(cases);
  return cases[idx];
}

export function vote(id: string, side: "A" | "B"): Case | undefined {
  const c = getCase(id);
  if (!c) return undefined;
  return updateCase(id, side === "A" ? { votesA: c.votesA + 1 } : { votesB: c.votesB + 1 });
}
