// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { ERC1967Proxy } from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import { WallMarket } from "../../src/market/WallMarket.sol";
import { MockWallAgentNFT } from "../mocks/MockWallAgentNFT.sol";
import { MockERC20 } from "../mocks/MockERC20.sol";

contract WallMarketTest is Test {
    WallMarket market;
    MockWallAgentNFT nft;
    MockERC20 usdc;

    address owner = makeAddr("owner");
    address seller = makeAddr("seller");
    address bidder = makeAddr("bidder");
    address bidder2 = makeAddr("bidder2");

    uint256 TOKEN_ID;
    uint64 EXPIRY;

    function setUp() public {
        nft = new MockWallAgentNFT();
        usdc = new MockERC20("USD Coin", "USDC", 6);

        WallMarket impl = new WallMarket();
        bytes memory init = abi.encodeCall(WallMarket.initialize, (address(nft), address(usdc), owner));
        market = WallMarket(address(new ERC1967Proxy(address(impl), init)));

        TOKEN_ID = nft.mint(seller, bytes32(0), "", "", "att");
        EXPIRY = uint64(block.timestamp + 1 days);

        usdc.mint(bidder, 10_000e6);
        usdc.mint(bidder2, 10_000e6);
        vm.prank(bidder);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(bidder2);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(seller);
        nft.approve(address(market), TOKEN_ID);
    }

    // ── postBid ──────────────────────────────────────────────────────────────

    function test_postBid_storesBid() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pubkey", EXPIRY);

        WallMarket.Bid memory b = market.getBid(TOKEN_ID);
        assertEq(b.bidder, bidder);
        assertEq(b.price, 1000e6);
    }

    function test_postBid_escrowsUsdc() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pubkey", EXPIRY);
        assertEq(usdc.balanceOf(address(market)), 1000e6);
    }

    function test_postBid_refundsPriorBidder() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pubkey", EXPIRY);

        uint256 before = usdc.balanceOf(bidder);
        vm.prank(bidder2);
        market.postBid(TOKEN_ID, 2000e6, "pubkey2", EXPIRY);

        assertEq(usdc.balanceOf(bidder), before + 1000e6);
        assertEq(usdc.balanceOf(address(market)), 2000e6);
    }

    function test_postBid_revertsIfPriceTooLow() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pk", EXPIRY);

        vm.prank(bidder2);
        vm.expectRevert(WallMarket.PriceTooLow.selector);
        market.postBid(TOKEN_ID, 999e6, "pk2", EXPIRY);
    }

    function test_postBid_revertsIfPriceZero() public {
        vm.prank(bidder);
        vm.expectRevert(WallMarket.PriceTooLow.selector);
        market.postBid(TOKEN_ID, 0, "pk", EXPIRY);
    }

    function test_postBid_revertsIfExpiryInPast() public {
        vm.prank(bidder);
        vm.expectRevert(WallMarket.InvalidExpiry.selector);
        market.postBid(TOKEN_ID, 1000e6, "pk", uint64(block.timestamp));
    }

    // ── accept ───────────────────────────────────────────────────────────────

    function test_accept_transfersNft() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pk", EXPIRY);

        vm.startPrank(seller);
        nft.setApprovalForAll(address(market), true);
        market.accept(TOKEN_ID, "proof");
        vm.stopPrank();

        assertEq(nft.ownerOf(TOKEN_ID), bidder);
    }

    function test_accept_releasesEscrowToSeller() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pk", EXPIRY);

        uint256 before = usdc.balanceOf(seller);
        vm.startPrank(seller);
        nft.setApprovalForAll(address(market), true);
        market.accept(TOKEN_ID, "proof");
        vm.stopPrank();

        assertEq(usdc.balanceOf(seller), before + 1000e6);
    }

    function test_accept_revertsIfNoBid() public {
        vm.prank(seller);
        vm.expectRevert(WallMarket.NoBid.selector);
        market.accept(TOKEN_ID, "proof");
    }

    function test_accept_revertsIfBidExpired() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pk", EXPIRY);
        vm.warp(EXPIRY + 1);

        vm.prank(seller);
        vm.expectRevert(WallMarket.BidExpired.selector);
        market.accept(TOKEN_ID, "proof");
    }

    function test_accept_revertsIfNotOwner() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pk", EXPIRY);

        vm.prank(bidder2);
        vm.expectRevert(WallMarket.NotOwner.selector);
        market.accept(TOKEN_ID, "proof");
    }

    function test_accept_revertsIfEmptyProof() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pk", EXPIRY);

        vm.prank(seller);
        vm.expectRevert(WallMarket.EmptyProof.selector);
        market.accept(TOKEN_ID, "");
    }

    // ── cancelExpired ────────────────────────────────────────────────────────

    function test_cancelExpired_refundsBidder() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pk", EXPIRY);

        uint256 before = usdc.balanceOf(bidder);
        vm.warp(EXPIRY + 1);
        market.cancelExpired(TOKEN_ID);

        assertEq(usdc.balanceOf(bidder), before + 1000e6);
        assertEq(market.getBid(TOKEN_ID).bidder, address(0));
    }

    function test_cancelExpired_revertsIfNoBid() public {
        vm.expectRevert(WallMarket.NoBid.selector);
        market.cancelExpired(TOKEN_ID);
    }

    function test_cancelExpired_revertsIfNotExpired() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pk", EXPIRY);

        vm.expectRevert(WallMarket.BidNotExpired.selector);
        market.cancelExpired(TOKEN_ID);
    }

    // ── UUPS upgrade ─────────────────────────────────────────────────────────

    function test_upgradeByOwner() public {
        WallMarket newImpl = new WallMarket();
        vm.prank(owner);
        market.upgradeToAndCall(address(newImpl), "");
    }

    function test_upgradeRevertsIfNotOwner() public {
        WallMarket newImpl = new WallMarket();
        vm.prank(seller);
        vm.expectRevert();
        market.upgradeToAndCall(address(newImpl), "");
    }

    // ── SC-M3: minimum out-bid increment ─────────────────────────────────────

    function test_postBid_revertsIfBelowMinIncrement() public {
        vm.prank(bidder);
        market.postBid(TOKEN_ID, 1000e6, "pubkey", EXPIRY);

        // +0.1% is below the 2.5% minimum increment → reject
        vm.prank(bidder2);
        vm.expectRevert(WallMarket.PriceTooLow.selector);
        market.postBid(TOKEN_ID, 1001e6, "pubkey2", EXPIRY);

        // exactly +2.5% is accepted
        vm.prank(bidder2);
        market.postBid(TOKEN_ID, 1025e6, "pubkey2", EXPIRY);
        assertEq(market.getBid(TOKEN_ID).price, 1025e6);
    }
}
