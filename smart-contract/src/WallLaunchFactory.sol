// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { WallFractionalizer } from "./shares/WallFractionalizer.sol";
import { WallIPOPush } from "./ipo/WallIPOPush.sol";
import { WallVault } from "./revenue/WallVault.sol";

/// @title WallLaunchFactory
/// @notice One-tx launcher: user sends their iNFT here via safeTransferFrom with
///         encoded LaunchParams → factory fractionalizes, deploys WallVault + WallIPOPush,
///         funds the IPO with the allotted shares, and returns the remainder to the creator.
///
/// Usage from frontend (1 wallet tx):
///   agentNft.safeTransferFrom(user, factory, tokenId, abi.encode(LaunchParams))
contract WallLaunchFactory is IERC721Receiver {
    using SafeERC20 for IERC20;

    struct LaunchParams {
        string shareName;
        string shareSymbol;
        uint256 pricePerShare; // payment asset per 1e18 shares (e.g. 1e6 = $1 USDC)
        uint256 ipoShares;     // share amount allocated to IPO (in 1e18 units)
        uint64  ipoStartsAt;
        uint64  ipoEndsAt;
    }

    struct Launch {
        address shareToken;
        address vault;
        address ipo;
        address creator;
    }

    IERC721 public immutable agentNft;
    WallFractionalizer public immutable fractionalizer;
    IERC20 public immutable paymentAsset;

    mapping(uint256 => Launch) public launches;

    event AgentLaunched(
        uint256 indexed tokenId,
        address indexed creator,
        address shareToken,
        address vault,
        address ipo
    );

    error OnlyAgentNFT();
    error InvalidParams();

    constructor(address _agentNft, address _fractionalizer, address _paymentAsset) {
        agentNft = IERC721(_agentNft);
        fractionalizer = WallFractionalizer(_fractionalizer);
        paymentAsset = IERC20(_paymentAsset);
    }

    /// @notice Called by agentNft when the iNFT arrives. Runs the full launch sequence.
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    )
        external
        override
        returns (bytes4)
    {
        if (msg.sender != address(agentNft)) revert OnlyAgentNFT();

        LaunchParams memory p = abi.decode(data, (LaunchParams));
        if (p.ipoStartsAt >= p.ipoEndsAt) revert InvalidParams();
        if (p.ipoShares == 0 || p.pricePerShare == 0) revert InvalidParams();

        // Allow fractionalizer to pull the NFT from this factory
        agentNft.approve(address(fractionalizer), tokenId);

        // Fractionalize: 1 000 000 shares minted to factory
        address shareToken = fractionalizer.fractionalize(
            tokenId, p.shareName, p.shareSymbol, address(this)
        );
        IERC20 shares = IERC20(shareToken);

        // Deploy revenue vault (receives x402 USDC; holders claim pro-rata)
        WallVault vault = new WallVault(address(paymentAsset), shareToken, tokenId);

        // Deploy push-model IPO (no approval needed — holds shares itself)
        WallIPOPush ipo = new WallIPOPush(
            shareToken,
            address(paymentAsset),
            p.pricePerShare,
            p.ipoShares,
            from,           // creator receives payment proceeds
            p.ipoStartsAt,
            p.ipoEndsAt
        );

        // Fund IPO with its allotted shares
        shares.safeTransfer(address(ipo), p.ipoShares);

        // Return remaining shares to creator
        uint256 remaining = shares.balanceOf(address(this));
        if (remaining > 0) shares.safeTransfer(from, remaining);

        launches[tokenId] = Launch({
            shareToken: shareToken,
            vault:      address(vault),
            ipo:        address(ipo),
            creator:    from
        });

        emit AgentLaunched(tokenId, from, shareToken, address(vault), address(ipo));

        return IERC721Receiver.onERC721Received.selector;
    }
}
