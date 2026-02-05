// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {SentinelHook} from "../src/SentinelHook.sol";

/// @title CreatePool
/// @notice Creates test pool with SentinelHook on Sepolia
contract CreatePool is Script {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    // Sepolia addresses (update as needed)
    address constant WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");

        // Load hook address from deployment
        string memory deploymentFile = vm.readFile("deployments/sepolia.json");
        // Parse JSON to get hook address (simplified)
        address hookAddress = vm.envAddress("HOOK_ADDRESS"); // Set in .env after deployment

        console2.log("========================================");
        console2.log("CREATING TEST POOL");
        console2.log("========================================");
        console2.log("PoolManager:", poolManager);
        console2.log("Hook:", hookAddress);
        console2.log("WETH:", WETH);
        console2.log("USDC:", USDC);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Define pool key (currency0 must be smaller address)
        // USDC (0x1c7D...) < WETH (0x7b79...) so USDC is currency0
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WETH),
            fee: 3000, // 0.3% (dynamic via hook)
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        // Calculate pool ID
        PoolId poolId = poolKey.toId();
        console2.log("Pool ID:", vm.toString(PoolId.unwrap(poolId)));

        // Initialize pool at 1:1 price (for testing)
        uint160 sqrtPriceX96 = 79228162514264337593543950336; // sqrt(1) in X96

        console2.log("Initializing pool...");
        IPoolManager(poolManager).initialize(poolKey, sqrtPriceX96);
        console2.log("Pool initialized!");

        // Note: For production, you would also add liquidity here
        // but that requires the PositionManager which may not be deployed yet

        vm.stopBroadcast();

        // Save pool info
        string memory poolInfo = string(
            abi.encodePacked(
                "{",
                '"poolId":"',
                vm.toString(PoolId.unwrap(poolId)),
                '",',
                '"currency0":"',
                vm.toString(Currency.unwrap(poolKey.currency0)),
                '",',
                '"currency1":"',
                vm.toString(Currency.unwrap(poolKey.currency1)),
                '",',
                '"fee":',
                vm.toString(poolKey.fee),
                ",",
                '"hook":"',
                vm.toString(hookAddress),
                '"',
                "}"
            )
        );

        vm.writeFile("deployments/pool.json", poolInfo);

        console2.log("");
        console2.log("========================================");
        console2.log("POOL CREATED!");
        console2.log("========================================");
        console2.log("Pool ID:", vm.toString(PoolId.unwrap(poolId)));
        console2.log("Info saved to: deployments/pool.json");
        console2.log("========================================");
    }
}
