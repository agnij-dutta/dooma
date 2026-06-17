# VERDICT — Day-1 de-risk spike

Answers the existential question for the project: **does 0G verifiable inference work, and is the attestation EXPORTABLE for third-party verification?** (See Risk #1 in `../SPEC.md`.)

## Run it

```bash
cd spike
npm install
cp .env.example .env      # then paste a funded Galileo testnet PRIVATE_KEY
npm run spike
```

Get a testnet key funded via the **0G faucet** (search "0G Galileo faucet"); the wallet needs a small OG balance so the ledger/inference steps work.

## What it does (and what to read in the output)

Probes the full flow defensively (SDK method names drift across versions, so it tries candidates and dumps every returned shape):

`import SDK → wallet/chain → broker → fund ledger → list providers → acknowledge signer → service metadata → request headers → inference call → processResponse → hunt for exportable attestation`

The output ends with a **SUMMARY**. The line that matters:

```
exportable proof found:   MAYBE / NOT OBVIOUS
```

- If an exportable signature/attestation is found → the "Verify this verdict" button is **real** (third parties verify independently). Build the full trust story.
- If not → verification is **app-internal only** on this network. Decide: demo on mainnet, or be explicit that full third-party verification is a mainnet feature.

## Already confirmed (no key needed)

- 0G compute package was **renamed** → use `@0gfoundation/0g-compute-ts-sdk` (deprecated: `@0glabs/0g-serving-broker`).
- Factory: `createZGComputeNetworkBroker(wallet)`.
- **Testnet chain id = 16602**, mainnet = 16661 (chainlist's "16601" was wrong).
- SDK exposes `InferenceVerifier`, `signData`, `genKeyPair`, `pedersenHash` — verification machinery is client-side, which is encouraging for exportable proofs.
- Testnet contracts: ledger `0xE70830508dAc0A97e6c087c75f402f9Be669E406`, inference `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E`.
