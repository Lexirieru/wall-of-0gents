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

    event Bought(address indexed buyer, uint256 amount, uint256 cost);

    error InvalidConfig();
    error NotOpen();
    error SoldOut();
    error ZeroAmount();
    error ZeroCost(); // SC-L2

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

        uint256 cost = (amount * pricePerShare) / 1e18;
        if (cost == 0) revert ZeroCost(); // SC-L2: reject dust buys that round to zero
        sold += amount;

        paymentAsset.safeTransferFrom(msg.sender, beneficiary, cost);
        shareToken.safeTransfer(msg.sender, amount);

        emit Bought(msg.sender, amount, cost);
    }

    function available() external view returns (uint256) {
        return maxShares - sold;
    }

    function isOpen() external view returns (bool) {
        return block.timestamp >= startsAt && block.timestamp < endsAt;
    }
}
