// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { WallAgentNFT } from "../src/nft/WallAgentNFT.sol";
import { WallMarket } from "../src/market/WallMarket.sol";
import { WallFractionalizer } from "../src/shares/WallFractionalizer.sol";
import { WallRegistry } from "../src/registry/WallRegistry.sol";
import { MockUSDC } from "../src/mocks/MockUSDC.sol";

/// @title DeployWall — deploys the 0G-side UUPS-upgradeable singletons.
/// @dev Run:
///   forge script script/DeployWall.s.sol \
///     --rpc-url $ZG_RPC_URL \
///     --private-key $DEPLOYER_PRIVATE_KEY \
///     --broadcast
///
/// On success, writes deployments/zg-galileo.json with all addresses.
contract DeployWall is Script {
    function run() external {
        uint256 chainId = block.chainid;
        address deployer = msg.sender;
        console.log("=== Wall of 0gents - 0G-side deploy ===");
        console.log("chain id:  ", chainId);
        console.log("deployer:  ", deployer);

        vm.startBroadcast();

        // ── MockUSDC (non-upgradeable testnet stand-in) ──────────────────────
        MockUSDC usdc = new MockUSDC();

        // ── WallAgentNFT (UUPS) ───────────────────────────────────────────────
        WallAgentNFT agentNftImpl = new WallAgentNFT();
        bytes memory agentNftInit = abi.encodeCall(WallAgentNFT.initialize, (deployer));
        WallAgentNFT agentNft = WallAgentNFT(address(new ERC1967Proxy(address(agentNftImpl), agentNftInit)));

        // ── WallMarket (UUPS) ─────────────────────────────────────────────────
        WallMarket marketImpl = new WallMarket();
        bytes memory marketInit = abi.encodeCall(WallMarket.initialize, (address(agentNft), address(usdc), deployer));
        WallMarket market = WallMarket(address(new ERC1967Proxy(address(marketImpl), marketInit)));

        // ── WallFractionalizer (UUPS) ─────────────────────────────────────────
        WallFractionalizer fracImpl = new WallFractionalizer();
        bytes memory fracInit = abi.encodeCall(WallFractionalizer.initialize, (address(agentNft), deployer));
        WallFractionalizer fractionalizer =
            WallFractionalizer(address(new ERC1967Proxy(address(fracImpl), fracInit)));

        // ── WallRegistry (UUPS) ───────────────────────────────────────────────
        WallRegistry registryImpl = new WallRegistry();
        bytes memory registryInit = abi.encodeCall(WallRegistry.initialize, (address(agentNft), deployer));
        WallRegistry registry = WallRegistry(address(new ERC1967Proxy(address(registryImpl), registryInit)));

        vm.stopBroadcast();

        console.log("mockUsdc:       ", address(usdc));
        console.log("agentNft:       ", address(agentNft));
        console.log("market:         ", address(market));
        console.log("fractionalizer: ", address(fractionalizer));
        console.log("registry:       ", address(registry));
        console.log("--- implementations ---");
        console.log("agentNftImpl:   ", address(agentNftImpl));
        console.log("marketImpl:     ", address(marketImpl));
        console.log("fracImpl:       ", address(fracImpl));
        console.log("registryImpl:   ", address(registryImpl));

        _writeArtifact(chainId, deployer, address(usdc), address(agentNft), address(market), address(fractionalizer), address(registry));
    }

    function _writeArtifact(
        uint256 chainId,
        address deployer,
        address usdc,
        address agentNft,
        address market,
        address fractionalizer,
        address registry
    ) internal {
        string memory key = "wall-zg-deploy";
        vm.serializeUint(key, "chainId", chainId);
        vm.serializeAddress(key, "deployer", deployer);
        vm.serializeAddress(key, "mockUsdc", usdc);
        vm.serializeAddress(key, "agentNft", agentNft);
        vm.serializeAddress(key, "market", market);
        vm.serializeAddress(key, "fractionalizer", fractionalizer);
        string memory json = vm.serializeAddress(key, "registry", registry);

        string memory path = "./deployments/zg-galileo.json";
        vm.writeJson(json, path);
        console.log("wrote", path);
    }
}
