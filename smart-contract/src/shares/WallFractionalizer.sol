// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { AgentShare } from "./AgentShare.sol";
import { IWallAgentNFT } from "../interfaces/IWallAgentNFT.sol";

/// @title WallFractionalizer
/// @notice UUPS-upgradeable vault that locks an agent iNFT and mints 1M ERC-20
///         shares representing fractional ownership. Singleton per agent NFT contract
///         on 0G Chain.
contract WallFractionalizer is OwnableUpgradeable, UUPSUpgradeable, IERC721Receiver {
    struct Vault {
        address shareToken;
        address creator;
        bool active;
    }

    IERC721 public agentNft;

    mapping(uint256 => Vault) public vaults;

    /// @notice INT-1: address allowed to push usage grants through this
    ///         contract. Post-launch the fractionalizer OWNS the iNFT, so the
    ///         off-chain operator can't call WallAgentNFT.authorizeUsage
    ///         directly (NotOwnerOrApproved). It calls authorizeUsageFor here
    ///         instead and the fractionalizer (the owner) relays it.
    address public usageOperator;

    /// @dev SC-M5: storage gap for future upgrades (reduced by 1 for usageOperator).
    uint256[49] private __gap;

    event Fractionalized(uint256 indexed tokenId, address shareToken, address indexed creator);
    event Redeemed(uint256 indexed tokenId, address indexed by);
    event UsageOperatorSet(address indexed operator);

    error AlreadyFractionalized();
    error NotFractionalized();
    error NotOwner();
    error NotFullHolder();
    error NotUsageOperator();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _agentNft, address initialOwner) external initializer {
        __Ownable_init(initialOwner);
        agentNft = IERC721(_agentNft);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner { }

    /// @notice Authorize the off-chain operator that may relay usage grants (INT-1).
    function setUsageOperator(address operator) external onlyOwner {
        usageOperator = operator;
        emit UsageOperatorSet(operator);
    }

    /// @notice Relay an iNFT usage grant. The fractionalizer holds the iNFT
    ///         post-launch, so it (and only it) passes WallAgentNFT's
    ///         owner/approved check. Restricted to the configured operator.
    function authorizeUsageFor(uint256 tokenId, address user, uint64 expiresAt) external {
        if (msg.sender != usageOperator) revert NotUsageOperator();
        IWallAgentNFT(address(agentNft)).authorizeUsage(tokenId, user, expiresAt);
    }

    /// @notice Lock `tokenId`, deploy a fresh AgentShare, mint 1M shares to `recipient`.
    function fractionalize(
        uint256 tokenId,
        string calldata shareName,
        string calldata shareSymbol,
        address recipient
    )
        external
        returns (address shareTokenAddr)
    {
        if (vaults[tokenId].active) revert AlreadyFractionalized();
        if (agentNft.ownerOf(tokenId) != msg.sender) revert NotOwner();

        agentNft.safeTransferFrom(msg.sender, address(this), tokenId);

        AgentShare shares =
            new AgentShare(address(agentNft), tokenId, shareName, shareSymbol, recipient);
        shareTokenAddr = address(shares);

        vaults[tokenId] = Vault({ shareToken: shareTokenAddr, creator: msg.sender, active: true });
        emit Fractionalized(tokenId, shareTokenAddr, msg.sender);
    }

    /// @notice Burn 100% of an agent's shares to release the iNFT.
    function redeem(uint256 tokenId) external {
        Vault memory v = vaults[tokenId];
        if (!v.active) revert NotFractionalized();

        AgentShare s = AgentShare(v.shareToken);
        uint256 supply = s.totalSupply();
        if (s.balanceOf(msg.sender) != supply) revert NotFullHolder();

        // Allowance-free burn via the fractionalizer-only hook (SC-C2).
        s.redeemBurn(msg.sender, supply);

        vaults[tokenId].active = false;
        agentNft.safeTransferFrom(address(this), msg.sender, tokenId);
        emit Redeemed(tokenId, msg.sender);
    }
}
