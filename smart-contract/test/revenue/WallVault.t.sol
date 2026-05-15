// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { WallVault } from "../../src/revenue/WallVault.sol";
import { AgentShare } from "../../src/shares/AgentShare.sol";
import { MockERC20 } from "../mocks/MockERC20.sol";

contract WallVaultTest is Test {
    WallVault vault;
    AgentShare share;
    MockERC20 usdc;

    address nft = makeAddr("nft");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address keeper = makeAddr("keeper");

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 6);
        share = new AgentShare(nft, 1, "Wall Agent Shares", "WAGNT", alice);
        vault = new WallVault(address(usdc), address(share), 1, 0);

        usdc.mint(keeper, 100_000e6);
        vm.prank(keeper);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ── fund ─────────────────────────────────────────────────────────────────

    function test_fund_depositsUsdc() public {
        vm.prank(keeper);
        vault.fund(1000e6);
        assertEq(usdc.balanceOf(address(vault)), 1000e6);
    }

    // ── snap ─────────────────────────────────────────────────────────────────

    function test_snap_createsSnapshot() public {
        vm.prank(keeper);
        vault.fund(1000e6);

        vm.roll(block.number + 1);
        uint256 snapId = vault.snap();
        assertEq(snapId, 0);
        assertEq(vault.snapshotCount(), 1);
    }

    function test_snap_revertsIfNoBalance() public {
        vm.roll(block.number + 1);
        vm.expectRevert(WallVault.NoBalance.selector);
        vault.snap();
    }

    function test_snap_storesCorrectBalance() public {
        vm.prank(keeper);
        vault.fund(5000e6);
        vm.roll(block.number + 1);
        vault.snap();

        (,uint256 bal,) = vault.snapshotAt(0);
        assertEq(bal, 5000e6);
    }

    // ── pendingFor ────────────────────────────────────────────────────────────

    function test_pendingFor_fullHolder() public {
        vm.prank(keeper);
        vault.fund(1000e6);
        vm.roll(block.number + 1);
        vault.snap();

        uint256 pending = vault.pendingFor(0, alice);
        assertEq(pending, 1000e6);
    }

    function test_pendingFor_splitHolders() public {
        uint256 half = share.TOTAL_SUPPLY() / 2;
        vm.prank(alice);
        share.transfer(bob, half);

        vm.prank(keeper);
        vault.fund(1000e6);
        vm.roll(block.number + 1);
        vault.snap();

        uint256 alicePending = vault.pendingFor(0, alice);
        uint256 bobPending = vault.pendingFor(0, bob);
        assertEq(alicePending, 500e6);
        assertEq(bobPending, 500e6);
    }

    function test_pendingFor_zeroIfNonHolder() public {
        vm.prank(keeper);
        vault.fund(1000e6);
        vm.roll(block.number + 1);
        vault.snap();

        assertEq(vault.pendingFor(0, keeper), 0);
    }

    // ── claim ─────────────────────────────────────────────────────────────────

    function test_claim_transfersUsdc() public {
        vm.prank(keeper);
        vault.fund(1000e6);
        vm.roll(block.number + 1);
        vault.snap();

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.claim(0);
        assertEq(usdc.balanceOf(alice), before + 1000e6);
    }

    function test_claim_revertsIfAlreadyClaimed() public {
        vm.prank(keeper);
        vault.fund(1000e6);
        vm.roll(block.number + 1);
        vault.snap();

        vm.startPrank(alice);
        vault.claim(0);
        vm.expectRevert(WallVault.AlreadyClaimed.selector);
        vault.claim(0);
        vm.stopPrank();
    }

    function test_claim_revertsOnInvalidSnapshot() public {
        vm.expectRevert(WallVault.InvalidSnapshot.selector);
        vault.claim(999);
    }

    // ── distributeTo ─────────────────────────────────────────────────────────

    function test_distributeTo_pushesPayment() public {
        vm.prank(keeper);
        vault.fund(1000e6);
        vm.roll(block.number + 1);
        vault.snap();

        uint256 before = usdc.balanceOf(alice);
        vault.distributeTo(0, alice);
        assertEq(usdc.balanceOf(alice), before + 1000e6);
    }

    function test_distributeTo_isIdempotentAfterClaim() public {
        vm.prank(keeper);
        vault.fund(1000e6);
        vm.roll(block.number + 1);
        vault.snap();

        vm.prank(alice);
        vault.claim(0);

        vm.expectRevert(WallVault.AlreadyClaimed.selector);
        vault.distributeTo(0, alice);
    }

    // ── multiple snapshots ────────────────────────────────────────────────────

    function test_multipleSnapshots_independentClaims() public {
        uint256 before = usdc.balanceOf(alice);

        vm.prank(keeper);
        vault.fund(1000e6);
        vm.roll(block.number + 1);
        vault.snap();

        vm.prank(alice);
        vault.claim(0);

        vm.prank(keeper);
        vault.fund(500e6);
        vm.roll(block.number + 1);
        vault.snap();

        vm.prank(alice);
        vault.claim(1);

        assertEq(usdc.balanceOf(alice), before + 1500e6);
    }
}
