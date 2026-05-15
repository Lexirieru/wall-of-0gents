// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { WallMarket } from "../src/market/WallMarket.sol";
import { WallRegistry } from "../src/registry/WallRegistry.sol";
import { WallLaunchFactory } from "../src/WallLaunchFactory.sol";

/// @title UpgradeResidual — ships SC-M3/M5/L2 residual fixes.
/// @dev   1. Upgrade WallMarket impl (min out-bid increment, SC-M3)
///        2. Upgrade WallRegistry impl (storage __gap, SC-M5)
///        3. Redeploy WallLaunchFactory (picks up WallIPOPush ceil-div, SC-L2)
///        4. registry.setFactory(newFactory)
///
/// Env: ZG_RPC_URL, DEPLOYER_PRIVATE_KEY (proxy owner),
///      WALL_REGISTRY, WALL_MARKET, WALL_FRACTIONALIZER, WALL_AGENT_NFT, MOCK_USDC_0G
contract UpgradeResidual is Script {
    function run() external {
        address registry       = vm.envAddress("WALL_REGISTRY");
        address market         = vm.envAddress("WALL_MARKET");
        address fractionalizer = vm.envAddress("WALL_FRACTIONALIZER");
        address agentNft        = vm.envAddress("WALL_AGENT_NFT");
        address mockUsdc        = vm.envAddress("MOCK_USDC_0G");

        console.log("chain id:", block.chainid);

        vm.startBroadcast();

        WallMarket marketImpl = new WallMarket();
        WallMarket(market).upgradeToAndCall(address(marketImpl), "");
        console.log("market impl:  ", address(marketImpl));

        WallRegistry regImpl = new WallRegistry();
        WallRegistry(registry).upgradeToAndCall(address(regImpl), "");
        console.log("registry impl:", address(regImpl));

        WallLaunchFactory factory =
            new WallLaunchFactory(agentNft, fractionalizer, mockUsdc, registry);
        WallRegistry(registry).setFactory(address(factory));
        console.log("new factory:  ", address(factory));

        vm.stopBroadcast();

        string memory key = "residual";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "marketImpl", address(marketImpl));
        vm.serializeAddress(key, "registryImpl", address(regImpl));
        string memory json = vm.serializeAddress(key, "wallLaunchFactory", address(factory));
        vm.writeJson(json, "./deployments/zg-residual.json");
        console.log("=== upgrade complete ===");
    }
}
