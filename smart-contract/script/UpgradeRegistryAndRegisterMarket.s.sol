// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { WallRegistry } from "../src/registry/WallRegistry.sol";
import { WallVault } from "../src/revenue/WallVault.sol";

/// @dev Upgrades WallRegistry to add adminRegister, then wires MARKET (token #3).
///      MARKET was fractionalized via the old WallFractionalizer path which locked
///      the iNFT and never called WallRegistry — x402 inference was unreachable.
///
///      Run:
///        forge script script/UpgradeRegistryAndRegisterMarket.s.sol \
///          --rpc-url zg_galileo \
///          --private-key $DEPLOYER_PRIVATE_KEY \
///          --broadcast
contract UpgradeRegistryAndRegisterMarket is Script {
    address constant REGISTRY    = 0xE26bAFF16B7c6119A05a3D65cf499DE321F67BAB;
    address constant MOCK_USDC   = 0x0d837aD954F4f9F06E303A86150ad0F322Ec5EB1;
    address constant SHARE_TOKEN = 0xF23F5207DDC53AF452c5006792B362a2763CD38f; // MARKET AgentShare
    address constant CREATOR     = 0x61638a3bb5449F6dB92EB9B81d858c96cb09Bf21;
    uint256 constant TOKEN_ID    = 3;

    function run() external {
        console.log("=== UpgradeRegistry + RegisterMarket ===");
        console.log("registry:   ", REGISTRY);
        console.log("shareToken: ", SHARE_TOKEN);
        console.log("creator:    ", CREATOR);

        vm.startBroadcast();

        // 1. Deploy new WallRegistry implementation (adds adminRegister)
        WallRegistry registryImpl = new WallRegistry();
        WallRegistry(REGISTRY).upgradeToAndCall(address(registryImpl), "");
        console.log("registryImpl:", address(registryImpl));

        // 2. Deploy WallVault for MARKET
        WallVault vault = new WallVault(MOCK_USDC, SHARE_TOKEN, TOKEN_ID, 1 days);
        console.log("wallVault:  ", address(vault));

        // 3. Register via adminRegister (owner bypass — iNFT locked in WallFractionalizer)
        WallRegistry(REGISTRY).adminRegister(TOKEN_ID, SHARE_TOKEN, address(vault), bytes32(0), CREATOR);
        console.log("Registered MARKET in WallRegistry.");

        vm.stopBroadcast();

        console.log("=== Done. MARKET x402 inference is now live. ===");
    }
}
