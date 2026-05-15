// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IWallAgentNFT } from "../interfaces/IWallAgentNFT.sol";

/// @title WallAgentNFT
/// @notice UUPS-upgradeable ERC-7857 implementation for Wall of 0gents.
///         ERC-721 + per-token sealed metadata, per-user usage authorizations
///         that auto-clear on transfer, and an `iTransfer` entry point that
///         WallMarket calls during acquisition.
/// @dev Sealed key re-encryption proof is a testnet placeholder (non-empty proof
///      is trusted). Full ERC-7857 quote verification lands when forking 0gfoundation/0g-agent-nft.
contract WallAgentNFT is ERC721Upgradeable, OwnableUpgradeable, UUPSUpgradeable, IWallAgentNFT {
    struct AgentMetadata {
        bytes32 metadataHash;
        string metadataURI;
        bytes sealedKey;
        bytes32 expectedMeasurement;
    }

    uint256 private _nextId;

    mapping(uint256 => AgentMetadata) private _meta;

    /// @dev tokenId → counter incremented on every successful transfer.
    ///      Combined with `_grantedAtVersion` this cheaply invalidates all
    ///      outstanding authorizeUsage grants in O(1).
    mapping(uint256 => uint64) public usageVersion;

    mapping(uint256 => mapping(address => uint64)) private _grantedAtVersion;
    mapping(uint256 => mapping(address => uint64)) private _grantExpiresAt;

    /// @notice Wall-specific cross-chain pointers, set once per token.
    mapping(uint256 => address) public shareToken;
    mapping(uint256 => address) public revenueVault;
    mapping(uint256 => string) public ensName;

    error EmptyProof();
    error NotOwnerOrApproved();
    error InvalidConfig();
    error MappingsAlreadySet();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) external initializer {
        __ERC721_init("Wall Agent", "WAGENT");
        __Ownable_init(initialOwner);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner { }

    // ─── ERC-7857 surface ─────────────────────────────────────────────────

    /// @inheritdoc IWallAgentNFT
    function mint(
        address to,
        bytes32 metadataHash,
        string calldata metadataURI,
        bytes calldata sealedKey,
        bytes calldata teeAttestation
    ) external returns (uint256 tokenId) {
        if (to == address(0)) revert InvalidConfig();

        unchecked {
            tokenId = ++_nextId;
        }

        bytes32 measurement = keccak256(teeAttestation);

        _meta[tokenId] = AgentMetadata({
            metadataHash: metadataHash,
            metadataURI: metadataURI,
            sealedKey: sealedKey,
            expectedMeasurement: measurement
        });

        _safeMint(to, tokenId);
        emit MetadataUpdated(tokenId, metadataURI);
    }

    /// @inheritdoc IWallAgentNFT
    function iTransfer(uint256 tokenId, address to, bytes calldata transferValidityProof) external {
        if (transferValidityProof.length == 0) revert EmptyProof();
        address owner = _ownerOf(tokenId);
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender) && getApproved(tokenId) != msg.sender) {
            revert NotOwnerOrApproved();
        }

        unchecked {
            usageVersion[tokenId]++;
        }

        _update(to, tokenId, address(0));
    }

    /// @inheritdoc IWallAgentNFT
    function iClone(uint256, bytes calldata) external pure returns (uint256) {
        revert("WallAgentNFT: iClone not implemented on testnet");
    }

    /// @inheritdoc IWallAgentNFT
    function authorizeUsage(uint256 tokenId, address user, uint64 expiresAt) external {
        _checkApprovedOrOwner(tokenId);
        _grantedAtVersion[tokenId][user] = usageVersion[tokenId];
        _grantExpiresAt[tokenId][user] = expiresAt;
        emit UsageAuthorized(tokenId, user, expiresAt);
    }

    /// @inheritdoc IWallAgentNFT
    function revokeUsage(uint256 tokenId, address user) external {
        _checkApprovedOrOwner(tokenId);
        delete _grantedAtVersion[tokenId][user];
        delete _grantExpiresAt[tokenId][user];
        emit UsageRevoked(tokenId, user);
    }

    function _checkApprovedOrOwner(uint256 tokenId) internal view {
        address owner = _ownerOf(tokenId);
        if (
            msg.sender != owner
                && !isApprovedForAll(owner, msg.sender)
                && getApproved(tokenId) != msg.sender
        ) {
            revert NotOwnerOrApproved();
        }
    }

    /// @inheritdoc IWallAgentNFT
    function isAuthorized(uint256 tokenId, address user) external view returns (bool) {
        if (_grantedAtVersion[tokenId][user] != usageVersion[tokenId]) return false;
        return _grantExpiresAt[tokenId][user] > block.timestamp;
    }

    /// @inheritdoc IWallAgentNFT
    function expectedMeasurement(uint256 tokenId) external view returns (bytes32) {
        return _meta[tokenId].expectedMeasurement;
    }

    // ─── Wall extensions ──────────────────────────────────────────────────

    /// @notice Pin cross-chain pointers for a token. One-shot; only current owner may call.
    function setMappings(
        uint256 tokenId,
        address _shareToken,
        address _revenueVault,
        string calldata _ensName
    ) external {
        if (_ownerOf(tokenId) != msg.sender) revert NotOwnerOrApproved();
        if (shareToken[tokenId] != address(0)) revert MappingsAlreadySet();
        shareToken[tokenId] = _shareToken;
        revenueVault[tokenId] = _revenueVault;
        ensName[tokenId] = _ensName;
    }

    function metadata(uint256 tokenId) external view returns (AgentMetadata memory) {
        return _meta[tokenId];
    }

    // ─── Resolve ownerOf collision (ERC721Upgradeable + IWallAgentNFT) ───

    function ownerOf(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, IWallAgentNFT)
        returns (address)
    {
        return super.ownerOf(tokenId);
    }
}
