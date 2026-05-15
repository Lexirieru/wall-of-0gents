// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IWallAgentNFT } from "../interfaces/IWallAgentNFT.sol";

/// @title WallMarket
/// @notice UUPS-upgradeable whole-iNFT bid/accept flow — the headline acquisition
///         primitive for Wall of 0gents.
/// @dev Bidders escrow USDC by calling `postBid`. The current owner accepts by
///      calling `accept` with a TEE re-encryption proof; the iNFT contract verifies
///      the proof inside `iTransfer`, atomically rotating the sealed key to the
///      acquirer and clearing all `authorizeUsage` grants. On success this contract
///      releases the escrow to the seller.
///
///      Each tokenId tracks a single best bid. A new bid must strictly beat the
///      prior price; the prior bidder is refunded automatically.
contract WallMarket is OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    IWallAgentNFT public agentNft;
    IERC20 public paymentAsset;

    struct Bid {
        address bidder;
        uint256 price;
        uint64 expiresAt;
        bytes bidderPubkey;
    }

    mapping(uint256 => Bid) private _bestBid;

    event BidPosted(uint256 indexed tokenId, address indexed bidder, uint256 price, uint64 expiresAt);
    event BidRefunded(uint256 indexed tokenId, address indexed bidder, uint256 price);
    event Acquired(uint256 indexed tokenId, address indexed acquirer, address indexed seller, uint256 price);

    error PriceTooLow();
    error InvalidExpiry();
    error NoBid();
    error BidExpired();
    error BidNotExpired();
    error NotOwner();
    error EmptyProof();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _agentNft, address _paymentAsset, address initialOwner) external initializer {
        __Ownable_init(initialOwner);
        agentNft = IWallAgentNFT(_agentNft);
        paymentAsset = IERC20(_paymentAsset);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner { }

    /// @notice Post or out-bid the current best bid for `tokenId`.
    function postBid(uint256 tokenId, uint256 price, bytes calldata bidderPubkey, uint64 expiresAt) external {
        if (price == 0) revert PriceTooLow();
        if (expiresAt <= block.timestamp) revert InvalidExpiry();

        Bid memory prev = _bestBid[tokenId];
        if (prev.bidder != address(0) && price <= prev.price) revert PriceTooLow();

        paymentAsset.safeTransferFrom(msg.sender, address(this), price);

        if (prev.bidder != address(0)) {
            paymentAsset.safeTransfer(prev.bidder, prev.price);
            emit BidRefunded(tokenId, prev.bidder, prev.price);
        }

        _bestBid[tokenId] =
            Bid({ bidder: msg.sender, price: price, expiresAt: expiresAt, bidderPubkey: bidderPubkey });
        emit BidPosted(tokenId, msg.sender, price, expiresAt);
    }

    /// @notice Owner of `tokenId` accepts the current best bid.
    function accept(uint256 tokenId, bytes calldata transferValidityProof) external {
        Bid memory b = _bestBid[tokenId];
        if (b.bidder == address(0)) revert NoBid();
        if (block.timestamp >= b.expiresAt) revert BidExpired();
        if (agentNft.ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (transferValidityProof.length == 0) revert EmptyProof();

        delete _bestBid[tokenId];

        agentNft.iTransfer(tokenId, b.bidder, transferValidityProof);

        paymentAsset.safeTransfer(msg.sender, b.price);

        emit Acquired(tokenId, b.bidder, msg.sender, b.price);
    }

    /// @notice Refund an expired bid. Permissionless — anyone can clean up.
    function cancelExpired(uint256 tokenId) external {
        Bid memory b = _bestBid[tokenId];
        if (b.bidder == address(0)) revert NoBid();
        if (block.timestamp < b.expiresAt) revert BidNotExpired();

        delete _bestBid[tokenId];
        paymentAsset.safeTransfer(b.bidder, b.price);
        emit BidRefunded(tokenId, b.bidder, b.price);
    }

    /// @notice Read the current best bid for `tokenId`. Returns zeroed Bid if none.
    function getBid(uint256 tokenId) external view returns (Bid memory) {
        return _bestBid[tokenId];
    }
}
