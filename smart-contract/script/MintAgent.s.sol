// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { WallAgentNFT } from "../src/nft/WallAgentNFT.sol";

/// @title MintAgent — mints a Wall Agent iNFT on 0G Chain.
/// @dev Required env:
///   AGENT_NFT_0G       — deployed WallAgentNFT proxy address
///   AGENT_TICKER       — short symbol (e.g. "WAGNT")
///   AGENT_ENS_NAME     — e.g. "agent.wall.eth"
///   AGENT_METADATA_URI — URI for off-chain metadata blob
///
/// Run:
///   forge script script/MintAgent.s.sol \
///     --rpc-url $ZG_RPC_URL \
///     --private-key $DEPLOYER_PRIVATE_KEY \
///     --broadcast
contract MintAgent is Script {
    function run() external {
        address agentNftAddr = vm.envAddress("AGENT_NFT_0G");
        string memory ticker = vm.envString("AGENT_TICKER");
        string memory ensNameStr = vm.envString("AGENT_ENS_NAME");
        string memory metadataURI = vm.envString("AGENT_METADATA_URI");

        // Testnet placeholders — deterministic seeds so the operator's verifier
        // can reproduce the same measurement hash off-chain.
        bytes32 metadataHash = keccak256(abi.encodePacked("wall-testnet:", ticker, ":", metadataURI));
        bytes memory sealedKey = abi.encodePacked("wall-testnet-sealed-key:", ticker);
        bytes memory teeAttestation = abi.encodePacked("wall-testnet-tee-attestation:", ticker);

        console.log("=== Wall of 0gents - mint agent ===");
        console.log("agentNft:", agentNftAddr);
        console.log("ticker:  ", ticker);
        console.log("ens:     ", ensNameStr);
        console.log("uri:     ", metadataURI);

        WallAgentNFT nft = WallAgentNFT(agentNftAddr);

        vm.startBroadcast();
        uint256 tokenId = nft.mint(msg.sender, metadataHash, metadataURI, sealedKey, teeAttestation);
        vm.stopBroadcast();

        console.log("minted tokenId:", tokenId);

        string memory key = "wall-mint";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeAddress(key, "owner", msg.sender);
        vm.serializeAddress(key, "agentNft", agentNftAddr);
        vm.serializeString(key, "ticker", ticker);
        vm.serializeString(key, "ensName", ensNameStr);
        vm.serializeString(key, "metadataURI", metadataURI);
        string memory json = vm.serializeUint(key, "tokenId", tokenId);

        string memory path = string.concat("./deployments/agent-", ticker, "-mint.json");
        vm.writeJson(json, path);
        console.log("wrote", path);
    }
}
