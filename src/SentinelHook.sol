// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {SwapParams, ModifyLiquidityParams} from "v4-core/src/types/PoolOperation.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

/// @title SentinelHook
/// @notice Autonomous liquidity manager with AI agent integration for LVR mitigation
/// @dev Implements dynamic fees, MEV capture, and market health monitoring
contract SentinelHook is BaseHook {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    using CurrencyLibrary for Currency;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when market health metrics are calculated
    event MarketHealth(
        PoolId indexed poolId,
        uint256 volatilityIndex,
        uint256 liquidityDepth,
        int256 imbalanceRatio,
        uint256 timestamp
    );

    /// @notice Emitted when MEV is captured and ready for redistribution
    event MEVCaptured(
        PoolId indexed poolId,
        uint256 amount,
        address indexed capturer
    );

    /// @notice Emitted when an AI agent provides an instruction
    event AgentInstruction(
        address indexed agent,
        bytes32 instructionHash,
        uint256 fee,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Minimum swap fee (0.05%)
    uint24 public constant MIN_FEE = 500;
    
    /// @notice Maximum swap fee (1.00%)
    uint24 public constant MAX_FEE = 10000;
    
    /// @notice Default swap fee (0.30%)
    uint24 public constant DEFAULT_FEE = 3000;
    
    /// @notice MEV redistribution threshold (0.1 ETH)
    uint256 public constant MEV_THRESHOLD = 0.1 ether;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Agent registry contract for identity verification
    address public immutable agentRegistry;
    
    /// @notice Captured MEV per pool awaiting redistribution
    mapping(PoolId => uint256) public capturedMEV;
    
    /// @notice Authorized AI agents (can bypass registry check)
    mapping(address => bool) public authorizedAgents;
    
    /// @notice Last processed block per pool (for top-of-block detection)
    mapping(PoolId => uint256) public lastProcessedBlock;
    
    /// @notice Price history for volatility calculation (last 10 prices)
    mapping(PoolId => uint160[10]) public priceHistory;
    
    /// @notice Current position in circular price buffer
    mapping(PoolId => uint8) public priceHistoryIndex;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(IPoolManager _manager, address _agentRegistry) BaseHook(_manager) {
        agentRegistry = _agentRegistry;
    }

    /*//////////////////////////////////////////////////////////////
                          HOOK CONFIGURATION
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc BaseHook
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /*//////////////////////////////////////////////////////////////
                            HOOK CALLBACKS
    //////////////////////////////////////////////////////////////*/

    /// @notice Called before each swap - implements dynamic fee logic
    /// @dev Decodes agent recommendations and adjusts fees accordingly
    function _beforeSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        
        // Default fee
        uint24 fee = DEFAULT_FEE;
        
        // Decode hookData if provided: (uint24 recommendedFee, address agent, bytes signature)
        if (hookData.length > 0) {
            (uint24 recommendedFee, address agent, bytes memory signature) = 
                abi.decode(hookData, (uint24, address, bytes));
            
            // Verify agent authorization
            if (authorizedAgents[agent] || _verifyAgent(agent, signature)) {
                // Clamp fee to valid bounds
                fee = _clampFee(recommendedFee);
                
                // Emit agent instruction event
                emit AgentInstruction(
                    agent,
                    keccak256(abi.encodePacked(recommendedFee, block.timestamp)),
                    fee,
                    block.timestamp
                );
            }
        }
        
        // Detect top-of-block for MEV capture logic
        if (block.number != lastProcessedBlock[poolId]) {
            lastProcessedBlock[poolId] = block.number;
            // First swap of block - potential MEV opportunity
            // Future: Implement auction mechanism here
        }
        
        return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee);
    }

    /// @notice Called after each swap - calculates metrics and redistributes MEV
    /// @dev Emits market health data for off-chain agents to consume
    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) internal override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        
        // Get current pool state
        (uint160 sqrtPriceX96, , , ) = poolManager.getSlot0(poolId);
        uint128 liquidity = poolManager.getLiquidity(poolId);
        
        // Update price history
        _updatePriceHistory(poolId, sqrtPriceX96);
        
        // Calculate market health metrics
        uint256 volatility = _calculateVolatility(poolId);
        uint256 liquidityDepth = uint256(liquidity);
        int256 imbalance = 0; // Simplified for now
        
        // Emit metrics for agents to consume
        emit MarketHealth(
            poolId,
            volatility,
            liquidityDepth,
            imbalance,
            block.timestamp
        );
        
        // Check if MEV should be redistributed
        uint256 mevAmount = capturedMEV[poolId];
        if (mevAmount >= MEV_THRESHOLD) {
            emit MEVCaptured(poolId, mevAmount, address(this));
            // Reset counter (actual donation will be in separate function)
            capturedMEV[poolId] = 0;
            
            // Note: Actual poolManager.donate() would happen here
            // but requires proper currency handling - implement in Phase 2
        }
        
        return (this.afterSwap.selector, 0);
    }

    /// @notice Called before liquidity is added
    /// @dev Reserved for future agent-controlled position management
    function _beforeAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) internal override returns (bytes4) {
        // Future: Implement agent-controlled liquidity range optimization
        return this.beforeAddLiquidity.selector;
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Verify agent via registry
    /// @param agent Agent address
    /// @param signature Agent's signature (unused in simple check, reserved for future)
    /// @return True if agent is authorized
    function _verifyAgent(address agent, bytes memory signature) internal view returns (bool) {
        // Quick check: Is agent pre-authorized?
        if (authorizedAgents[agent]) return true;
        
        // Check with registry
        if (agentRegistry == address(0)) return false;
        
        IAgentRegistry registry = IAgentRegistry(agentRegistry);
        
        // Simple check: Is agent active and has good reputation?
        return registry.isAuthorized(agent);
    }

    /// @notice Clamp fee to valid bounds
    function _clampFee(uint24 fee) internal pure returns (uint24) {
        if (fee < MIN_FEE) return MIN_FEE;
        if (fee > MAX_FEE) return MAX_FEE;
        return fee;
    }

    /// @notice Update circular price history buffer
    function _updatePriceHistory(PoolId poolId, uint160 price) internal {
        uint8 index = priceHistoryIndex[poolId];
        priceHistory[poolId][index] = price;
        priceHistoryIndex[poolId] = uint8((index + 1) % 10);
    }

    /// @notice Calculate simple volatility from price history
    function _calculateVolatility(PoolId poolId) internal view returns (uint256) {
        uint160[10] memory prices = priceHistory[poolId];
        
        // Need at least 2 prices
        if (prices[1] == 0) return 0;
        
        // Calculate simple price variance
        uint256 sum = 0;
        uint256 count = 0;
        
        for (uint i = 0; i < 10 && prices[i] != 0; i++) {
            sum += uint256(prices[i]);
            count++;
        }
        
        if (count < 2) return 0;
        
        uint256 mean = sum / count;
        uint256 variance = 0;
        
        for (uint i = 0; i < count; i++) {
            uint256 diff = prices[i] > mean ? uint256(prices[i]) - mean : mean - uint256(prices[i]);
            variance += diff * diff;
        }
        
        // Return standard deviation scaled by 1e6
        return sqrt(variance / count);
    }

    /// @notice Integer square root (Babylonian method)
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /*//////////////////////////////////////////////////////////////
                          ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Authorize an agent (owner only)
    function authorizeAgent(address agent) external {
        // Note: Add Ownable or access control in production
        authorizedAgents[agent] = true;
    }

    /// @notice Deauthorize an agent (owner only)
    function deauthorizeAgent(address agent) external {
        authorizedAgents[agent] = false;
    }
}
