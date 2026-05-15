// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { IWallAgentNFT } from "../../src/interfaces/IWallAgentNFT.sol";

/// @dev Minimal ERC-7857 mock for testing WallMarket without UUPS proxy overhead.
contract MockWallAgentNFT is ERC721, IWallAgentNFT {
    uint256 private _nextId;

    constructor() ERC721("Mock Wall Agent", "MWAGENT") { }

    function mint(
        address to,
        bytes32,
        string calldata,
        bytes calldata,
        bytes calldata
    ) external returns (uint256 tokenId) {
        unchecked { tokenId = ++_nextId; }
        _mint(to, tokenId);
    }

    function iTransfer(uint256 tokenId, address to, bytes calldata proof) external {
        require(proof.length > 0, "EmptyProof");
        _transfer(ownerOf(tokenId), to, tokenId);
    }

    function iClone(uint256, bytes calldata) external pure returns (uint256) {
        revert("not implemented");
    }

    function authorizeUsage(uint256, address, uint64) external { }
    function revokeUsage(uint256, address) external { }
    function isAuthorized(uint256, address) external pure returns (bool) { return false; }
    function expectedMeasurement(uint256) external pure returns (bytes32) { return bytes32(0); }

    function ownerOf(uint256 tokenId) public view override(ERC721, IWallAgentNFT) returns (address) {
        return super.ownerOf(tokenId);
    }
}
