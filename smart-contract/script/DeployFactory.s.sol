// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { WallLaunchFactory } from "../src/WallLaunchFactory.sol";

/// @dev Run:
///   forge script script/DeployFactory.s.sol \
///     --rpc-url zg_galileo \
///     --private-key $DEPLOYER_PRIVATE_KEY \
///     --broadcast
contract DeployFactory is Script {
    function run() external {
        address agentNft       = vm.envAddress("WALL_AGENT_NFT");
        address fractionalizer = vm.envAddress("WALL_FRACTIONALIZER");
        address mockUsdc       = vm.envAddress("MOCK_USDC_0G");

        console.log("agentNft:       ", agentNft);
        console.log("fractionalizer: ", fractionalizer);
        console.log("paymentAsset:   ", mockUsdc);

        vm.startBroadcast();
        WallLaunchFactory factory = new WallLaunchFactory(agentNft, fractionalizer, mockUsdc);
        vm.stopBroadcast();

        console.log("WallLaunchFactory:", address(factory));

        _writeArtifact(address(factory));
    }

    function _writeArtifact(address factory) internal {
        string memory key = "factory-deploy";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "agentNft", vm.envAddress("WALL_AGENT_NFT"));
        vm.serializeAddress(key, "fractionalizer", vm.envAddress("WALL_FRACTIONALIZER"));
        vm.serializeAddress(key, "mockUsdc", vm.envAddress("MOCK_USDC_0G"));
        string memory json = vm.serializeAddress(key, "wallLaunchFactory", factory);

        string memory path = "./deployments/zg-factory.json";
        vm.writeJson(json, path);
        console.log("wrote", path);
    }
}
