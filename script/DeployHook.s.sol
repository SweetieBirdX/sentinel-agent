// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {SentinelHook} from "../src/SentinelHook.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

/// @title DeployHook
/// @notice Deploys Sentinel Agent system to Sepolia
contract DeployHook is Script {
    uint160 constant REQUIRED_FLAGS =
        uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG);

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address adminAgent = vm.envAddress("ADMIN_AGENT_ADDRESS");

        console2.log("========================================");
        console2.log("SENTINEL AGENT - DEPLOYMENT SCRIPT");
        console2.log("========================================");
        console2.log("Network: Sepolia");
        console2.log("Deployer:", vm.addr(deployerPrivateKey));
        console2.log("PoolManager:", poolManager);
        console2.log("Admin Agent:", adminAgent);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AgentRegistry
        console2.log("Step 1: Deploying AgentRegistry...");
        AgentRegistry registry = new AgentRegistry();
        console2.log("AgentRegistry deployed at:", address(registry));
        console2.log("");

        // 2. Read mined salt
        console2.log("Step 2: Reading mined salt...");
        string memory saltStr = vm.readFile("salt.txt");
        uint256 salt = vm.parseUint(saltStr);
        console2.log("Using salt:", salt);
        console2.log("");

        // 3. Deploy SentinelHook with CREATE2
        console2.log("Step 3: Deploying SentinelHook...");
        SentinelHook hook = new SentinelHook{salt: bytes32(salt)}(IPoolManager(poolManager), address(registry));
        console2.log("SentinelHook deployed at:", address(hook));
        console2.log("");

        // 4. Verify hook address flags
        console2.log("Step 4: Verifying hook address...");
        uint160 addressFlags = uint160(address(hook)) & 0xFFFF;
        console2.log("Address flags:", addressFlags);
        console2.log("Required flags:", REQUIRED_FLAGS);
        require(addressFlags >= REQUIRED_FLAGS, "Invalid hook address flags");
        console2.log("Flags verified!");
        console2.log("");

        // 5. Register admin agent
        console2.log("Step 5: Registering admin agent...");
        registry.registerAgent(adminAgent, "Admin Agent", "Primary administrative agent for Sentinel system");
        console2.log("Admin agent registered:", adminAgent);
        console2.log("");

        // 6. Authorize admin agent in hook
        console2.log("Step 6: Authorizing admin agent in hook...");
        hook.authorizeAgent(adminAgent);
        console2.log("Admin agent authorized in hook");
        console2.log("");

        // 7. Save deployment info
        console2.log("Step 7: Saving deployment addresses...");
        _saveDeployment(address(registry), address(hook), poolManager);

        vm.stopBroadcast();

        console2.log("");
        console2.log("========================================");
        console2.log("DEPLOYMENT COMPLETE!");
        console2.log("========================================");
        console2.log("AgentRegistry:", address(registry));
        console2.log("SentinelHook:", address(hook));
        console2.log("PoolManager:", poolManager);
        console2.log("");
        console2.log("Deployment info saved to: deployments/sepolia.json");
        console2.log("");
        console2.log("Next steps:");
        console2.log("1. Verify contracts on Etherscan");
        console2.log("2. Create test pool with hook");
        console2.log("3. Start agent system (Day 2)");
        console2.log("========================================");
    }

    function _saveDeployment(address registry, address hook, address poolManager) internal {
        string memory json = string(
            abi.encodePacked(
                "{",
                '"network":"sepolia",',
                '"agentRegistry":"',
                vm.toString(registry),
                '",',
                '"sentinelHook":"',
                vm.toString(hook),
                '",',
                '"poolManager":"',
                vm.toString(poolManager),
                '",',
                '"timestamp":',
                vm.toString(block.timestamp),
                "}"
            )
        );

        // Create deployments directory if it doesn't exist
        string[] memory inputs = new string[](3);
        inputs[0] = "mkdir";
        inputs[1] = "-p";
        inputs[2] = "deployments";
        vm.ffi(inputs);

        // Write deployment file
        vm.writeFile("deployments/sepolia.json", json);
    }
}
