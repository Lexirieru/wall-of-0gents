// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { MockUSDC } from "../../src/mocks/MockUSDC.sol";

contract MockUSDCTest is Test {
    MockUSDC usdc;
    address alice = makeAddr("alice");

    function setUp() public {
        usdc = new MockUSDC();
    }

    function test_decimals() public view {
        assertEq(usdc.decimals(), 6);
    }

    function test_mint_permissionless() public {
        usdc.mint(alice, 1000e6);
        assertEq(usdc.balanceOf(alice), 1000e6);
    }

    function test_name() public view {
        assertEq(usdc.name(), "USD Coin (Wall testnet)");
    }
}
