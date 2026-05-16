// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { WallVault } from "../src/revenue/WallVault.sol";
import { WallRegistry } from "../src/registry/WallRegistry.sol";

/// @dev Deploys a WallVault for MARKET (token #3) and registers it in WallRegistry.
///      MARKET was fractionalized via the old WallFractionalizer path which did not
///      auto-deploy a revenue vault — this one-time script fixes that.
///
///      Run:
///        forge script script/RegisterMarketVault.s.sol \
///          --rpc-url zg_galileo \
///          --private-key $DEPLOYER_PRIVATE_KEY \
///          --broadcast
contract RegisterMarketVault is Script {
    // 0G Galileo deployed addresses
    address constant MOCK_USDC   = 0x0d837aD954F4f9F06E303A86150ad0F322Ec5EB1;
    address constant REGISTRY    = 0xE26bAFF16B7c6119A05a3D65cf499DE321F67BAB;
    address constant SHARE_TOKEN = 0xF23F5207DDC53AF452c5006792B362a2763CD38f; // MARKET AgentShare
    uint256 constant TOKEN_ID    = 3;

    function run() external {
        console.log("Deploying WallVault for MARKET (token #3)...");
        console.log("  mockUSDC:   ", MOCK_USDC);
        console.log("  shareToken: ", SHARE_TOKEN);
        console.log("  tokenId:    ", TOKEN_ID);
        console.log("  registry:   ", REGISTRY);

        vm.startBroadcast();

        WallVault vault = new WallVault(MOCK_USDC, SHARE_TOKEN, TOKEN_ID, 1 days);
        console.log("WallVault deployed:", address(vault));

        WallRegistry(REGISTRY).register(TOKEN_ID, SHARE_TOKEN, address(vault), bytes32(0));
        console.log("Registered in WallRegistry.");

        vm.stopBroadcast();

        console.log("Done. MARKET agent is now payable via x402.");
    }
}
