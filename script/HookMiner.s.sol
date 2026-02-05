// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {SentinelHook} from "../src/SentinelHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

/// @title HookMiner - CORRECTED VERSION
/// @notice Mines a valid hook address with EXACT permission flags
contract HookMiner is Script {
    // Required flags for SentinelHook - MUST MATCH EXACTLY
    uint160 constant REQUIRED_FLAGS =
        uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG); // = 0x4840 = 18496

    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address agentRegistry = vm.envAddress("AGENT_REGISTRY_ADDRESS");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        console2.log("========================================");
        console2.log("SENTINEL AGENT - HOOK ADDRESS MINER v2");
        console2.log("========================================");
        console2.log("Required flags (decimal):", REQUIRED_FLAGS);
        console2.log("Required flags (hex): 0x4840");
        console2.log("Deployer:", deployer);
        console2.log("PoolManager:", poolManager);
        console2.log("AgentRegistry:", agentRegistry);
        console2.log("");

        // Get creation code
        bytes memory creationCode = type(SentinelHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(poolManager), agentRegistry);
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 bytecodeHash = keccak256(bytecode);

        console2.log("Starting mining...");
        console2.log("This may take 30-60 minutes...");
        console2.log("");

        // Mine salt
        uint256 salt = _findSalt(bytecodeHash, deployer);

        console2.log("");
        console2.log("========================================");
        console2.log("SUCCESS! FOUND VALID SALT");
        console2.log("========================================");
        console2.log("Salt:", salt);

        // Compute final address
        address hookAddress = _computeAddress(salt, bytecodeHash, deployer);
        console2.log("Hook Address:", hookAddress);

        // Verify flags EXACTLY
        uint160 addressFlags = uint160(hookAddress);
        uint160 prefix = (addressFlags >> 14) << 14; // Get the permission bits

        console2.log("");
        console2.log("Flag Verification:");
        console2.log("Address (full):", addressFlags);
        console2.log("Address flags (hex):", uint256(addressFlags & 0xFFFF));
        console2.log("Required flags (hex): 0x4840");

        // CRITICAL: Check that the address has EXACTLY the right flags
        require(hasRequiredFlags(hookAddress), "Flag validation failed!");

        console2.log("Flags verified!");

        // Save salt to file
        string memory saltStr = vm.toString(salt);
        vm.writeFile("salt.txt", saltStr);
        console2.log("");
        console2.log("Salt saved to: salt.txt");
        console2.log("Use this salt for deployment!");
        console2.log("========================================");
    }

    function _findSalt(bytes32 bytecodeHash, address deployer) internal view returns (uint256) {
        uint256 salt = 0;
        uint256 maxAttempts = 1000000; // 1 million attempts

        while (salt < maxAttempts) {
            address addr = _computeAddress(salt, bytecodeHash, deployer);

            // Check if this address has the EXACT required flags
            if (hasRequiredFlags(addr)) {
                console2.log("Found after", salt, "attempts");
                return salt;
            }

            salt++;

            if (salt % 10000 == 0) {
                console2.log("Attempts:", salt);
            }
        }

        revert("Mining failed: No valid address found in 1M attempts. Try different deployer.");
    }

    /// @notice Check if address has the exact required flags
    function hasRequiredFlags(address hookAddress) internal pure returns (bool) {
        uint160 addr = uint160(hookAddress);

        // Extract the flag bits (lower 16 bits contain flags)
        uint160 flags = addr & 0xFFFF;

        // For our hook, we need:
        // - BEFORE_SWAP_FLAG (bit 14) = 0x4000
        // - AFTER_SWAP_FLAG (bit 11) = 0x0800
        // - BEFORE_ADD_LIQUIDITY_FLAG (bit 6) = 0x0040
        // Combined: 0x4840

        // Check each required bit is set
        bool hasBeforeSwap = (addr & Hooks.BEFORE_SWAP_FLAG) != 0;
        bool hasAfterSwap = (addr & Hooks.AFTER_SWAP_FLAG) != 0;
        bool hasBeforeAddLiquidity = (addr & Hooks.BEFORE_ADD_LIQUIDITY_FLAG) != 0;

        return hasBeforeSwap && hasAfterSwap && hasBeforeAddLiquidity;
    }

    function _computeAddress(uint256 salt, bytes32 bytecodeHash, address deployer) internal pure returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), deployer, bytes32(salt), bytecodeHash));

        return address(uint160(uint256(hash)));
    }
}
