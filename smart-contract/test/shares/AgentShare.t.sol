// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { AgentShare } from "../../src/shares/AgentShare.sol";

contract AgentShareTest is Test {
    AgentShare share;
    address nft = makeAddr("nft");
    address recipient = makeAddr("recipient");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        share = new AgentShare(nft, 1, "Wall Agent Shares", "WAGNT", recipient);
    }

    // ── supply & metadata ─────────────────────────────────────────────────────

    function test_totalSupplyMintedToRecipient() public view {
        assertEq(share.totalSupply(), share.TOTAL_SUPPLY());
        assertEq(share.balanceOf(recipient), share.TOTAL_SUPPLY());
    }

    function test_agentNftAndTokenId() public view {
        assertEq(share.agentNft(), nft);
        assertEq(share.agentTokenId(), 1);
    }

    // ── auto-delegate ─────────────────────────────────────────────────────────

    function test_autoDelegate_onFirstReceive() public view {
        assertEq(share.delegates(recipient), recipient);
    }

    function test_autoDelegate_onTransfer() public {
        vm.prank(recipient);
        share.transfer(alice, 100e18);
        assertEq(share.delegates(alice), alice);
    }

    function test_votingPowerAfterTransfer() public {
        vm.prank(recipient);
        share.transfer(alice, 100e18);
        assertEq(share.getVotes(alice), 100e18);
    }

    // ── historical lookups ────────────────────────────────────────────────────

    function test_getPastVotes() public {
        vm.prank(recipient);
        share.transfer(alice, 500e18);

        uint256 snap = block.number;
        vm.roll(block.number + 1);

        assertEq(share.getPastVotes(alice, snap), 500e18);
    }

    function test_getPastTotalSupply() public {
        uint256 snap = block.number;
        vm.roll(block.number + 1);
        assertEq(share.getPastTotalSupply(snap), share.TOTAL_SUPPLY());
    }

    // ── burn ─────────────────────────────────────────────────────────────────

    function test_burn() public {
        uint256 before = share.totalSupply();
        vm.prank(recipient);
        share.burn(1000e18);
        assertEq(share.totalSupply(), before - 1000e18);
    }

    function test_burnFrom_withAllowance() public {
        vm.prank(recipient);
        share.approve(alice, 1000e18);

        vm.prank(alice);
        share.burnFrom(recipient, 1000e18);
        assertEq(share.balanceOf(recipient), share.TOTAL_SUPPLY() - 1000e18);
    }

    function test_burnFrom_revertsWithoutAllowance() public {
        vm.prank(alice);
        vm.expectRevert();
        share.burnFrom(recipient, 1000e18);
    }
}
