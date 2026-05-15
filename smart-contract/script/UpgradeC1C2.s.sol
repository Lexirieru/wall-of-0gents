// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { WallRegistry } from "../src/registry/WallRegistry.sol";
import { WallFractionalizer } from "../src/shares/WallFractionalizer.sol";
import { WallLaunchFactory } from "../src/WallLaunchFactory.sol";

/// @title UpgradeC1C2 — ships the SC-C1/C2/M4 audit fixes.
/// @dev   1. Upgrade WallRegistry impl (adds registerFor/setFactory, rejects vault=0)
///        2. Upgrade WallFractionalizer impl (redeem uses allowance-free redeemBurn)
///        3. Redeploy WallLaunchFactory (new constructor: + registry; calls registerFor)
///        4. WallRegistry.setFactory(newFactory) — authorize the trusted registrar
///
///      Does NOT touch WallAgentNFT / WallMarket (unchanged by these fixes).
///
/// Env: ZG_RPC_URL, DEPLOYER_PRIVATE_KEY (must be proxy owner),
///      WALL_REGISTRY, WALL_FRACTIONALIZER, WALL_AGENT_NFT, MOCK_USDC_0G
///
/// Run:
///   forge script script/UpgradeC1C2.s.sol --rpc-url $ZG_RPC_URL \
///     --private-key $DEPLOYER_PRIVATE_KEY --broadcast
contract UpgradeC1C2 is Script {
    function run() external {
        address registry       = vm.envAddress("WALL_REGISTRY");
        address fractionalizer = vm.envAddress("WALL_FRACTIONALIZER");
        address agentNft        = vm.envAddress("WALL_AGENT_NFT");
        address mockUsdc        = vm.envAddress("MOCK_USDC_0G");

        console.log("chain id:       ", block.chainid);
        console.log("registry:       ", registry);
        console.log("fractionalizer: ", fractionalizer);

        vm.startBroadcast();

        // 1. WallRegistry impl upgrade
        WallRegistry regImpl = new WallRegistry();
        WallRegistry(registry).upgradeToAndCall(address(regImpl), "");
        console.log("registry impl:  ", address(regImpl));

        // 2. WallFractionalizer impl upgrade
        WallFractionalizer fracImpl = new WallFractionalizer();
        WallFractionalizer(fractionalizer).upgradeToAndCall(address(fracImpl), "");
        console.log("frac impl:      ", address(fracImpl));

        // 3. Redeploy WallLaunchFactory with the registry-aware constructor
        WallLaunchFactory factory =
            new WallLaunchFactory(agentNft, fractionalizer, mockUsdc, registry);
        console.log("new factory:    ", address(factory));

        // 4. Authorize the factory as the trusted registrar
        WallRegistry(registry).setFactory(address(factory));
        console.log("registry.factory set");

        vm.stopBroadcast();

        // Persist the new factory address
        string memory key = "c1c2";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "registry", registry);
        vm.serializeAddress(key, "fractionalizer", fractionalizer);
        vm.serializeAddress(key, "registryImpl", address(regImpl));
        vm.serializeAddress(key, "fracImpl", address(fracImpl));
        string memory json = vm.serializeAddress(key, "wallLaunchFactory", address(factory));
        vm.writeJson(json, "./deployments/zg-c1c2.json");
        console.log("=== upgrade complete ===");
    }
}
