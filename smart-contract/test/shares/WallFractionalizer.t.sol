// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { WallFractionalizer } from "../../src/shares/WallFractionalizer.sol";
import { AgentShare } from "../../src/shares/AgentShare.sol";
import { MockWallAgentNFT } from "../mocks/MockWallAgentNFT.sol";

contract WallFractionalizerTest is Test {
    WallFractionalizer frac;
    MockWallAgentNFT nft;

    address owner = makeAddr("owner");
    address creator = makeAddr("creator");
    address alice = makeAddr("alice");

    uint256 TOKEN_ID;

    function setUp() public {
        nft = new MockWallAgentNFT();

        WallFractionalizer impl = new WallFractionalizer();
        bytes memory init = abi.encodeCall(WallFractionalizer.initialize, (address(nft), owner));
        frac = WallFractionalizer(address(new ERC1967Proxy(address(impl), init)));

        TOKEN_ID = nft.mint(creator, bytes32(0), "", "", "att");
        vm.prank(creator);
        nft.approve(address(frac), TOKEN_ID);
    }

    // ── fractionalize ─────────────────────────────────────────────────────────

    function test_fractionalize_locksNft() public {
        vm.prank(creator);
        frac.fractionalize(TOKEN_ID, "Wall Agent Shares", "WAGNT", creator);
        assertEq(nft.ownerOf(TOKEN_ID), address(frac));
    }

    function test_fractionalize_mintsShares() public {
        vm.prank(creator);
        address shareAddr = frac.fractionalize(TOKEN_ID, "Wall Agent Shares", "WAGNT", creator);
        AgentShare share = AgentShare(shareAddr);
        assertEq(share.balanceOf(creator), share.TOTAL_SUPPLY());
    }

    function test_fractionalize_storesVault() public {
        vm.prank(creator);
        address shareAddr = frac.fractionalize(TOKEN_ID, "WAS", "WAGNT", creator);
        (address st,, bool active) = frac.vaults(TOKEN_ID);
        assertEq(st, shareAddr);
        assertTrue(active);
    }

    function test_fractionalize_revertsIfAlreadyFractionalized() public {
        vm.startPrank(creator);
        frac.fractionalize(TOKEN_ID, "WAS", "WAGNT", creator);
        vm.expectRevert(WallFractionalizer.AlreadyFractionalized.selector);
        frac.fractionalize(TOKEN_ID, "WAS", "WAGNT", creator);
        vm.stopPrank();
    }

    function test_fractionalize_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(WallFractionalizer.NotOwner.selector);
        frac.fractionalize(TOKEN_ID, "WAS", "WAGNT", alice);
    }

    // ── redeem ────────────────────────────────────────────────────────────────

    function test_redeem_unlocksNft() public {
        vm.prank(creator);
        address shareAddr = frac.fractionalize(TOKEN_ID, "WAS", "WAGNT", creator);
        AgentShare share = AgentShare(shareAddr);

        vm.startPrank(creator);
        share.approve(address(frac), share.totalSupply());
        frac.redeem(TOKEN_ID);
        vm.stopPrank();

        assertEq(nft.ownerOf(TOKEN_ID), creator);
    }

    function test_redeem_burnsAllShares() public {
        vm.prank(creator);
        address shareAddr = frac.fractionalize(TOKEN_ID, "WAS", "WAGNT", creator);
        AgentShare share = AgentShare(shareAddr);
        uint256 supply = share.totalSupply();

        vm.startPrank(creator);
        share.approve(address(frac), supply);
        frac.redeem(TOKEN_ID);
        vm.stopPrank();

        assertEq(share.totalSupply(), 0);
    }

    function test_redeem_revertsIfNotFractionalized() public {
        vm.prank(creator);
        vm.expectRevert(WallFractionalizer.NotFractionalized.selector);
        frac.redeem(TOKEN_ID);
    }

    function test_redeem_revertsIfNotFullHolder() public {
        vm.prank(creator);
        address shareAddr = frac.fractionalize(TOKEN_ID, "WAS", "WAGNT", creator);
        AgentShare share = AgentShare(shareAddr);

        vm.prank(creator);
        share.transfer(alice, 1e18);

        vm.startPrank(creator);
        share.approve(address(frac), share.totalSupply());
        vm.expectRevert(WallFractionalizer.NotFullHolder.selector);
        frac.redeem(TOKEN_ID);
        vm.stopPrank();
    }

    // ── UUPS upgrade ─────────────────────────────────────────────────────────

    function test_upgradeByOwner() public {
        WallFractionalizer newImpl = new WallFractionalizer();
        vm.prank(owner);
        frac.upgradeToAndCall(address(newImpl), "");
    }

    function test_upgradeRevertsIfNotOwner() public {
        WallFractionalizer newImpl = new WallFractionalizer();
        vm.prank(alice);
        vm.expectRevert();
        frac.upgradeToAndCall(address(newImpl), "");
    }
}
