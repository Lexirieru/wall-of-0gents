// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IWallAgentNFT } from "../interfaces/IWallAgentNFT.sol";

/// @title WallRegistry
/// @notice UUPS-upgradeable one-shot registry mapping `tokenId` → cross-chain pointers
///         (share token, WallVault on Base, ENS namehash, original operator, mint timestamp).
/// @dev Registration is gated on iNFT ownership at the time of the call. Entries are
///      immutable after registration — operator field preserved even after acquisition.
contract WallRegistry is OwnableUpgradeable, UUPSUpgradeable {
    struct AgentInfo {
        address shareToken;
        address vaultBase;
        bytes32 ensNameHash;
        address operator;
        uint64 createdAt;
    }

    IWallAgentNFT public agentNft;

    mapping(uint256 => AgentInfo) private _info;

    /// @notice Trusted launch factory allowed to register on a creator's behalf
    ///         (the factory holds the iNFT mid-launch, so ownerOf-gated register
    ///         can never be called by the creator afterwards). Appended after
    ///         existing storage — UUPS append-only safe.
    address public factory;

    /// @dev SC-M5: storage gap for future upgrades (appended last — safe).
    uint256[50] private __gap;

    event Registered(
        uint256 indexed tokenId, address shareToken, address vaultBase, bytes32 ensNameHash, address operator
    );
    event FactorySet(address indexed factory);

    error AlreadyRegistered();
    error NotOwner();
    error InvalidConfig();
    error NotFactory();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _agentNft, address initialOwner) external initializer {
        if (_agentNft == address(0)) revert InvalidConfig();
        __Ownable_init(initialOwner);
        agentNft = IWallAgentNFT(_agentNft);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner { }

    /// @notice Set the trusted launch factory. One-time-ish admin wiring.
    function setFactory(address _factory) external onlyOwner {
        if (_factory == address(0)) revert InvalidConfig();
        factory = _factory;
        emit FactorySet(_factory);
    }

    /// @notice Register an agent. Caller must currently own the iNFT.
    function register(uint256 tokenId, address shareToken, address vaultBase, bytes32 ensNameHash) external {
        if (agentNft.ownerOf(tokenId) != msg.sender) revert NotOwner();
        _register(tokenId, shareToken, vaultBase, ensNameHash, msg.sender);
    }

    /// @notice Register on behalf of `operator` (the original creator). Only the
    ///         trusted factory may call this — it holds the iNFT mid-launch so
    ///         the ownerOf-gated `register` is unreachable by the creator.
    function registerFor(
        uint256 tokenId,
        address shareToken,
        address vaultBase,
        bytes32 ensNameHash,
        address operator
    ) external {
        if (msg.sender != factory) revert NotFactory();
        if (operator == address(0)) revert InvalidConfig();
        _register(tokenId, shareToken, vaultBase, ensNameHash, operator);
    }

    function _register(
        uint256 tokenId,
        address shareToken,
        address vaultBase,
        bytes32 ensNameHash,
        address operator
    ) internal {
        if (_info[tokenId].operator != address(0)) revert AlreadyRegistered();
        // M-4: a zero vault is a silent revenue black-hole — reject it.
        if (shareToken == address(0) || vaultBase == address(0)) revert InvalidConfig();

        _info[tokenId] = AgentInfo({
            shareToken: shareToken,
            vaultBase: vaultBase,
            ensNameHash: ensNameHash,
            operator: operator,
            createdAt: uint64(block.timestamp)
        });

        emit Registered(tokenId, shareToken, vaultBase, ensNameHash, operator);
    }

    function info(uint256 tokenId) external view returns (AgentInfo memory) {
        return _info[tokenId];
    }

    function isRegistered(uint256 tokenId) external view returns (bool) {
        return _info[tokenId].operator != address(0);
    }
}
