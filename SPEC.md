# VERDICT — a public AI courtroom on 0G ("Settle It On-Chain")

> **For:** The Zero Cup (0G global vibe-coding tournament). Submission deadline tight (~8 days from 2026-06-15). Knockout format: judges decide Top 32→8, then **community voting** opens at Top 8 and crowns the champion. The build must impress technical judges early AND be viral/shareable late. **Goal: a fair, probable shot at winning the cup — not just placing.** Strategy: honest, working 0G core for the judges (§1–3) + a crowd-spectacle virality engine (§4) + a mobilization plan (§4b).

**Tagline:** *"Two people. One AI judge that can't be bribed. The money's already locked. Pick a side before the gavel drops."*

Short tagline / brand: **"Settle It On-Chain."** (VERDICT is the name — it's a brand and a verb; keep it.)

> **⭐ CONCEPT EVOLVED 2026-06-16 — championship reframe.** The core insight: base VERDICT only gives skin in the game to the *two disputants*. The cup is won by giving the **crowd around the ring** skin in the game too — opinions, stakes, status, and a verifiable trophy to post about. So the unit of engagement changes from "private 2-party escrow" to **a PUBLIC AI courtroom the whole internet watches, picks sides on, and collects the receipt from.** The honest 0G core (escrow + TEE-attested verdict + auto-payout + public proof) is unchanged; we wrap it in a spectacle + virality engine (§4) and a mobilization plan (§4b).

---

## 1. Concept — a public AI courtroom

Anyone can **file a case**: a dispute or bet, with funds escrowed on **0G Chain**. The opponent accepts via a challenge link and matches the stake. While the case is *in session*, **the crowd takes a side** — a free one-click hot-take vote (no wallet to spectate) and an optional stake. Then **the gavel drops**: a **0G Compute TEE-attested AI** rules, shipping a publicly verifiable attestation. The escrow **auto-pays** the winner, correct predictors climb the **leaderboard**, and every case mints a spicy, shareable **Verdict Card** with a "✓ Verified by TEE" badge.

**Why this dies on AWS+OpenAI:** the loser's first instinct is *"you rigged the AI."* The verdict is served by a genuine, cryptographically attested TEE whose remote-attestation report anyone can independently verify out-of-band (see §3 — and the honesty boundary: today we prove a *verified serving stack*, with the model-output binding on the roadmap). The unbribeable judge is the product's spine *and* the spectacle's credibility.

### Viral drivers it now has (base VERDICT lacked all but stakes)
| Driver | How VERDICT delivers it |
|---|---|
| **Taking sides** | Public cases everyone has an opinion on; one-click "who's right?" |
| **Skin in the game** | Disputants escrow; spectators optionally stake — the crowd has stakes too |
| **Schadenfreude / vindication** | A public WINNER vs ~~loser~~; "I called it" cards |
| **Status / identity** | Leaderboards: Top Judges (best predictors), Most Wins, biggest pots |
| **Collectible artifact** | The Verdict Card — spicy, screenshottable, with a verifiable badge |
| **Low-friction participation** | Spectate + hot-take vote with no wallet; challenge links are one-click |
| **Spectacle / recurring event** | "The Main Event" — a scheduled live gavel-drop during vote week |

### Case flavors
- **Serious flagship** (gravity for judges): a real dispute — e.g. a freelance-style payment disagreement, a factual bet — settled with cited reasoning.
- **"Roast Court"** (volume/virality for the crowd): low-stakes fun — "Is a hot dog a sandwich?", "Did he fumble the bag?". Dial the seeded-case mix toward this if serious cases don't catch — no rebuild needed, just tone. This is the sharpest virality fallback.

---

## 2. Core user flow (on-chain vs off-chain)

1. **CREATE DISPUTE** — Party A writes the resolution question + exact ruling criterion ("YES if BTC/USD Coinbase close 6/30 > $X"). Picks the pinned 0G model, stake, opponent address, deadline. *[off-chain UI → on-chain create]*
2. **ESCROW** — `createDispute(questionHash, modelId, stake, partyB)`; A deposits stake (native OG or ERC20). B joins → matches stake. Funds locked. *[ON-CHAIN]*
3. **EVIDENCE / CLAIMS** — Each party submits a short evidence statement + links. Text content-addressed to **0G Storage**, root hash committed on-chain. Window closes at deadline. *[text→Storage, hash→ON-CHAIN]*
4. **CROWD TAKES A SIDE** — while the case is *in session*, anyone can spectate the Arena (no wallet), cast a free one-click "who's right?" hot-take vote, and optionally stake on an outcome. This is the spectator loop that makes it viral. *[free votes off-chain/cheap; optional stake → ON-CHAIN side-pool]*
5. **THE GAVEL DROPS (AI RULING)** — Backend builds a FIXED, templated prompt: system rubric + question + both evidence blobs (verbatim, attributed) + required JSON `{winner, confidence, reasoning, citation}`. Calls **0G Compute** on the TEE-attested provider; runs `verifyService()` to capture the attestation. *[off-chain orchestration; inference served in attested TEE]*
6. **PROOF PUBLISHED** — Capture full prompt, raw output, the provider attestation report + public RA URL, and verification result. Bundle → 0G Storage. Root hash + winner + outputHash written on-chain. *[bundle→Storage, result→ON-CHAIN]*
7. **AUTO-PAYOUT** — `Escrow.resolve(disputeId, winner, proofRoot)` releases the pot to the winner minus a small protocol fee; correct crowd-predictors climb the leaderboard / split the side-pool. *[ON-CHAIN]*
8. **THE VERDICT CARD** — every case mints a spicy, shareable card at `/v/{disputeId}`: WINNER vs ~~loser~~, the ruling quote, stake, and a **"✓ Verified by TEE · tap to inspect proof"** badge linking to the live attestation. Auto OG-image for X/Telegram/Discord/Farcaster. *[off-chain page over on-chain + Storage]*

**On-chain:** escrow + stakes, dispute metadata hashes, model ID, evidence root, final verdict (winner + outputHash + proofRoot), payout.
**Off-chain:** UI, prompt assembly, inference call (executes in 0G TEE), bundling.
**0G Storage:** evidence blobs + full proof bundle (provenance via on-chain root hash).

---

## 3. Trust / verifiability model (be honest)

**Reality:** 0G's verifiable inference is **TEE / hardware-enclave attestation ("Sealed Inference"), NOT ZK**. Intel TDX + NVIDIA H100/H200 TEE; a signing keypair born inside the enclave; CPU+GPU attestation binds the key to genuine secure hardware; every response signed inside the enclave before it leaves; `broker.inference.processResponse()` verifies the signature. Live on mainnet.

**What the proof proves TODAY (the honest claim — see SPIKE_FINDINGS):** *"This verdict was served by a genuine, cryptographically attested TEE serving stack — the exact verified image we committed to, not a machine the operator swapped in to rig the outcome — and the request/response weren't forged in transit. Anyone can independently verify the remote-attestation report out-of-band via the open-source dstack verifier."* The full *"this exact model produced this exact output"* binding is on the roadmap (needs an LLM-in-TEE provider or the per-response chat-signature path).

**Attack it prevents:** the loser cannot credibly claim "you secretly swapped the whole serving stack / forged the verdict in transit." With on-chain input commitment + a signed response, they also can't claim the prompt was stuffed or the answer edited after the fact. Impossible on AWS+OpenAI → the judge soundbite.

**⚠️ NEVER SAY (overclaim — judges may know 0G internals):** "provably the model said it," "tamper-proof model output," "cryptographic proof that [model] generated this verdict," "the weights ran in the enclave." **Volunteer the caveat as a credibility flex** — "we dug deep enough to find current providers route to centralized APIs; here's exactly what's proven today vs. on the roadmap." Being the team that found the 501 wins respect; overclaiming to the people who built the stack is pure downside.

**What it does NOT prove (say it out loud):**
- **Garbage in** — TEE doesn't check the prompt was fair or evidence true.
- **Model correctness** — proves *which* model ran untampered, not that the answer is *right*.
- Honest input commitment is *our* job, not the TEE's.

**Closing the garbage-in gap (the clever part):**
1. **Commit inputs on-chain BEFORE inference** — question + ruling criterion + both evidence roots hashed and locked at the evidence deadline. Prompt assembled *deterministically* from committed hashes via a published template. Skeptic verifies: committed-inputs → template → prompt → enclave-signed output. No post-hoc prompt-stuffing.
2. **Adversarial-symmetric prompt** — both parties' evidence verbatim + attributed; rubric weighs both and requires a citation; the protocol owns the prompt, not either party.
3. **Disputed evidence** — model rules on provided + cited public facts, lowers `confidence`; low confidence routes to "no clear winner → refund both minus gas" instead of forcing a wrong payout.

**Skeptic verification ("Verify this verdict"):** pull proof bundle from Storage by on-chain root → check committed input hashes match → check prompt == template(inputs) → verify enclave signature via broker path → confirm on-chain winner == output's declared winner. Independent of trusting the app.

**⚠️ SPIKE RESULT (2026-06-16) — see `SPIKE_FINDINGS.md`:**
- ✅ **Attestation IS exportable & third-party-verifiable today.** `inference.verifyService()` does a full client-side TEE quote/image/signer check (dstack v0.5.8, open source), writes `broker_attestation_report.json`; `getSignerRaDownloadLink` gives a public RA-report URL. No funded ledger needed for this.
- ⚠️ **But current testnet providers are `centralized`** (LLM routed to OpenAI/Aliyun behind the TEE). The LLM-output attestation returns HTTP 501 "not available for centralized providers." So today we prove the *serving stack is a verified TEE* — NOT that a *specific model produced the exact output*. Full output-binding needs an **LLM-in-TEE provider** or the per-response **chat-signature** path (`getChatSignatureDownloadLink` + `processResponse`), still UNTESTED (blocked by funding).
- 🚧 **Funding wall:** ledger creation needs **min 3 OG**; faucet gives 0.1/day. Billed inference + chat-signature path can't be tested until wallet ≥3 OG.
- Implication: demo copy must say "served by a cryptographically verified TEE" and only claim full verdict-output binding once the chat-signature path is confirmed.

---

## 4. Wow moment + virality engine

**Judge demo (90-sec kill shot):** a public case with stakes escrowed → crowd has taken sides in the Arena → hit **Drop the Gavel** → AI returns verdict + cited reasoning → pot auto-pays the winner on-chain in real time → click the **"✓ Verified by TEE"** badge → *"The loser will say we rigged this. They can't — this verdict was served by a genuine Intel TDX enclave; here's the remote-attestation report, and you can verify it yourself right now with the open-source dstack verifier. We didn't swap the stack, didn't forge the answer in transit, and the inputs were committed on-chain before the AI ever saw them."* → **then volunteer the caveat**: *"Today the model runs centralized behind that verified enclave — so what's cryptographically proven is the serving stack and request integrity. The moment 0G lists an LLM-in-TEE provider, the last gap closes with zero app changes. We're the team that read the 501."* Honesty + a live, clickable proof beats a hand-waved overclaim.

### The virality engine (priority-ordered — this wins the vote phase)
1. **The Verdict Card** *(keystone — build first, never cut)* — dynamic OG image (`@vercel/og` / `ImageResponse`): "⚖️ VERDICT" + case title; **WINNER** vs ~~loser~~ (strikethrough = schadenfreude); the one-sentence ruling quote; stake; footer badge **"✓ Verified by TEE · tap to inspect proof"** → live attestation URL. Unfurls beautifully in X/TG/Discord. Make it *spicy by default*. The badge is what stops it looking like a meme generator.
2. **Challenge links** — `/challenge/[id]` "@you've been called to court. Accept or forfeit." One-click, pre-fills the dispute, wallet-connect to match stake. The invite virus: every case drags in a second person.
3. **The Arena (public feed)** — live feed of open (take a side), in-session (gavel countdown), and decided (verdict cards) cases. **Zero-friction: no wallet to spectate or hot-take vote.**
4. **Take-a-side voting** — free "Who's right?" poll (top-of-funnel) + optional stake (conversion) on every open case.
5. **Leaderboards (status = daily return)** — Top Judges (most-correct predictors), Most Wins (disputants), House (biggest pots).
6. **The Main Event** — one scheduled headline case during vote week with a live gavel-drop. Appointment viewing = mobilization spike when votes count.
7. **"I called it" share** — right predictors get a personalized vindication card. Most-shared emotion.

**Design rule:** every terminal state mints a shareable card with a one-tap share button, and the proof badge is always on it — that badge fuses the viral layer to the honest 0G core.

---

## 4b. Mobilization plan (the part that actually wins Top 8)

A no-audience solo builder can't out-audience influencer teams — but can **parasitize 0G's own crowd**: 0G runs **Galxe quests, a "Starboard" leaderboard, and an active builder Discord** — a pre-assembled, vote-eligible, 0G-incentivized audience.

**Build week (days 1–5) — seed the audience while coding:**
- **Build in public on X daily** — one thread per milestone, lead with the click-it-yourself TEE attestation ("an AI judge that can't be bribed — verify it yourself"). Tag @0G_labs.
- **Live in the 0G Discord** — get roles, post progress in builders channels, ask for testers.
- **Recruit ~25 "Founding Judges"** — a TG/Discord group with early access + leaderboard head start + Main Event heads-up. *Single highest-leverage activity; unglamorous DM work; start Day 1.* 25 committed people who each bring 5 = your Top-8 margin.

**Vote week — manufacture spectacle:**
- **Seed 5–10 cases** before opening (1 serious flagship + several Roast Court). An empty arena converts no one.
- **Run "Settle The Beef" (the Main Event)** — pre-arrange two semi-known crypto-twitter / 0G-community personalities (or two rival hackathon teams!) to settle a real/staged-genuine dispute live, announced for a set time. Scheduled, watchable, screenshottable.
- **Challenge the other Top-8 teams** — "Think your dApp's better? Settle it in VERDICT." Drags competitors' audiences into your arena.
- **Get one 0G ecosystem amplification** (RT / quest inclusion). Your verifiable demo is exactly their flagship showcase. One official RT > 1,000 cold posts. Ask DevRel early.
- **Make the voting ask trivial** — pinned post, copy-paste line for Founding Judges, direct link. Don't make supporters hunt.

---

## 5. Risks + mitigations

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | **Verifiable inference / attestation export not usable on testnet** (existential) | Day-1 spike confirms. If mainnet-only/thin: demo verified path on mainnet w/ tiny stakes, OR fall back to "broker `processResponse` returns valid/invalid + store signed blob" and be transparent that full third-party verification is a mainnet feature. Record a backup demo. |
| 2 | **Garbage-in / lying evidence** | Inputs committed on-chain pre-inference; symmetric protocol-owned prompt; model must cite; honestly scoped (§3). |
| 3 | **Latency** (TEE inference slow on stage) | Pre-warm provider + funded ledger; "Deliberating…" animation (feels like a real ruling); short evidence. |
| 4 | **AI wrong / ambiguous** | Confidence threshold → "no clear winner" refunds both. Pin a capable model. Demo a clean factual question. |
| 5 | **Escrow security** (real funds, fresh contract) | Tiny boring contract: deposit/join/resolve/refund/timeout. OpenZeppelin, ReentrancyGuard, checks-effects-interactions. Testnet OG only. No upgradability, no admin stake withdrawal. |
| 6 | **Trusted resolver centralization** (who calls `resolve`?) | MVP: backend signer writes the verdict (documented). It can *only* write the winner matching the signed output's declared winner; proof bundle makes cheating publicly detectable. Note as known centralization w/ decentralization path (on-chain attestation verification). |
| 7 | **Provider liveness / funding** | `addLedger(3)`, `transferFund` ≥1 OG per provider ahead; retry/fallback provider. |
| 8 | **Scope creep** | Ruthless cut list (§6). |

---

## 6. 8-day build plan + stack + scope

**Stack (TS/React/Next dev, new to 0G):**
- Next.js 14 (App Router) + TS + Tailwind + shadcn/ui, deploy on Vercel.
- wagmi + viem + RainbowKit for wallet/chain.
- ethers v6 for the 0G broker (SDK expects an ethers wallet).
- 0G Compute: `@0gfoundation/0g-compute-ts-sdk` + `openai` (OpenAI-compatible endpoint). 0G Storage SDK for evidence + proof bundle. **The Verdict Card needs `@vercel/og` / `ImageResponse`.**
- Contract: Solidity + Foundry, single `Escrow.sol`.
- **Config (RESOLVED from SDK constants 2026-06-16):** testnet RPC `https://evmrpc-testnet.0g.ai`; **testnet chain id = 16602** (mainnet = 16661; the chainlist "16601" was wrong). `PRIVATE_KEY` env. Faucet for testnet OG.
- **0G Compute SDK:** the package was RENAMED — use `@0gfoundation/0g-compute-ts-sdk` (not the deprecated `@0glabs/0g-serving-broker`). Factory: `createZGComputeNetworkBroker(wallet)`. SDK exposes `InferenceVerifier`, `signData`, `genKeyPair`, `pedersenHash` — verification machinery is exposed client-side (encouraging sign for exportable proofs). Testnet contract addresses (from SDK `CONTRACT_ADDRESSES.testnet`): ledger `0xE70830508dAc0A97e6c087c75f402f9Be669E406`, inference `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E`.

**Docs to check:** broker init/funding (`addLedger`/`transferFund`/`acknowledgeProviderSigner`), `getServiceMetadata`/`getRequestHeaders`/`processResponse`, attestation export (§3 ⚠️), Storage SDK upload+root, available verified models, exact chain id/faucet.

**Two parallel tracks: the GUARANTEED judge demo (works today, no overclaim) + the VIRALITY layer (wins the vote). Plus PRIORITY ZERO: unblock funding.**

- **Day 0 / ongoing — PRIORITY ZERO: clear the 3 OG funding wall.** Ledger creation needs ≥3 OG; faucet drips 0.1/day. DM 0G organizers/DevRel/Discord for a testnet top-up (legit hackathon ask). This unblocks billed inference + the chat-signature path. *Also Day 1: start recruiting Founding Judges — unglamorous DM work, highest leverage (§4b).*

**Guaranteed judge demo (must work today, zero overclaim) — Days 1–4:**
- **Day 1** — Spike already GREEN on attestation (`verifyService` works). Lock stack; wallet connect in Next.js; surface a live attestation report + public RA URL in a throwaway UI.
- **Day 2** — `Escrow.sol` (create/join/resolve/refund/timeout) + Foundry tests; deploy testnet.
- **Day 3** — File-a-case + challenge-accept + escrow UI wired to contract. 0G Storage evidence upload + on-chain input/root commit (the garbage-in fix, §3).
- **Day 4** — Ruling pipeline: deterministic prompt from committed inputs → 0G Compute ruling + `verifyService()` attestation → JSON verdict parse → proof bundle to Storage → resolver writes verdict → auto-payout. One clean end-to-end case. **The honest claim stated precisely + volunteered caveat.**

**Virality / spectacle layer (wins the vote) — Days 4–6:**
- **The Verdict Card** OG-image generator — *highest ROI here, do not cut.*
- **The Arena** public feed + spectator hot-take voting (no wallet to watch).
- **Challenge links.**
- **Leaderboard** (simple/in-memory first).

- **Day 7** — Seed cases, dry-run the Main Event, polish cards, prep the voting ask, **record backup demo video**, README + architecture diagram.

**(In parallel, if funded) — chase real per-response binding:** test `getChatSignatureDownloadLink` + `processResponse` + the `0.9.0-beta` SDK's "centralized provider verification." If it binds responses to the attested signer, UPGRADE the claim. If not, drop silently — the pitch never depended on it. Keep OFF the critical path.

**MVP (must ship):** public case → escrow → on-chain input commit → TEE-attested ruling + live verifiable attestation → auto-payout → Verdict Card + Arena feed.
**Stretch (only if green early):** on-chain spectator staking pool, per-response chat-signature binding, multi-party/N-way, ERC20 stakes, Farcaster frame, ENS names on cards.
**Cut without mercy:** crowd *staking* pool (keep free hot-take voting), leaderboard persistence, multiple recurring events, accounts/auth beyond wallet, mobile-native, appeals, notifications. **Never cut:** escrow→TEE-attested-verdict→payout loop (judges) + the Verdict Card (crowd).

---

## Sources
- 0G Compute Inference docs: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/inference
- Inference SDK: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/sdk
- @0glabs/0g-serving-broker (npm): https://www.npmjs.com/package/@0glabs/0g-serving-broker
- 0g-compute-ts-starter-kit: https://github.com/0gfoundation/0g-compute-ts-starter-kit
- 0G Private Computer / verifiable inference: https://0g.ai/blog/0g-private-computer
- V3 Galileo Testnet: https://0g.ai/blog/introducing-v3-testnet-galileo
- Testnet Overview: https://docs.0g.ai/developer-hub/testnet/testnet-overview
- Polymarket virality teardown: https://indiemarketer.substack.com/p/how-polymarket-cracked-the-viral
- Galxe × 0G Labs ecosystem campaigns: https://blockchainreporter.net/galxe-and-0g-labs-team-up-to-build-powerful-web3-dapps-with-ai-and-blockchain/
- 0G Labs Starboard leaderboard: https://www.rzlt.io/infofi/0g-labs-starboard/

---
*Concept LOCKED 2026-06-16: VERDICT — a public AI courtroom. Spike GREEN on TEE attestation; centralized-provider caveat understood + honestly framed. Next: clear the 3 OG funding wall + build the guaranteed judge demo (escrow → TEE-attested verdict → auto-payout) and the Verdict Card.*
