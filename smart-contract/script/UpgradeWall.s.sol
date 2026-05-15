// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { WallAgentNFT } from "../src/nft/WallAgentNFT.sol";
import { WallMarket } from "../src/market/WallMarket.sol";
import { WallFractionalizer } from "../src/shares/WallFractionalizer.sol";

/// @title UpgradeWall — upgrades 0G-side UUPS proxies to patched implementations.
/// @dev Upgrades WallAgentNFT, WallMarket, WallFractionalizer.
///      WallAgentNFT upgrade encodes setOpenMinting(true) in the same tx.
///
/// Required env vars:
///   ZG_RPC_URL         — 0G Galileo RPC
///   DEPLOYER_PRIVATE_KEY — must be the owner of the proxies
///
/// Run:
///   forge script script/UpgradeWall.s.sol \
///     --rpc-url $ZG_RPC_URL \
///     --private-key $DEPLOYER_PRIVATE_KEY \
///     --broadcast
contract UpgradeWall is Script {
    address constant AGENT_NFT     = 0x4ce1D1E0e9C769221E03e661abBf043cceD84F1f;
    address constant MARKET        = 0x55D7Af35752065C381Af13a5DcDA86e5Fe3f4045;
    address constant FRACTIONALIZER = 0x2c3a47fdF42a795196C80FFf1775920e562284B4;

    function run() external {
        console.log("=== Wall of 0gents - UUPS upgrade ===");
        console.log("chain id:       ", block.chainid);
        console.log("sender:         ", msg.sender);

        vm.startBroadcast();

        // ── WallAgentNFT ──────────────────────────────────────────────────────
        WallAgentNFT agentNftImpl = new WallAgentNFT();
        // setOpenMinting(true) encoded so minting stays open after upgrade
        bytes memory openMintingCall = abi.encodeCall(WallAgentNFT.setOpenMinting, (true));
        WallAgentNFT(AGENT_NFT).upgradeToAndCall(address(agentNftImpl), openMintingCall);
        console.log("agentNftImpl:   ", address(agentNftImpl));

        // ── WallMarket ────────────────────────────────────────────────────────
        WallMarket marketImpl = new WallMarket();
        WallMarket(MARKET).upgradeToAndCall(address(marketImpl), "");
        console.log("marketImpl:     ", address(marketImpl));

        // ── WallFractionalizer ────────────────────────────────────────────────
        WallFractionalizer fracImpl = new WallFractionalizer();
        WallFractionalizer(FRACTIONALIZER).upgradeToAndCall(address(fracImpl), "");
        console.log("fracImpl:       ", address(fracImpl));

        vm.stopBroadcast();

        console.log("=== upgrade complete ===");
    }
}
