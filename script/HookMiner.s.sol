// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {SentinelHook} from "../src/SentinelHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

/// @title HookMiner
/// @notice Mines a valid hook address with required permission flags
contract HookMiner is Script {
    // Required flags for SentinelHook
    uint160 constant FLAGS = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG); // = 0x4840

    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address agentRegistry = vm.envAddress("AGENT_REGISTRY_ADDRESS");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        console2.log("========================================");
        console2.log("SENTINEL AGENT - HOOK ADDRESS MINER");
        console2.log("========================================");
        console2.log("Target flags:", FLAGS);
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
        console2.log("This may take a few minutes...");
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

        // Verify flags
        uint160 addressFlags = uint160(hookAddress) & 0xFFFF;
        console2.log("Address Flags:", addressFlags);
        require(addressFlags >= FLAGS, "Invalid flags");
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
        uint256 attempts = 0;

        while (salt < 1000000) {
            address addr = _computeAddress(salt, bytecodeHash, deployer);

            if (uint160(addr) & 0xFFFF >= FLAGS) {
                console2.log("Found after", attempts, "attempts");
                return salt;
            }

            salt++;
            attempts++;

            if (attempts % 10000 == 0) {
                console2.log("Attempts:", attempts);
            }
        }

        revert("Mining failed: No valid address found in 1M attempts");
    }

    function _computeAddress(uint256 salt, bytes32 bytecodeHash, address deployer) internal pure returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), deployer, bytes32(salt), bytecodeHash));

        return address(uint160(uint256(hash)));
    }
}
