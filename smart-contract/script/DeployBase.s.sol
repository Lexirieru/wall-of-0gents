// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { AgentShare } from "../src/shares/AgentShare.sol";
import { WallVault } from "../src/revenue/WallVault.sol";
import { WallIPO } from "../src/ipo/WallIPO.sol";

/// @title DeployBase — deploys the per-agent Base-side bundle (AgentShare + WallVault + WallIPO).
/// @dev Required env vars:
///   AGENT_NFT_0G       — WallAgentNFT proxy on 0G Chain (cross-chain pointer)
///   AGENT_TOKEN_ID     — uint256 of the freshly-minted iNFT
///   AGENT_TICKER       — short symbol (e.g. "WAGNT")
///   AGENT_NAME         — long name (e.g. "Wall Agent Shares")
///   USDC_BASE          — Circle testnet USDC on Base Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
///   IPO_PRICE          — per-share price in USDC's smallest units (e.g. 1_000_000 = $1.00)
///   IPO_MAX_SHARES     — shares offered (in 18-decimal units, e.g. 300_000 ether)
///   IPO_STARTS_AT      — unix timestamp
///   IPO_ENDS_AT        — unix timestamp
///
/// Optional env vars:
///   AGENT_TREASURY     — beneficiary; defaults to deployer
///
/// Run:
///   forge script script/DeployBase.s.sol \
///     --rpc-url $BASE_RPC_URL \
///     --private-key $DEPLOYER_PRIVATE_KEY \
///     --broadcast
contract DeployBase is Script {
    function run() external {
        address agentNft0g = vm.envAddress("AGENT_NFT_0G");
        uint256 tokenId = vm.envUint("AGENT_TOKEN_ID");
        string memory ticker = vm.envString("AGENT_TICKER");
        string memory agentName = vm.envString("AGENT_NAME");
        address usdc = vm.envAddress("USDC_BASE");
        uint256 ipoPrice = vm.envUint("IPO_PRICE");
        uint256 ipoMaxShares = vm.envUint("IPO_MAX_SHARES");
        uint64 startsAt = uint64(vm.envUint("IPO_STARTS_AT"));
        uint64 endsAt = uint64(vm.envUint("IPO_ENDS_AT"));
        address treasury = vm.envOr("AGENT_TREASURY", msg.sender);

        console.log("=== Wall of 0gents - Base-side deploy ===");
        console.log("chain id:  ", block.chainid);
        console.log("ticker:    ", ticker);
        console.log("agentNft0g:", agentNft0g);
        console.log("tokenId:   ", tokenId);
        console.log("treasury:  ", treasury);

        vm.startBroadcast();

        AgentShare shares = new AgentShare(agentNft0g, tokenId, agentName, ticker, treasury);
        WallVault vault = new WallVault(usdc, address(shares), tokenId);
        WallIPO ipo = new WallIPO(address(shares), usdc, ipoPrice, ipoMaxShares, treasury, startsAt, endsAt);

        if (treasury == msg.sender) {
            shares.approve(address(ipo), ipoMaxShares);
        }

        vm.stopBroadcast();

        console.log("agentShare:  ", address(shares));
        console.log("wallVault:   ", address(vault));
        console.log("wallIPO:     ", address(ipo));

        _writeArtifact(ticker, tokenId, agentNft0g, usdc, treasury, address(shares), address(vault), address(ipo));
    }

    function _writeArtifact(
        string memory ticker,
        uint256 tokenId,
        address agentNft0g,
        address usdc,
        address treasury,
        address shareToken,
        address wallVault,
        address wallIPO
    ) internal {
        string memory key = "wall-base-deploy";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeString(key, "ticker", ticker);
        vm.serializeUint(key, "tokenId", tokenId);
        vm.serializeAddress(key, "agentNft0g", agentNft0g);
        vm.serializeAddress(key, "usdc", usdc);
        vm.serializeAddress(key, "treasury", treasury);
        vm.serializeAddress(key, "agentShare", shareToken);
        vm.serializeAddress(key, "wallVault", wallVault);
        string memory json = vm.serializeAddress(key, "wallIPO", wallIPO);

        string memory path = string.concat("./deployments/base-sepolia-", ticker, ".json");
        vm.writeJson(json, path);
        console.log("wrote", path);
    }
}
