// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";

/// @title VERDICT Escrow deployment script
/// @notice Deploys `Escrow.sol` to the 0G Galileo testnet (chain id 16602).
///
/// @dev Constructor signature (confirmed from src/Escrow.sol):
///        constructor(address resolver_, address feeRecipient_, uint16 feeBps_)
///
///      All deploy parameters are read from the environment so nothing is
///      hard-coded into broadcastable bytecode:
///        - DEPLOYER_PRIVATE_KEY : key that pays gas and becomes msg.sender
///        - RESOLVER_ADDRESS     : the ONLY address allowed to call resolve()
///                                 (the VERDICT backend signer). IMMUTABLE.
///        - FEE_RECIPIENT        : address that collects the protocol fee.
///                                 IMMUTABLE. Optional — defaults to the
///                                 deployer address if unset.
///        - FEE_BPS              : protocol fee in basis points (<= 1000 = 10%).
///                                 IMMUTABLE.
///
///      Usage:
///        forge script script/Deploy.s.sol:Deploy \
///          --rpc-url $RPC_URL --broadcast -vvvv
contract Deploy is Script {
    function run() external returns (Escrow escrow) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address resolver = vm.envAddress("RESOLVER_ADDRESS");
        uint16 feeBps = uint16(vm.envUint("FEE_BPS"));

        // FEE_RECIPIENT is optional; default to the deployer.
        address deployer = vm.addr(deployerKey);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", deployer);

        // --- sanity checks (fail fast, before spending gas) ---
        require(resolver != address(0), "RESOLVER_ADDRESS is zero");
        require(feeRecipient != address(0), "FEE_RECIPIENT is zero");
        require(feeBps <= 1000, "FEE_BPS > MAX_FEE_BPS (1000)");

        console2.log("== VERDICT Escrow deploy ==");
        console2.log("Deployer:     ", deployer);
        console2.log("Resolver:     ", resolver);
        console2.log("FeeRecipient: ", feeRecipient);
        console2.log("FeeBps:       ", feeBps);
        console2.log("ChainId:      ", block.chainid);

        vm.startBroadcast(deployerKey);
        escrow = new Escrow(resolver, feeRecipient, feeBps);
        vm.stopBroadcast();

        console2.log("");
        console2.log(">> Escrow deployed at:", address(escrow));
        console2.log(">> Set NEXT_PUBLIC_ESCROW_ADDRESS to the address above.");
    }
}
