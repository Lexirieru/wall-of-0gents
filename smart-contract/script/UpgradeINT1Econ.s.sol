// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { WallFractionalizer } from "../src/shares/WallFractionalizer.sol";
import { WallLaunchFactory } from "../src/WallLaunchFactory.sol";
import { WallRegistry } from "../src/registry/WallRegistry.sol";

/// @title UpgradeINT1Econ — ships INT-1 + ECON-1/ECON-2 council fixes.
/// @dev   1. Upgrade WallFractionalizer impl (adds authorizeUsageFor/usageOperator)
///        2. Redeploy WallLaunchFactory (new WallVault reserve+excluded bytecode,
///           WallIPOPush sweepUnsold, vault.setExcluded wiring)
///        3. registry.setFactory(newFactory)
///        4. fractionalizer.setUsageOperator(operator)  [= deployer/operator key]
///
/// Env: ZG_RPC_URL, DEPLOYER_PRIVATE_KEY (proxy owner & backend operator),
///      WALL_REGISTRY, WALL_FRACTIONALIZER, WALL_AGENT_NFT, MOCK_USDC_0G
contract UpgradeINT1Econ is Script {
    function run() external {
        address registry       = vm.envAddress("WALL_REGISTRY");
        address fractionalizer = vm.envAddress("WALL_FRACTIONALIZER");
        address agentNft        = vm.envAddress("WALL_AGENT_NFT");
        address mockUsdc        = vm.envAddress("MOCK_USDC_0G");
        address operator        = vm.addr(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        console.log("chain id:    ", block.chainid);
        console.log("operator:    ", operator);

        vm.startBroadcast();

        WallFractionalizer fracImpl = new WallFractionalizer();
        WallFractionalizer(fractionalizer).upgradeToAndCall(address(fracImpl), "");
        console.log("frac impl:   ", address(fracImpl));

        WallLaunchFactory factory =
            new WallLaunchFactory(agentNft, fractionalizer, mockUsdc, registry);
        console.log("new factory: ", address(factory));

        WallRegistry(registry).setFactory(address(factory));
        WallFractionalizer(fractionalizer).setUsageOperator(operator);
        console.log("registry.factory + frac.usageOperator set");

        vm.stopBroadcast();

        string memory key = "int1econ";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "fracImpl", address(fracImpl));
        vm.serializeAddress(key, "usageOperator", operator);
        string memory json = vm.serializeAddress(key, "wallLaunchFactory", address(factory));
        vm.writeJson(json, "./deployments/zg-int1econ.json");
        console.log("=== upgrade complete ===");
    }
}
