// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @dev ENSIP-10 extended resolver.
interface IExtendedResolver {
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory);
}

/// @title WallResolver
/// @notice ENS CCIP-Read (EIP-3668) resolver for `*.wall.eth`.
/// @dev Lives on Sepolia / L1 mainnet. Resolution is delegated to an off-chain
///      gateway worker which signs each response with `gatewaySigner`.
contract WallResolver is IExtendedResolver, Ownable {
    using ECDSA for bytes32;

    error OffchainLookup(
        address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData
    );

    error InvalidSignature();
    error ResponseExpired();
    error EmptyGatewayUrl();

    string public gatewayUrl;
    address public gatewaySigner;

    event GatewayUrlUpdated(string newUrl);
    event GatewaySignerUpdated(address indexed newSigner);

    constructor(string memory _gatewayUrl, address _gatewaySigner, address _owner) Ownable(_owner) {
        if (bytes(_gatewayUrl).length == 0) revert EmptyGatewayUrl();
        if (_gatewaySigner == address(0)) revert ZeroSigner(); // SC-M8
        gatewayUrl = _gatewayUrl;
        gatewaySigner = _gatewaySigner;
    }

    function setGatewayUrl(string calldata newUrl) external onlyOwner {
        if (bytes(newUrl).length == 0) revert EmptyGatewayUrl();
        gatewayUrl = newUrl;
        emit GatewayUrlUpdated(newUrl);
    }

    error ZeroSigner(); // SC-M8

    function setGatewaySigner(address newSigner) external onlyOwner {
        // SC-M8: prevent accidentally locking out the resolver
        if (newSigner == address(0)) revert ZeroSigner();
        gatewaySigner = newSigner;
        emit GatewaySignerUpdated(newSigner);
    }

    /// @inheritdoc IExtendedResolver
    function resolve(bytes calldata name, bytes calldata data) external view override returns (bytes memory) {
        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;

        bytes memory callData = abi.encodeWithSelector(IExtendedResolver.resolve.selector, name, data);

        revert OffchainLookup(
            address(this), urls, callData, this.resolveWithProof.selector, abi.encode(name, data)
        );
    }

    /// @notice Verifies the gateway-signed response and returns the result bytes.
    function resolveWithProof(bytes calldata response, bytes calldata extraData)
        external
        view
        returns (bytes memory)
    {
        (bytes memory result, uint64 expires, bytes memory sig) = abi.decode(response, (bytes, uint64, bytes));

        if (block.timestamp >= expires) revert ResponseExpired();

        // SC-M7: domain-separated digest to prevent cross-chain / cross-contract replay
        bytes32 digest = keccak256(
            abi.encode(block.chainid, address(this), keccak256(extraData), keccak256(result), expires)
        );
        address recovered = ECDSA.recover(digest, sig);
        if (recovered != gatewaySigner) revert InvalidSignature();

        return result;
    }
}
