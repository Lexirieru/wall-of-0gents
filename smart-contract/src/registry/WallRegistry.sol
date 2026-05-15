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

    event Registered(
        uint256 indexed tokenId, address shareToken, address vaultBase, bytes32 ensNameHash, address operator
    );

    error AlreadyRegistered();
    error NotOwner();
    error InvalidConfig();

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

    /// @notice Register an agent. Caller must currently own the iNFT.
    function register(uint256 tokenId, address shareToken, address vaultBase, bytes32 ensNameHash) external {
        if (_info[tokenId].operator != address(0)) revert AlreadyRegistered();
        if (agentNft.ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (shareToken == address(0)) revert InvalidConfig();

        _info[tokenId] = AgentInfo({
            shareToken: shareToken,
            vaultBase: vaultBase,
            ensNameHash: ensNameHash,
            operator: msg.sender,
            createdAt: uint64(block.timestamp)
        });

        emit Registered(tokenId, shareToken, vaultBase, ensNameHash, msg.sender);
    }

    function info(uint256 tokenId) external view returns (AgentInfo memory) {
        return _info[tokenId];
    }

    function isRegistered(uint256 tokenId) external view returns (bool) {
        return _info[tokenId].operator != address(0);
    }
}
