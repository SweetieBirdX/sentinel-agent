// Contract ABIs (minimal - only functions we need)
const SENTINEL_HOOK_ABI = [
    "function beforeSwap(address, tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external returns (bytes4, int128, uint24)",
    "function authorizedAgents(address) external view returns (bool)",
    "function capturedMEV(bytes32) external view returns (uint256)",
    "function priceHistory(bytes32, uint256) external view returns (uint160)",
    "function priceHistoryIndex(bytes32) external view returns (uint8)",
    "event MarketHealth(bytes32 indexed poolId, uint256 volatilityIndex, uint256 liquidityDepth, int256 imbalanceRatio, uint256 timestamp)",
    "event AgentInstruction(address indexed agent, bytes32 instructionHash, uint256 fee, uint256 timestamp)",
    "event MEVCaptured(bytes32 indexed poolId, uint256 amount, address indexed capturer)"
];

const AGENT_REGISTRY_ABI = [
    "function agents(address) external view returns (address agentAddress, string name, string description, uint256 reputationScore, bool isActive, uint256 registeredAt)",
    "function isAuthorized(address agent) external view returns (bool)",
    "function getNonce(address agent) external view returns (uint256)",
    "function verifySignature(address agent, bytes32 messageHash, bytes signature) external view returns (bool)"
];

const POOL_MANAGER_ABI = [
    "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint16 protocolFee, uint24 lpFee)",
    "function getLiquidity(bytes32 poolId) external view returns (uint128)",
    "function getPosition(bytes32 poolId, address owner, int24 tickLower, int24 tickUpper, bytes32 salt) external view returns (uint128 liquidity)"
];

const ERC20_ABI = [
    "function balanceOf(address owner) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function approve(address spender, uint256 amount) external returns (bool)"
];

// Export addresses from environment
function getAddresses() {
    return {
        hook: process.env.HOOK_ADDRESS,
        registry: process.env.AGENT_REGISTRY_ADDRESS,
        poolManager: process.env.POOL_MANAGER_ADDRESS,
        token0: process.env.TOKEN0_ADDRESS,
        token1: process.env.TOKEN1_ADDRESS
    };
}

// Validate all addresses are set
function validateAddresses() {
    const addresses = getAddresses();

    for (const [name, address] of Object.entries(addresses)) {
        if (!address || !address.startsWith('0x') || address.length !== 42) {
            throw new Error(`Invalid or missing ${name} address: ${address}`);
        }
    }

    // Validation successful - addresses are valid
    return addresses;
}

module.exports = {
    SENTINEL_HOOK_ABI,
    AGENT_REGISTRY_ABI,
    POOL_MANAGER_ABI,
    ERC20_ABI,
    getAddresses,
    validateAddresses
};
