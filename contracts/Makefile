# VERDICT Escrow — build / test / deploy
# Loads variables from .env (copy from .env.example first).
-include .env
export

.PHONY: build test fmt deploy deploy-dry verify abi help

help:
	@echo "make build       - compile contracts"
	@echo "make test         - run the Foundry test suite"
	@echo "make abi          - print the Escrow ABI (forge inspect)"
	@echo "make deploy-dry   - simulate the deploy (no broadcast, no funds)"
	@echo "make deploy       - deploy Escrow to RPC_URL and broadcast (needs funded DEPLOYER_PRIVATE_KEY)"
	@echo "make verify ADDR=0x...  - verify an already-deployed Escrow on the 0G Blockscout explorer"

build:
	forge build

test:
	forge test -vv

fmt:
	forge fmt

abi:
	forge inspect Escrow abi --json

# Dry run — simulates locally, costs nothing, requires no funds.
# Use this NOW (while blocked on funding) to confirm the script is sound.
deploy-dry:
	forge script script/Deploy.s.sol:Deploy --rpc-url $(RPC_URL) -vvvv

# THE ONE COMMAND. Deploys + broadcasts to the 0G Galileo testnet.
# Requires a funded DEPLOYER_PRIVATE_KEY, RESOLVER_ADDRESS, FEE_BPS in .env.
# 0G's Blockscout verifier is attempted automatically; if it is unavailable the
# deploy still succeeds — verify later with `make verify ADDR=<addr>`.
deploy:
	forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(RPC_URL) \
		--broadcast \
		--verify \
		--verifier blockscout \
		--verifier-url $(EXPLORER_API_URL) \
		-vvvv

# Verify a contract that's already on-chain (run separately if --verify above
# was skipped or 0G's explorer was down at deploy time).
# Blockscout needs no API key. Constructor args must match the deployment.
verify:
	forge verify-contract $(ADDR) src/Escrow.sol:Escrow \
		--verifier blockscout \
		--verifier-url $(EXPLORER_API_URL) \
		--constructor-args $$(cast abi-encode "constructor(address,address,uint16)" $(RESOLVER_ADDRESS) $(FEE_RECIPIENT) $(FEE_BPS)) \
		--watch
