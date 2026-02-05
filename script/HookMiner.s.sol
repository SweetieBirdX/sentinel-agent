// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {SentinelHook} from "../src/SentinelHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

/// @title HookMiner - Requires EXACT flags only
/// @notice Mines a hook address with EXACT permission flags (no extra bits)
contract HookMiner is Script {
    // Foundry's CREATE2_DEPLOYER used in forge script
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    // Required flags - EXACT MATCH REQUIRED
    // beforeSwap (0x4000) + afterSwap (0x0800) + beforeAddLiquidity (0x0040)
    uint160 constant REQUIRED_FLAGS =
        uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG); // = 0x4840

    // All possible hook flags (to check no extras are set)
    uint160 constant ALL_FLAGS_MASK = uint160(
        Hooks.BEFORE_INITIALIZE_FLAG | Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG
            | Hooks.AFTER_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG | Hooks.AFTER_REMOVE_LIQUIDITY_FLAG
            | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_DONATE_FLAG | Hooks.AFTER_DONATE_FLAG
            | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG
            | Hooks.AFTER_ADD_LIQUIDITY_RETURNS_DELTA_FLAG | Hooks.AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA_FLAG
    );

    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address agentRegistry = vm.envAddress("AGENT_REGISTRY_ADDRESS");

        console2.log("========================================");
        console2.log("SENTINEL AGENT - HOOK ADDRESS MINER v4");
        console2.log("========================================");
        console2.log("Required flags (hex): 0x4840");
        console2.log("CREATE2 Deployer:", CREATE2_DEPLOYER);
        console2.log("PoolManager:", poolManager);
        console2.log("AgentRegistry:", agentRegistry);
        console2.log("");

        // Get creation code
        bytes memory creationCode = type(SentinelHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(poolManager), agentRegistry);
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 bytecodeHash = keccak256(bytecode);

        console2.log("Starting mining (looking for EXACT 0x4840 flags)...");
        console2.log("This may take a while...");
        console2.log("");

        // Mine salt
        uint256 salt = _findSalt(bytecodeHash, CREATE2_DEPLOYER);

        console2.log("");
        console2.log("========================================");
        console2.log("SUCCESS! FOUND VALID SALT");
        console2.log("========================================");
        console2.log("Salt:", salt);

        address hookAddress = _computeAddress(salt, bytecodeHash, CREATE2_DEPLOYER);
        console2.log("Hook Address:", hookAddress);

        uint160 flags = uint160(hookAddress) & ALL_FLAGS_MASK;
        console2.log("Address flags (hex):", uint256(flags));
        console2.log("Required (hex): 0x4840");

        require(flags == REQUIRED_FLAGS, "Flags don't match exactly!");
        console2.log("EXACT flags match!");

        // Save salt
        vm.writeFile("salt.txt", vm.toString(salt));
        console2.log("");
        console2.log("Salt saved to: salt.txt");
        console2.log("========================================");
    }

    function _findSalt(bytes32 bytecodeHash, address deployer) internal view returns (uint256) {
        uint256 salt = 0;
        uint256 maxAttempts = 50000000; // 50 million

        while (salt < maxAttempts) {
            address addr = _computeAddress(salt, bytecodeHash, deployer);
            uint160 flags = uint160(addr) & ALL_FLAGS_MASK;

            // EXACT match - only the required flags, no extras
            if (flags == REQUIRED_FLAGS) {
                console2.log("Found after", salt, "attempts");
                return salt;
            }

            salt++;

            if (salt % 500000 == 0) {
                console2.log("Attempts:", salt);
            }
        }

        revert("Mining failed: No valid address found");
    }

    function _computeAddress(uint256 salt, bytes32 bytecodeHash, address deployer) internal pure returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), deployer, bytes32(salt), bytecodeHash));

        return address(uint160(uint256(hash)));
    }
}
