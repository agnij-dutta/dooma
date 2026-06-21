# DOOMA — app

A public AI courtroom on **0G**. Two parties stake into escrow, the crowd takes
a side, an AI judge served by a **cryptographically verified TEE** drops the
gavel, and every case mints a shareable **Verdict Card** with a live, clickable
attestation proof.

> Honesty boundary (SPEC §3): the attestation proves a **verified TEE serving
> stack (dstack) + request integrity** — NOT "provably the model said it." Copy
> never overclaims.

## Run it

```bash
cd app
cp .env.example .env.local      # ships with a throwaway read key; works as-is
npm install
npm run dev                     # http://localhost:3000
```

Boots on Next.js 14 (App Router) + TypeScript + Tailwind + wagmi/RainbowKit
(chain 16602) + `@vercel/og`.

## What's LIVE vs STUBBED

| Piece | Status | Notes |
|---|---|---|
| **TEE attestation panel** (keystone) | ✅ **LIVE** on 0G testnet | `/api/attestation` calls real `verifyService` + `getSignerRaDownloadLink`. **No funds needed.** |
| **Verdict Card** OG image | ✅ Live | `/v/[id]/opengraph-image` via `ImageResponse`. |
| Arena feed / case pages / file form / challenge links | ✅ Live | Cases persist to `data/cases.json` (seeded on first run). |
| Free hot-take voting | ✅ Live | `/api/cases/vote`, no wallet. |
| Wallet connect | ✅ Live | RainbowKit pinned to 0G Galileo (16602). |
| **AI ruling** | 🚧 **MOCKED** | `src/lib/ruling.ts` `MockRuler`. Real 0G Compute call needs a **funded ledger (min 3 OG; faucet drips 0.1/day)** — blocked. Drop-in sketch + exact SDK shapes are in the same file. |
| **On-chain escrow wiring** | 🚧 Off-chain only | `Escrow.sol` compiles + tests green but isn't deployed (no funds). ABI is at `src/lib/escrowAbi.ts` ready to wire once `NEXT_PUBLIC_ESCROW_ADDRESS` is set. |

### Verify the keystone yourself

```bash
curl "http://localhost:3000/api/attestation?provider=0xa48f01287233509FD694a22Bf840225062E67836"
# -> { success:true, teeVerifier:"dstack", checks:{quoteValid,imageIntegrity,signerMatch all true},
#      raReportURL:"https://…/attestation/report", signerAddresses:[…], quotePreview:"0400…" }
```

The `raReportURL` is a public, unauthenticated remote-attestation report anyone
can re-verify out-of-band with the open-source dstack verifier (v0.5.8).

## Contracts

`Escrow.sol` lives in `../contracts` (Foundry). Tiny, boring, secure:
ReentrancyGuard + checks-effects-interactions, resolver can only ever pay a case
participant, no upgradability, no admin withdrawal.

```bash
cd ../contracts
forge test           # 31 tests: create/accept/resolve/refund/timeout + reentrancy + fund-conservation fuzz
```

Not deployed (no funds). When the 3 OG wall clears:
`forge create --rpc-url og_testnet src/Escrow.sol:Escrow --constructor-args <resolver> <feeRecipient> <feeBps>`.

## Layout

```
src/app/
  api/attestation/route.ts     # LIVE 0G TEE attestation (keystone)
  api/cases/{,vote,resolve}/    # case store + free voting + drop-the-gavel
  v/[id]/page.tsx               # case detail + attestation panel + share
  v/[id]/opengraph-image.tsx    # the Verdict Card (OG image)
  file/page.tsx                 # File a Case
  challenge/[id]/page.tsx       # "you've been called to court" invite
src/lib/
  attestation.ts               # verifyService + getSignerRaDownloadLink (server-only)
  ruling.ts                    # Ruler interface; MockRuler now, real 0G sketch inline
  store.ts                     # JSON-file case store (no DB)
  chain.ts / wagmi.ts          # 0G Galileo testnet (16602)
  escrowAbi.ts                 # generated from contracts/src/Escrow.sol
```

## Assumptions / pragmatic choices

- **Case store is a JSON file** (`data/cases.json`), single-process, not
  concurrency-safe — fine for a hackathon demo; swap for KV/Postgres later.
- **Attestation wallet** defaults to the spike throwaway key; if unset the route
  spins up a random ephemeral wallet (verifyService needs no funds either way).
- **Mock ruling is deterministic** (longer/more-specific evidence wins) so the
  full UI flow works offline. Same `Ruler` interface accepts the real 0G call.
- WalletConnect project id is optional for local injected-wallet dev.
