// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { WallIPO } from "../../src/ipo/WallIPO.sol";
import { AgentShare } from "../../src/shares/AgentShare.sol";
import { MockERC20 } from "../mocks/MockERC20.sol";

contract WallIPOTest is Test {
    WallIPO ipo;
    AgentShare share;
    MockERC20 usdc;

    address nft = makeAddr("nft");
    address treasury = makeAddr("treasury");
    address buyer = makeAddr("buyer");
    address buyer2 = makeAddr("buyer2");

    uint256 constant PRICE = 1_000_000; // $1.00 per share (USDC 6 dec)
    uint256 constant MAX_SHARES = 300_000 * 1e18;
    uint64 START;
    uint64 END;

    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 6);
        share = new AgentShare(nft, 1, "Wall Agent Shares", "WAGNT", treasury);

        START = uint64(block.timestamp + 1);
        END = uint64(block.timestamp + 7 days);

        ipo = new WallIPO(address(share), address(usdc), PRICE, MAX_SHARES, treasury, START, END);

        vm.prank(treasury);
        share.approve(address(ipo), MAX_SHARES);

        usdc.mint(buyer, 1_000_000e6);
        usdc.mint(buyer2, 1_000_000e6);
        vm.prank(buyer);
        usdc.approve(address(ipo), type(uint256).max);
        vm.prank(buyer2);
        usdc.approve(address(ipo), type(uint256).max);
    }

    // ── buy ───────────────────────────────────────────────────────────────────

    function test_buy_transfersShares() public {
        vm.warp(START);
        uint256 amount = 1000 * 1e18;
        vm.prank(buyer);
        ipo.buy(amount);
        assertEq(share.balanceOf(buyer), amount);
    }

    function test_buy_transfersUsdcToTreasury() public {
        vm.warp(START);
        uint256 amount = 1000 * 1e18;
        uint256 cost = amount * PRICE / 1e18;

        uint256 before = usdc.balanceOf(treasury);
        vm.prank(buyer);
        ipo.buy(amount);
        assertEq(usdc.balanceOf(treasury), before + cost);
    }

    function test_buy_incrementsSold() public {
        vm.warp(START);
        uint256 amount = 500 * 1e18;
        vm.prank(buyer);
        ipo.buy(amount);
        assertEq(ipo.sold(), amount);
    }

    function test_buy_revertsBeforeStart() public {
        vm.prank(buyer);
        vm.expectRevert(WallIPO.NotOpen.selector);
        ipo.buy(1e18);
    }

    function test_buy_revertsAfterEnd() public {
        vm.warp(END);
        vm.prank(buyer);
        vm.expectRevert(WallIPO.NotOpen.selector);
        ipo.buy(1e18);
    }

    function test_buy_revertsZeroAmount() public {
        vm.warp(START);
        vm.prank(buyer);
        vm.expectRevert(WallIPO.ZeroAmount.selector);
        ipo.buy(0);
    }

    function test_buy_revertsIfSoldOut() public {
        vm.warp(START);
        vm.prank(buyer);
        ipo.buy(MAX_SHARES);

        vm.prank(buyer2);
        vm.expectRevert(WallIPO.SoldOut.selector);
        ipo.buy(1e18);
    }

    // ── view helpers ─────────────────────────────────────────────────────────

    function test_available() public view {
        assertEq(ipo.available(), MAX_SHARES);
    }

    function test_available_decreasesAfterBuy() public {
        vm.warp(START);
        vm.prank(buyer);
        ipo.buy(1000 * 1e18);
        assertEq(ipo.available(), MAX_SHARES - 1000 * 1e18);
    }

    function test_isOpen_trueWithinWindow() public {
        vm.warp(START);
        assertTrue(ipo.isOpen());
    }

    function test_isOpen_falseBeforeStart() public view {
        assertFalse(ipo.isOpen());
    }

    function test_isOpen_falseAfterEnd() public {
        vm.warp(END);
        assertFalse(ipo.isOpen());
    }

    // ── constructor validation ────────────────────────────────────────────────

    function test_constructor_revertsIfStartGeEnd() public {
        vm.expectRevert(WallIPO.InvalidConfig.selector);
        new WallIPO(address(share), address(usdc), PRICE, MAX_SHARES, treasury, END, START);
    }

    function test_constructor_revertsIfZeroPrice() public {
        vm.expectRevert(WallIPO.InvalidConfig.selector);
        new WallIPO(address(share), address(usdc), 0, MAX_SHARES, treasury, START, END);
    }
}
