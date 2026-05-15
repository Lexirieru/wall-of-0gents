// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AgentShare } from "../shares/AgentShare.sol";

/// @title WallVault
/// @notice Holds USDC paid by subscribers and distributes pro-rata to shareholders.
///         Lives on Base (where x402 settles); the AgentShare is on the same chain.
/// @dev Snapshot model:
///        - `snap()` records the vault's USDC balance plus a past block.number as
///          the timepoint at which holder shares are read.
///        - Storing `block.number - 1` guarantees the ERC20Votes lookup is strictly
///          in the past — `getPastVotes` reverts for the current block.
///      Rounding: integer division. Dust stays in the vault and rolls to next snapshot.
contract WallVault {
    using SafeERC20 for IERC20;

    IERC20 public immutable paymentAsset;
    AgentShare public immutable shareToken;
    uint256 public immutable agentTokenId;

    struct Snapshot {
        uint256 timepoint;
        uint256 balanceAtSnapshot;
        uint64 ts;
    }

    Snapshot[] private _snapshots;

    mapping(uint256 => mapping(address => bool)) public claimedAt;

    event Received(uint256 amount, address indexed from);
    event Snapped(uint256 indexed snapshotId, uint256 timepoint, uint256 balance);
    event Distributed(uint256 indexed snapshotId, address indexed holder, uint256 amount);

    /// @notice SC-H2: minimum seconds between consecutive snaps (0 = no limit).
    uint256 public immutable snapMinInterval;
    uint256 private _lastSnapTime;

    error NoBalance();
    error AlreadyClaimed();
    error InvalidSnapshot();
    error SnapTooSoon(); // SC-H2

    constructor(address _paymentAsset, address _shareToken, uint256 _agentTokenId, uint256 _snapMinInterval) {
        paymentAsset = IERC20(_paymentAsset);
        shareToken = AgentShare(_shareToken);
        agentTokenId = _agentTokenId;
        snapMinInterval = _snapMinInterval;
    }

    /// @notice Explicitly fund the vault (also receives funds passively from x402 settlement).
    function fund(uint256 amount) external {
        paymentAsset.safeTransferFrom(msg.sender, address(this), amount);
        emit Received(amount, msg.sender);
    }

    /// @notice Capture current vault balance into a new snapshot. Permissionless.
    function snap() external returns (uint256 snapshotId) {
        uint256 bal = paymentAsset.balanceOf(address(this));
        if (bal == 0) revert NoBalance();
        // SC-H2: rate-limit snaps to prevent snapshot spam / manipulation
        if (snapMinInterval > 0 && block.timestamp < _lastSnapTime + snapMinInterval) revert SnapTooSoon();

        uint256 timepoint = block.number - 1;

        _lastSnapTime = block.timestamp;
        snapshotId = _snapshots.length;
        _snapshots.push(Snapshot({ timepoint: timepoint, balanceAtSnapshot: bal, ts: uint64(block.timestamp) }));

        emit Snapped(snapshotId, timepoint, bal);
    }

    function snapshotCount() external view returns (uint256) {
        return _snapshots.length;
    }

    function snapshotAt(uint256 snapshotId)
        external
        view
        returns (uint256 timepoint, uint256 balanceAtSnapshot, uint64 ts)
    {
        if (snapshotId >= _snapshots.length) revert InvalidSnapshot();
        Snapshot memory s = _snapshots[snapshotId];
        return (s.timepoint, s.balanceAtSnapshot, s.ts);
    }

    /// @notice Compute the holder's pro-rata claim for a snapshot.
    function pendingFor(uint256 snapshotId, address holder) public view returns (uint256) {
        if (snapshotId >= _snapshots.length) revert InvalidSnapshot();
        if (claimedAt[snapshotId][holder]) return 0;

        Snapshot memory s = _snapshots[snapshotId];
        uint256 holderShares = shareToken.getPastVotes(holder, s.timepoint);
        uint256 totalShares = shareToken.getPastTotalSupply(s.timepoint);
        if (holderShares == 0 || totalShares == 0) return 0;

        return s.balanceAtSnapshot * holderShares / totalShares;
    }

    /// @notice Holder pulls their pro-rata payout for a single snapshot.
    function claim(uint256 snapshotId) external {
        _settle(snapshotId, msg.sender);
    }

    /// @notice KeeperHub (or anyone) pushes a holder's pro-rata payout.
    function distributeTo(uint256 snapshotId, address holder) external {
        _settle(snapshotId, holder);
    }

    function _settle(uint256 snapshotId, address holder) internal {
        if (snapshotId >= _snapshots.length) revert InvalidSnapshot();
        if (claimedAt[snapshotId][holder]) revert AlreadyClaimed();

        Snapshot memory s = _snapshots[snapshotId];
        uint256 holderShares = shareToken.getPastVotes(holder, s.timepoint);
        uint256 totalShares = shareToken.getPastTotalSupply(s.timepoint);

        // SC-H3: early return without marking claimed — zero-share holders should not
        // permanently lose their claim slot in case of a future share correction.
        if (holderShares == 0 || totalShares == 0) return;

        uint256 amount = s.balanceAtSnapshot * holderShares / totalShares;
        if (amount == 0) return;

        claimedAt[snapshotId][holder] = true;
        paymentAsset.safeTransfer(holder, amount);
        emit Distributed(snapshotId, holder, amount);
    }
}
