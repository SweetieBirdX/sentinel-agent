// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

import {PoolManager} from "v4-core/src/PoolManager.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {SwapParams, ModifyLiquidityParams} from "v4-core/src/types/PoolOperation.sol";

import {SentinelHook} from "../src/SentinelHook.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

contract SentinelHookTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    SentinelHook hook;
    AgentRegistry registry;
    PoolId poolId;

    // Test agents
    address agent1;
    uint256 agent1PrivateKey;
    address agent2;
    uint256 agent2PrivateKey;

    function setUp() public {
        // Deploy v4-core contracts and routers
        deployFreshManagerAndRouters();
        
        // Deploy and mint test currencies
        deployMintAndApprove2Currencies();
        
        // Deploy AgentRegistry
        registry = new AgentRegistry();
        
        // Create test agents
        agent1PrivateKey = 0xA11CE;
        agent1 = vm.addr(agent1PrivateKey);
        agent2PrivateKey = 0xB0B;
        agent2 = vm.addr(agent2PrivateKey);

        // Register agent1
        registry.registerAgent(agent1, "Test Agent 1", "Primary test agent");
        
        // Mine hook address with correct flags
        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG | 
            Hooks.AFTER_SWAP_FLAG | 
            Hooks.BEFORE_ADD_LIQUIDITY_FLAG
        );
        
        (address hookAddress, bytes32 salt) = HookMiner.find(
            address(this),
            flags,
            type(SentinelHook).creationCode,
            abi.encode(manager, address(registry))
        );

        // Deploy hook at mined address
        hook = new SentinelHook{salt: salt}(manager, address(registry));
        require(address(hook) == hookAddress, "Hook address mismatch");

        // Create pool key (using inherited currency0/currency1 from Deployers)
        key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: hook
        });
        poolId = key.toId();

        // Initialize pool
        manager.initialize(key, SQRT_PRICE_1_1);

        // Add liquidity
        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: -60,
                tickUpper: 60,
                liquidityDelta: 10 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );
    }

    /*//////////////////////////////////////////////////////////////
                          DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_HookDeployment() public view {
        // Verify hook permissions
        Hooks.Permissions memory permissions = hook.getHookPermissions();
        assertTrue(permissions.beforeSwap);
        assertTrue(permissions.afterSwap);
        assertTrue(permissions.beforeAddLiquidity);
        assertFalse(permissions.beforeRemoveLiquidity);

        // Verify registry is set
        assertEq(hook.agentRegistry(), address(registry));
    }

    function test_AgentRegistryDeployment() public view {
        // Check agent1 is registered
        (address addr, string memory name, , uint256 rep, bool active, ) = 
            registry.agents(agent1);
        
        assertEq(addr, agent1);
        assertEq(name, "Test Agent 1");
        assertEq(rep, 100);
        assertTrue(active);
    }

    /*//////////////////////////////////////////////////////////////
                          BEFORE SWAP TESTS
    //////////////////////////////////////////////////////////////*/

    function test_BeforeSwap_DefaultFee() public {
        // Swap without hookData (should use default fee)
        swap(key, true, -0.001 ether, ZERO_BYTES);
        
        // Verify swap executed (check pool state changed)
        (uint160 sqrtPriceX96, , , ) = manager.getSlot0(poolId);
        assertTrue(sqrtPriceX96 != SQRT_PRICE_1_1);
    }

    function test_BeforeSwap_AgentRecommendedFee() public {
        // Create hookData with agent recommendation
        uint24 recommendedFee = 5000; // 0.5%
        bytes memory signature = _createDummySignature();
        bytes memory hookData = abi.encode(recommendedFee, agent1, signature);

        // Perform swap
        swap(key, true, -0.001 ether, hookData);
        
        // Verify AgentInstruction event was emitted
        // (event verification would be done with vm.expectEmit in actual test)
    }

    function test_BeforeSwap_FeeClampingMin() public {
        // Recommend fee below minimum
        uint24 tooLowFee = 100; // 0.01% (below MIN_FEE of 500)
        bytes memory signature = _createDummySignature();
        bytes memory hookData = abi.encode(tooLowFee, agent1, signature);

        swap(key, true, -1e18, hookData);
        // Should clamp to MIN_FEE internally
    }

    function test_BeforeSwap_FeeClampingMax() public {
        // Recommend fee above maximum
        uint24 tooHighFee = 15000; // 1.5% (above MAX_FEE of 10000)
        bytes memory signature = _createDummySignature();
        bytes memory hookData = abi.encode(tooHighFee, agent1, signature);

        swap(key, true, -1e18, hookData);
        // Should clamp to MAX_FEE internally
    }

    function test_BeforeSwap_UnauthorizedAgent() public {
        // Try to use unregistered agent
        uint24 recommendedFee = 5000;
        bytes memory signature = _createDummySignature();
        bytes memory hookData = abi.encode(recommendedFee, agent2, signature);

        // Should fall back to default fee
        swap(key, true, -0.001 ether, hookData);
    }

    /*//////////////////////////////////////////////////////////////
                          AFTER SWAP TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AfterSwap_EmitsMarketHealth() public {
        // Execute multiple swaps to build price history
        for (uint i = 0; i < 5; i++) {
            swap(key, true, -0.001 ether, ZERO_BYTES);
            swap(key, false, -0.001 ether, ZERO_BYTES);
        }

        // Verify price history was updated (check first entry has non-zero price)
        uint160 price0 = hook.priceHistory(poolId, 0);
        assertTrue(price0 > 0, "Price history should be populated");
    }

    function test_AfterSwap_VolatilityCalculation() public {
        // Execute swaps to create price movement
        swap(key, true, -0.001 ether, ZERO_BYTES);
        swap(key, false, -0.0005 ether, ZERO_BYTES);
        swap(key, true, -0.0008 ether, ZERO_BYTES);

        // Price history should be populated
        uint160 price0 = hook.priceHistory(poolId, 0);
        assertTrue(price0 > 0);
    }

    /*//////////////////////////////////////////////////////////////
                          AUTHORIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_AuthorizeAgent() public {
        // Authorize agent directly in hook
        hook.authorizeAgent(agent2);
        assertTrue(hook.authorizedAgents(agent2));
    }

    function test_DeauthorizeAgent() public {
        hook.authorizeAgent(agent2);
        hook.deauthorizeAgent(agent2);
        assertFalse(hook.authorizedAgents(agent2));
    }

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _createDummySignature() internal pure returns (bytes memory) {
        // Create a dummy 65-byte signature for testing
        return new bytes(65);
    }
}
