const { ethers } = require('ethers');
const {
    SENTINEL_HOOK_ABI,
    AGENT_REGISTRY_ABI,
    POOL_MANAGER_ABI,
    ERC20_ABI,
    validateAddresses
} = require('../config/contracts');
const { NETWORK, BLOCKCHAIN } = require('../config/constants');
const { createAgentLogger, logError } = require('./logger');

const logger = createAgentLogger('Blockchain');

class BlockchainService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contracts = {};
        this.isInitialized = false;
    }

    /**
     * Initialize blockchain connection and contracts
     */
    async initialize(privateKey) {
        try {
            logger.info('Initializing blockchain service...');

            // Validate addresses
            const addresses = validateAddresses();

            // Create provider
            this.provider = new ethers.JsonRpcProvider(NETWORK.RPC_URL);

            // Test connection
            const blockNumber = await this.provider.getBlockNumber();
            logger.info(`Connected to ${NETWORK.NAME}`, { blockNumber });

            // Create wallet
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            logger.info('Agent wallet initialized', {
                address: this.wallet.address
            });

            // Check balance
            const balance = await this.provider.getBalance(this.wallet.address);
            logger.info('Wallet balance', {
                eth: ethers.formatEther(balance),
                wei: balance.toString()
            });

            if (balance === 0n) {
                logger.warn('⚠️  Wallet has no ETH! Get testnet ETH from faucet.');
            }

            // Load contracts
            this.contracts.hook = new ethers.Contract(
                addresses.hook,
                SENTINEL_HOOK_ABI,
                this.wallet
            );

            this.contracts.registry = new ethers.Contract(
                addresses.registry,
                AGENT_REGISTRY_ABI,
                this.wallet
            );

            this.contracts.poolManager = new ethers.Contract(
                addresses.poolManager,
                POOL_MANAGER_ABI,
                this.wallet
            );

            this.contracts.token0 = new ethers.Contract(
                addresses.token0,
                ERC20_ABI,
                this.wallet
            );

            this.contracts.token1 = new ethers.Contract(
                addresses.token1,
                ERC20_ABI,
                this.wallet
            );

            // Verify agent is authorized
            const isAuthorized = await this.contracts.registry.isAuthorized(
                this.wallet.address
            );

            if (!isAuthorized) {
                logger.warn('⚠️  Agent is not authorized in registry!');
            } else {
                logger.info('✅ Agent is authorized');
            }

            this.isInitialized = true;
            logger.info('✅ Blockchain service initialized successfully');

        } catch (error) {
            logError(logger, error, { context: 'initialize' });
            throw error;
        }
    }

    /**
     * Get current pool state
     */
    async getPoolState(poolId) {
        try {
            const slot0 = await this.contracts.poolManager.getSlot0(poolId);
            const liquidity = await this.contracts.poolManager.getLiquidity(poolId);

            return {
                sqrtPriceX96: slot0[0],
                tick: slot0[1],
                protocolFee: slot0[2],
                lpFee: slot0[3],
                liquidity: liquidity
            };
        } catch (error) {
            logError(logger, error, { context: 'getPoolState', poolId });
            return null;
        }
    }

    /**
     * Get price history from hook
     */
    async getPriceHistory(poolId, count = 10) {
        try {
            const prices = [];

            for (let i = 0; i < count; i++) {
                const price = await this.contracts.hook.priceHistory(poolId, i);
                if (price === 0n) break;
                prices.push(price);
            }

            return prices;
        } catch (error) {
            logError(logger, error, { context: 'getPriceHistory' });
            return [];
        }
    }

    /**
     * Convert sqrtPriceX96 to human-readable price
     */
    sqrtPriceToPrice(sqrtPriceX96, decimals0 = 18, decimals1 = 6) {
        const Q96 = 2n ** 96n;
        const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
        const price = sqrtPrice ** 2;

        // Adjust for token decimals
        const decimalAdjustment = 10 ** (decimals0 - decimals1);
        return price * decimalAdjustment;
    }

    /**
     * Listen to contract events
     */
    listenToEvent(contractName, eventName, callback) {
        if (!this.contracts[contractName]) {
            throw new Error(`Contract ${contractName} not found`);
        }

        const contract = this.contracts[contractName];

        contract.on(eventName, (...args) => {
            try {
                callback(...args);
            } catch (error) {
                logError(logger, error, {
                    context: 'event callback',
                    event: eventName
                });
            }
        });

        logger.info(`Listening to ${eventName} on ${contractName}`);
    }

    /**
     * Sign instruction for hook
     */
    async signInstruction(fee, poolId, nonce) {
        const messageHash = ethers.solidityPackedKeccak256(
            ['uint24', 'bytes32', 'uint256', 'uint256'],
            [fee, poolId, nonce, Math.floor(Date.now() / 1000) + 300] // 5 min deadline
        );

        const signature = await this.wallet.signMessage(
            ethers.getBytes(messageHash)
        );

        return signature;
    }

    /**
     * Encode hookData for swap
     */
    encodeHookData(fee, agent, signature) {
        return ethers.AbiCoder.defaultAbiCoder().encode(
            ['uint24', 'address', 'bytes'],
            [fee, agent, signature]
        );
    }

    /**
     * Get current gas price with buffer
     */
    async getGasPrice() {
        const feeData = await this.provider.getFeeData();
        const gasPrice = feeData.gasPrice;

        // Add buffer
        const buffered = gasPrice * BigInt(100 + BLOCKCHAIN.GAS_BUFFER_PERCENT) / 100n;

        // Cap at max
        const maxGasPrice = ethers.parseUnits(
            BLOCKCHAIN.MAX_GAS_PRICE_GWEI.toString(),
            'gwei'
        );

        return buffered > maxGasPrice ? maxGasPrice : buffered;
    }

    /**
     * Wait for transaction with retries
     */
    async waitForTransaction(txHash, confirmations = BLOCKCHAIN.CONFIRMATION_BLOCKS) {
        for (let i = 0; i < BLOCKCHAIN.RETRY_ATTEMPTS; i++) {
            try {
                const receipt = await this.provider.waitForTransaction(
                    txHash,
                    confirmations
                );
                return receipt;
            } catch (error) {
                if (i === BLOCKCHAIN.RETRY_ATTEMPTS - 1) {
                    throw error;
                }

                logger.warn(`Retry ${i + 1}/${BLOCKCHAIN.RETRY_ATTEMPTS} for tx ${txHash}`);
                await new Promise(resolve =>
                    setTimeout(resolve, BLOCKCHAIN.RETRY_DELAY_MS)
                );
            }
        }
    }
}

// Export singleton instance
const blockchainService = new BlockchainService();

module.exports = blockchainService;
