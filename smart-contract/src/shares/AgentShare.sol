// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC20Votes } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import { Nonces } from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title AgentShare
/// @notice ERC-20 fractional shares of a single Wall agent. One AgentShare per agent.
///         Total supply: 1,000,000 × 10^18, minted in full to `recipient` at construction.
/// @dev Uses ERC20Votes historical balance lookups so WallVault can snapshot holders
///      at a given block and distribute pro-rata. Auto-delegates on receive so holders
///      don't need to call `delegate(self)` before earning dividends.
contract AgentShare is ERC20Burnable, ERC20Permit, ERC20Votes {
    uint256 public constant TOTAL_SUPPLY = 1_000_000 * 1e18;

    /// @dev Cross-chain pointer back to the iNFT this share token represents.
    address public immutable agentNft;
    uint256 public immutable agentTokenId;

    constructor(
        address _agentNft,
        uint256 _agentTokenId,
        string memory name_,
        string memory symbol_,
        address recipient
    )
        ERC20(name_, symbol_)
        ERC20Permit(name_)
    {
        agentNft = _agentNft;
        agentTokenId = _agentTokenId;
        _mint(recipient, TOTAL_SUPPLY);
    }

    /// @dev Auto-delegate-to-self on first receive so checkpoints are written without
    ///      a separate `delegate(self)` transaction.
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        if (to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
