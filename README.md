<div align="center">

<img src="https://dooma.vercel.app/cover.png" alt="DOOMA — sine favore" width="720" />

# DOOMA

**A public AI courtroom on 0G.** Settle any dispute or bet on-chain — and check the receipt.

*An AI judge that can't be bribed. **Sine favore — the judge owes no one.***

[**▶ Live demo**](https://dooma.vercel.app) · [Escrow on 0G](https://chainscan-galileo.0g.ai/address/0xdFD55C3412a8B4c8B573e4b933c8F24e26d84d1d) · Built for **The Zero Cup 2026**

</div>

---

## The idea

Two people have a dispute or a bet. They escrow real funds on **0G Chain**. The crowd takes sides. An AI judge — served inside a **cryptographically verified hardware enclave (TEE)** on **0G Compute**, so it can't be quietly swapped or tampered with — rules with cited reasoning. The escrow **auto-pays the winner**, and every verdict ships with a proof anyone can verify independently.

> The loser always says it was rigged. Here, they can't — and you don't have to take our word for it.

## Why it can only exist on 0G

| 0G primitive | What DOOMA uses it for |
|---|---|
| **0G Chain** | A minimal `Escrow` contract holds both stakes and pays the winner trustlessly. `resolve` can **only** ever pay a case participant — never an arbitrary address. **Live** at `0xdFD55C3412a8B4c8B573e4b933c8F24e26d84d1d` (Galileo testnet, chain 16602). |
| **0G Compute** | The ruling is served by a TEE provider. The app runs a **full client-side remote attestation** (Intel TDX quote + image integrity + signer match) via the open-source [dstack](https://github.com/Dstack-TEE/dstack) verifier, and surfaces the public attestation report — on every case, with no funds required. |
| **0G Storage** | Evidence + proof bundles are content-addressed for permanence. |

## How it works

```
File a case ──▶ Opponent accepts ──▶ Crowd takes a side ──▶ The gavel drops ──▶ Auto-payout
(stake on-chain)  (matches stake)     (free, no wallet)    (TEE-attested AI)   (winner paid)
                                                                  │
                                                          ▼ every verdict
                                              a public, independently verifiable receipt
```

1. **File** — state the claim + ruling criterion, name your opponent, lock your stake (`createCase`). Inputs are committed (hashed) before the AI ever sees them.
2. **Accept** — your opponent matches the stake via a challenge link (`acceptCase`). The pot is locked.
3. **Spectate** — anyone can watch the Arena and cast a free "who's right?" vote.
4. **The gavel drops** — the AI rules; the verdict is served by a verified TEE serving stack; the escrow releases to the winner (`resolve`).
5. **Verify** — tap the wax seal on any verdict to inspect the remote-attestation report yourself.

## Verifiability — the honest version

0G's verifiable inference is **TEE / hardware-enclave attestation**, not ZK. What DOOMA proves **today**:

> *This verdict was served by a genuine, cryptographically attested TEE serving stack — the exact verified image we committed to, not a machine swapped in to rig the outcome — and the request/response weren't forged in transit. Anyone can verify the remote-attestation report out-of-band via the open-source dstack verifier.*

What it does **not** yet claim: that a *specific model produced an exact output* (current testnet providers route the model behind the enclave). That gap closes the moment 0G lists an LLM-in-TEE provider — **with zero app changes**. We'd rather draw the line honestly than overclaim.

## What's working (verified live on testnet)

- ✅ Deployed `Escrow` + the full **create → accept → resolve → payout** lifecycle, exercised on-chain with real OG (incl. correct 2.5% fee math).
- ✅ **Live TEE attestation** on every case (needs no funded wallet).
- ✅ Real AI verdicts via any OpenAI-compatible model (defaults to **Groq**, free).
- ✅ 31 passing Foundry tests (incl. a reentrancy attack + the resolver-can-only-pay-a-participant invariant).

## Tech stack

- **App** — Next.js 14 (App Router) · TypeScript · Tailwind · wagmi v2 / viem / RainbowKit · `@vercel/og`. Deployed on Vercel.
- **AI rulings** — tiered `getRuler()`: verified 0G Compute (when a ledger is funded) → any OpenAI-compatible LLM (Groq/OpenAI/OpenRouter) → offline mock. Never blocks the demo.
- **Attestation** — `@0gfoundation/0g-compute-ts-sdk` (`verifyService` + `getSignerRaDownloadLink`).
- **Contracts** — Solidity 0.8.28 + Foundry, OpenZeppelin `ReentrancyGuard`.

## Repository

```
.
├── app/         Next.js dApp (landing, Arena, case file, attestation, verdict cards)
├── contracts/   Foundry — Escrow.sol + 31 tests + deploy script (see contracts/DEPLOY.md)
├── spike/       Day-1 de-risk + on-chain lifecycle verification scripts
├── SPEC.md      Full product/design/strategy spec
└── SPIKE_FINDINGS.md   What the 0G verifiable-inference de-risk found
```

## Run it locally

**App**
```bash
cd app
cp .env.example .env.local      # add a free Groq key (console.groq.com/keys) for real verdicts
npm install
npm run dev                     # http://localhost:3000
```
Works read-only with no keys (attestation is live; rulings fall back to a mock). The `Escrow` address, chain, and explorer are pre-filled in `.env.example`. To settle on-chain, add `RESOLVER_PRIVATE_KEY` (the contract's resolver).

**Contracts**
```bash
cd contracts
forge test          # 31 passing
# deploy: see contracts/DEPLOY.md (note 0G's ~2 gwei min priority fee)
```

## Cost

The whole thing runs on **faucet gas** (~0.003 OG to deploy; cents per case). No 3 OG ledger is needed — that's only for the optional *verified* 0G Compute inference path, and it's a refundable deposit, not a spend.

## License

MIT
