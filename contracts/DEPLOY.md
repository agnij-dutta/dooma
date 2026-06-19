# Deploying VERDICT's Escrow

## Live deployment (0G Galileo testnet · chain 16602)

| | |
|---|---|
| **Escrow** | `0xdFD55C3412a8B4c8B573e4b933c8F24e26d84d1d` |
| Resolver | `0x2f52A107e231d1F63Fc745F5797014cF363E1fd6` (the only address allowed to call `resolve`) |
| Fee recipient | `0x2f52A107e231d1F63Fc745F5797014cF363E1fd6` |
| Fee | 250 bps (2.5%) |
| RPC | `https://evmrpc-testnet.0g.ai` |

The app reads this via `NEXT_PUBLIC_ESCROW_ADDRESS` (already set in `app/.env.example` / `.env.local`).

## Redeploy / deploy fresh

1. `cp .env.example .env` and fill it (see `.env.example`). `DEPLOYER_PRIVATE_KEY` needs a little testnet OG for gas — the **0.1 OG faucet drip is plenty** (this deploy cost ~0.003 OG). No 3 OG ledger required; that's only for the optional verified-inference path.
2. Run:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://evmrpc-testnet.0g.ai --broadcast \
  --priority-gas-price 3000000000 --with-gas-price 5000000000 -vvv
```

   The explicit gas flags matter: 0G testnet enforces a **minimum ~2 gwei priority fee**, and Foundry's auto-estimate sits below it (you'll get `transaction gas price below minimum` without them).

3. Copy the logged `Escrow deployed at:` address into `app/.env.local` → `NEXT_PUBLIC_ESCROW_ADDRESS`, restart the app.

## Resolver key — security

`resolve(id, winner, proofRoot)` is callable **only** by the constructor `resolver` address, and it can pay out **only to a case participant** — never an arbitrary address (enforced in `Escrow.sol`, covered by the test suite). So a leaked resolver key cannot drain funds to a stranger; worst case it picks the wrong winner of a specific case. Still: in production the resolver should be a dedicated backend signer (HSM / KMS), not a shared dev key. For the hackathon it's the throwaway `0x2f52…1fd6`.

## Verification

0G's testnet explorer has no Etherscan-style source verifier wired in the standard Foundry `--verify` flow. To prove the deployed bytecode matches source, compare `forge inspect Escrow bytecode` against `eth_getCode` for the address, or point a Blockscout-compatible verifier at the explorer if/when 0G exposes one.
