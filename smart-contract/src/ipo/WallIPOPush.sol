// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title WallIPOPush
/// @notice Push-model fixed-price IPO. Shares are pre-loaded into this contract
///         by WallLaunchFactory at deployment, so no `approve` from beneficiary is needed.
///         Buyer sends USDC → payment goes to `beneficiary` (creator), shares come
///         from this contract's own balance.
contract WallIPOPush {
    using SafeERC20 for IERC20;

    IERC20 public immutable shareToken;
    IERC20 public immutable paymentAsset;
    uint256 public immutable pricePerShare;
    uint256 public immutable maxShares;
    address public immutable beneficiary;
    uint64 public immutable startsAt;
    uint64 public immutable endsAt;

    uint256 public sold;

    bool public swept;

    event Bought(address indexed buyer, uint256 amount, uint256 cost);
    event Swept(uint256 amount);

    error InvalidConfig();
    error NotOpen();
    error SoldOut();
    error ZeroAmount();
    error ZeroCost(); // SC-L2
    error NotEnded();
    error NothingToSweep();
    error AlreadySwept();

    constructor(
        address _shareToken,
        address _paymentAsset,
        uint256 _pricePerShare,
        uint256 _maxShares,
        address _beneficiary,
        uint64 _startsAt,
        uint64 _endsAt
    ) {
        if (_shareToken == address(0) || _paymentAsset == address(0) || _beneficiary == address(0)) {
            revert InvalidConfig();
        }
        if (_pricePerShare == 0 || _maxShares == 0) revert InvalidConfig();
        if (_startsAt >= _endsAt) revert InvalidConfig();

        shareToken = IERC20(_shareToken);
        paymentAsset = IERC20(_paymentAsset);
        pricePerShare = _pricePerShare;
        maxShares = _maxShares;
        beneficiary = _beneficiary;
        startsAt = _startsAt;
        endsAt = _endsAt;
    }

    /// @notice Buy `amount` shares (in 1e18 units).
    function buy(uint256 amount) external {
        if (block.timestamp < startsAt || block.timestamp >= endsAt) revert NotOpen();
        if (amount == 0) revert ZeroAmount();
        if (sold + amount > maxShares) revert SoldOut();

        // SC-L2 / ECON-6: round cost UP so split dust-buys can't underpay.
        uint256 cost = (amount * pricePerShare + 1e18 - 1) / 1e18;
        if (cost == 0) revert ZeroCost();
        sold += amount;

        paymentAsset.safeTransferFrom(msg.sender, beneficiary, cost);
        shareToken.safeTransfer(msg.sender, amount);

        emit Bought(msg.sender, amount, cost);
    }

    /// @notice ECON-1: after the sale ends, return unsold shares to the
    ///         creator so they become claimable supply instead of being
    ///         permanently stranded in this contract. Permissionless.
    function sweepUnsold() external {
        if (block.timestamp < endsAt) revert NotEnded();
        if (swept) revert AlreadySwept();
        uint256 left = shareToken.balanceOf(address(this));
        if (left == 0) revert NothingToSweep();
        swept = true;
        shareToken.safeTransfer(beneficiary, left);
        emit Swept(left);
    }

    function available() external view returns (uint256) {
        return maxShares - sold;
    }

    function isOpen() external view returns (bool) {
        return block.timestamp >= startsAt && block.timestamp < endsAt;
    }
}
