// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { WallAgentNFT } from "../src/nft/WallAgentNFT.sol";
import { WallMarket } from "../src/market/WallMarket.sol";
import { WallFractionalizer } from "../src/shares/WallFractionalizer.sol";
import { WallRegistry } from "../src/registry/WallRegistry.sol";
import { WallLaunchFactory } from "../src/WallLaunchFactory.sol";

/// @title DeployMainnet — 0G MAINNET deploy with REAL USDC.e. Real-money safe:
///        - hard-refuses any chain that is not 0G mainnet (16661)
///        - NEVER deploys MockUSDC; wires the real USDC.e as paymentAsset
///        - gates minting (setOpenMinting=false) so nobody can mint a fake
///          "verified" agent and rug real buyers (no TEE attestation yet)
///        - fully wires factory/registry/usageOperator so the system is live
///
/// owner = deployer (per operator decision; SINGLE-EOA — accepted residual
/// risk, must be moved to a multisig+timelock ASAP).
///
/// Run:
///   forge script script/DeployMainnet.s.sol --rpc-url https://evmrpc.0g.ai \
///     --private-key $DEPLOYER_PRIVATE_KEY --broadcast --slow --legacy \
///     --with-gas-price 5000000000
contract DeployMainnet is Script {
    uint256 constant ZG_MAINNET = 16661;
    // Verified 0G mainnet USDC.e (symbol USDC.e, 6 decimals).
    address constant USDC_E = 0x1f3AA82227281cA364bFb3d253B0f1af1Da6473E;

    error WrongChain(uint256 got);
    error NoUsdcCode();

    function run() external {
        if (block.chainid != ZG_MAINNET) revert WrongChain(block.chainid);
        if (USDC_E.code.length == 0) revert NoUsdcCode();

        address deployer = msg.sender;
        console.log("=== Wall of 0gents - 0G MAINNET deploy ===");
        console.log("chain id:  ", block.chainid);
        console.log("deployer:  ", deployer);
        console.log("USDC.e:    ", USDC_E);

        vm.startBroadcast();

        WallAgentNFT agentNftImpl = new WallAgentNFT();
        WallAgentNFT agentNft = WallAgentNFT(
            address(new ERC1967Proxy(address(agentNftImpl), abi.encodeCall(WallAgentNFT.initialize, (deployer))))
        );
        // Gate #2: close the permissionless-mint / fake-agent rug vector.
        agentNft.setOpenMinting(false);
        agentNft.setMinter(deployer, true); // curated onboarding by the operator

        WallMarket marketImpl = new WallMarket();
        WallMarket market = WallMarket(
            address(new ERC1967Proxy(address(marketImpl), abi.encodeCall(WallMarket.initialize, (address(agentNft), USDC_E, deployer))))
        );

        WallFractionalizer fracImpl = new WallFractionalizer();
        WallFractionalizer fractionalizer = WallFractionalizer(
            address(new ERC1967Proxy(address(fracImpl), abi.encodeCall(WallFractionalizer.initialize, (address(agentNft), deployer))))
        );

        WallRegistry registryImpl = new WallRegistry();
        WallRegistry registry = WallRegistry(
            address(new ERC1967Proxy(address(registryImpl), abi.encodeCall(WallRegistry.initialize, (address(agentNft), deployer))))
        );

        // Full wiring (mirrors testnet C1/INT-1 setup) so it's live immediately.
        WallLaunchFactory factory =
            new WallLaunchFactory(address(agentNft), address(fractionalizer), USDC_E, address(registry));
        registry.setFactory(address(factory));
        fractionalizer.setUsageOperator(deployer);

        vm.stopBroadcast();

        console.log("usdc(real):    ", USDC_E);
        console.log("agentNft:      ", address(agentNft));
        console.log("market:        ", address(market));
        console.log("fractionalizer:", address(fractionalizer));
        console.log("registry:      ", address(registry));
        console.log("factory:       ", address(factory));

        string memory k = "wall-mainnet";
        vm.serializeUint(k, "chainId", block.chainid);
        vm.serializeAddress(k, "deployer", deployer);
        vm.serializeAddress(k, "usdc", USDC_E);
        vm.serializeAddress(k, "agentNft", address(agentNft));
        vm.serializeAddress(k, "market", address(market));
        vm.serializeAddress(k, "fractionalizer", address(fractionalizer));
        vm.serializeAddress(k, "registry", address(registry));
        string memory json = vm.serializeAddress(k, "wallLaunchFactory", address(factory));
        vm.writeJson(json, "./deployments/zg-mainnet.json");
        console.log("=== mainnet deploy complete ===");
    }
}
