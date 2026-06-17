# VERDICT — Day-1 spike findings (2026-06-16)

Ran against 0G Galileo testnet (chain 16602) with a throwaway funded wallet (0.1 OG).
SDK: `@0gfoundation/0g-compute-ts-sdk@0.8.4` (latest stable; `0.9.0-beta.0` exists).

## ✅ Confirmed working (no funded ledger needed)
- SDK import, broker creation, chain detection (testnet=16602).
- `inference.listService()` → **2 live providers**, both `verifiability: TeeML`:
  - `qwen/qwen2.5-omni-7b` (chatbot) @ `0xa48f...7836`
  - `qwen/qwen-image-edit-2511` @ `0x4b2a...4389`
- `inference.verifyService(provider)` runs a **full TEE attestation check client-side** and returns `success:true`:
  - Quote validation ✅, image integrity ✅, Docker compose hash ✅, **TEE signer address match 1/1 ✅**, status VALID.
  - TEE verifier = **dstack v0.5.8** (open source: github.com/Dstack-TEE/dstack); build verifiable via sigstore.
  - Writes `broker_attestation_report.json` (~49 KB): `quote, event_log, report_data, vm_config, tcb_info`. **Exportable + independently verifiable.**
- `inference.getSignerRaDownloadLink(provider)` → a **public, unauthenticated URL** serving the remote-attestation report.

## ⚠️ The critical caveat (reshapes the trust story)
Both currently-listed testnet providers are **`ProviderType: centralized`** (identity "aliyun") — the LLM inference is routed to a **centralized API (e.g. OpenAI) behind the TEE broker**. Hitting the LLM attestation endpoint returns:

> HTTP 501 — "LLM attestation report is not available for centralized providers. This service routes to a centralized API (e.g., OpenAI). Please upgrade your SDK to a version that supports centralized provider verification."

So today, on these providers:
- **Provable:** the request was served by a genuine, verified **TEE broker image** (dstack-attested, exportable). Kills "the operator swapped/forged the serving stack."
- **NOT provable:** that *a specific pinned model produced the exact output, untampered* — because the model runs centralized behind the proxy and the per-inference LLM attestation isn't available.

The full "this exact model produced this exact verdict" guarantee needs **either**: (a) a provider that runs the LLM **inside** the TEE (not `centralized`), **or** (b) the per-response **chat-signature** path working (`getChatSignatureDownloadLink` + `processResponse`), possibly via SDK ≥0.9 with "centralized provider verification."

## 🚧 Funding wall (blocks the remaining test)
- Creating a ledger account requires a **minimum of 3 OG**; the faucet gives **0.1 OG/day**.
- So the actual **billed inference call** + the **chat-signature** path (`getChatSignatureDownloadLink`, `processResponse`) are **untested** — they need a funded (≥3 OG) ledger.

## Verdict on Risk #1 (exportable verifiable inference)
**Partially GREEN.** Exportable, third-party-verifiable TEE attestation exists and works *today* (broker level). Per-response model-output binding is **unconfirmed** on current testnet providers — that's the next thing to test once funded, and it's the difference between "verified serving stack" and the full "verified verdict" pitch.

## Next actions
1. **Get to 3 OG** (multi-faucet / 0G Discord / team ask) → run the funded inference + test `getChatSignatureDownloadLink` + `processResponse`. This decides whether per-verdict signatures are real.
2. Try **`0.9.0-beta.0`** to see if "centralized provider verification" yields per-response proofs.
3. Watch for / request a **non-centralized (LLM-in-TEE) provider** for the strongest claim.
4. Trust-model copy in the demo must match reality: lead with "served by a cryptographically verified TEE" and only claim full output-binding once the chat-signature path is confirmed.
