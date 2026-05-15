// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { WallAgentNFT } from "../../src/nft/WallAgentNFT.sol";

contract WallAgentNFTTest is Test {
    WallAgentNFT nft;
    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        WallAgentNFT impl = new WallAgentNFT();
        bytes memory init = abi.encodeCall(WallAgentNFT.initialize, (owner));
        nft = WallAgentNFT(address(new ERC1967Proxy(address(impl), init)));
    }

    // ── mint ─────────────────────────────────────────────────────────────────

    function test_mint_returnsIncrementingTokenId() public {
        uint256 id1 = _mint(alice);
        uint256 id2 = _mint(alice);
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_mint_setsOwner() public {
        uint256 id = _mint(alice);
        assertEq(nft.ownerOf(id), alice);
    }

    function test_mint_storesMetadata() public {
        bytes32 hash = keccak256("meta");
        string memory uri = "ipfs://test";
        bytes memory key = "sealed";
        bytes memory att = "attestation";

        vm.prank(alice);
        uint256 id = nft.mint(alice, hash, uri, key, att);

        WallAgentNFT.AgentMetadata memory m = nft.metadata(id);
        assertEq(m.metadataHash, hash);
        assertEq(m.metadataURI, uri);
        assertEq(m.expectedMeasurement, keccak256(att));
    }

    function test_mint_revertsOnZeroAddress() public {
        vm.expectRevert(WallAgentNFT.InvalidConfig.selector);
        nft.mint(address(0), bytes32(0), "", "", "");
    }

    // ── iTransfer ────────────────────────────────────────────────────────────

    function test_iTransfer_movesOwnership() public {
        uint256 id = _mint(alice);
        vm.prank(alice);
        nft.iTransfer(id, bob, "proof");
        assertEq(nft.ownerOf(id), bob);
    }

    function test_iTransfer_bumpsUsageVersion() public {
        uint256 id = _mint(alice);
        assertEq(nft.usageVersion(id), 0);
        vm.prank(alice);
        nft.iTransfer(id, bob, "proof");
        assertEq(nft.usageVersion(id), 1);
    }

    function test_iTransfer_revertsEmptyProof() public {
        uint256 id = _mint(alice);
        vm.prank(alice);
        vm.expectRevert(WallAgentNFT.EmptyProof.selector);
        nft.iTransfer(id, bob, "");
    }

    function test_iTransfer_revertsIfNotOwner() public {
        uint256 id = _mint(alice);
        vm.prank(bob);
        vm.expectRevert(WallAgentNFT.NotOwnerOrApproved.selector);
        nft.iTransfer(id, bob, "proof");
    }

    // ── authorizeUsage / revokeUsage / isAuthorized ───────────────────────────

    function test_authorizeUsage_grantsAccess() public {
        uint256 id = _mint(alice);
        uint64 expiry = uint64(block.timestamp + 1 hours);
        vm.prank(alice);
        nft.authorizeUsage(id, bob, expiry);
        assertTrue(nft.isAuthorized(id, bob));
    }

    function test_isAuthorized_falseAfterExpiry() public {
        uint256 id = _mint(alice);
        uint64 expiry = uint64(block.timestamp + 1);
        vm.prank(alice);
        nft.authorizeUsage(id, bob, expiry);
        vm.warp(block.timestamp + 2);
        assertFalse(nft.isAuthorized(id, bob));
    }

    function test_revokeUsage_removesGrant() public {
        uint256 id = _mint(alice);
        vm.startPrank(alice);
        nft.authorizeUsage(id, bob, uint64(block.timestamp + 1 hours));
        nft.revokeUsage(id, bob);
        vm.stopPrank();
        assertFalse(nft.isAuthorized(id, bob));
    }

    function test_iTransfer_invalidatesGrant() public {
        uint256 id = _mint(alice);
        vm.startPrank(alice);
        nft.authorizeUsage(id, bob, uint64(block.timestamp + 1 hours));
        nft.iTransfer(id, bob, "proof");
        vm.stopPrank();
        assertFalse(nft.isAuthorized(id, alice));
    }

    // ── setMappings ──────────────────────────────────────────────────────────

    function test_setMappings_setsPointers() public {
        uint256 id = _mint(alice);
        address share = makeAddr("share");
        address vault = makeAddr("vault");
        vm.prank(alice);
        nft.setMappings(id, share, vault, "agent.wall.eth");
        assertEq(nft.shareToken(id), share);
        assertEq(nft.revenueVault(id), vault);
    }

    function test_setMappings_revertsIfAlreadySet() public {
        uint256 id = _mint(alice);
        vm.startPrank(alice);
        nft.setMappings(id, makeAddr("s"), makeAddr("v"), "a");
        vm.expectRevert(WallAgentNFT.MappingsAlreadySet.selector);
        nft.setMappings(id, makeAddr("s2"), makeAddr("v2"), "b");
        vm.stopPrank();
    }

    // ── UUPS upgrade ─────────────────────────────────────────────────────────

    function test_upgradeRevertsIfNotOwner() public {
        WallAgentNFT newImpl = new WallAgentNFT();
        vm.prank(alice);
        vm.expectRevert();
        nft.upgradeToAndCall(address(newImpl), "");
    }

    function test_upgradeByOwner() public {
        WallAgentNFT newImpl = new WallAgentNFT();
        vm.prank(owner);
        nft.upgradeToAndCall(address(newImpl), "");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    function _mint(address to) internal returns (uint256) {
        return nft.mint(to, keccak256("h"), "uri", "key", "att");
    }
}
