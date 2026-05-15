// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { WallRegistry } from "../../src/registry/WallRegistry.sol";
import { MockWallAgentNFT } from "../mocks/MockWallAgentNFT.sol";

contract WallRegistryTest is Test {
    WallRegistry registry;
    MockWallAgentNFT nft;

    address owner = makeAddr("owner");
    address operator = makeAddr("operator");
    address alice = makeAddr("alice");

    uint256 TOKEN_ID;

    function setUp() public {
        nft = new MockWallAgentNFT();

        WallRegistry impl = new WallRegistry();
        bytes memory init = abi.encodeCall(WallRegistry.initialize, (address(nft), owner));
        registry = WallRegistry(address(new ERC1967Proxy(address(impl), init)));

        TOKEN_ID = nft.mint(operator, bytes32(0), "", "", "att");
    }

    // ── register ──────────────────────────────────────────────────────────────

    function test_register_storesInfo() public {
        address share = makeAddr("share");
        address vault = makeAddr("vault");
        bytes32 ensHash = keccak256("agent.wall.eth");

        vm.prank(operator);
        registry.register(TOKEN_ID, share, vault, ensHash);

        WallRegistry.AgentInfo memory info = registry.info(TOKEN_ID);
        assertEq(info.shareToken, share);
        assertEq(info.vaultBase, vault);
        assertEq(info.ensNameHash, ensHash);
        assertEq(info.operator, operator);
        assertTrue(info.createdAt > 0);
    }

    function test_register_isRegistered() public {
        assertFalse(registry.isRegistered(TOKEN_ID));
        vm.prank(operator);
        registry.register(TOKEN_ID, makeAddr("share"), makeAddr("vault"), bytes32(0));
        assertTrue(registry.isRegistered(TOKEN_ID));
    }

    function test_register_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(WallRegistry.NotOwner.selector);
        registry.register(TOKEN_ID, makeAddr("share"), address(0), bytes32(0));
    }

    function test_register_revertsIfAlreadyRegistered() public {
        vm.startPrank(operator);
        registry.register(TOKEN_ID, makeAddr("share"), address(0), bytes32(0));
        vm.expectRevert(WallRegistry.AlreadyRegistered.selector);
        registry.register(TOKEN_ID, makeAddr("share2"), address(0), bytes32(0));
        vm.stopPrank();
    }

    function test_register_revertsIfShareTokenZero() public {
        vm.prank(operator);
        vm.expectRevert(WallRegistry.InvalidConfig.selector);
        registry.register(TOKEN_ID, address(0), address(0), bytes32(0));
    }

    // ── operator stays after transfer ─────────────────────────────────────────

    function test_operatorImmutableAfterTransfer() public {
        vm.prank(operator);
        registry.register(TOKEN_ID, makeAddr("share"), address(0), bytes32(0));

        nft.mint(alice, bytes32(0), "", "", "att");
        WallRegistry.AgentInfo memory info = registry.info(TOKEN_ID);
        assertEq(info.operator, operator);
    }

    // ── UUPS upgrade ─────────────────────────────────────────────────────────

    function test_upgradeByOwner() public {
        WallRegistry newImpl = new WallRegistry();
        vm.prank(owner);
        registry.upgradeToAndCall(address(newImpl), "");
    }

    function test_upgradeRevertsIfNotOwner() public {
        WallRegistry newImpl = new WallRegistry();
        vm.prank(alice);
        vm.expectRevert();
        registry.upgradeToAndCall(address(newImpl), "");
    }
}
