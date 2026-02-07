/**
 * Mock Blockchain Service
 * Simulates blockchain interactions without actual Sepolia connection
 */

const EventEmitter = require('events');
const { ethers } = require('ethers');

class MockBlockchainService extends EventEmitter {
    constructor() {
        super();
        this.mockPoolState = {
            sqrtPriceX96: BigInt("79228162514264337593543950336"), // ~1:1 price
            tick: 0,
            protocolFee: 0,
            lpFee: 3000
        };
        this.mockPoolId = '0x9f50d60b8c19151d86a10dfadf99aa803aba1c211790853cbe0c93f4f95b84d3';
        this.isAuthorized = true;
    }

    async initialize(rpcUrl) {
        // Simulate connection delay
        await this.sleep(100);

        return {
            provider: this.getMockProvider(),
            wallet: this.getMockWallet(),
            contracts: this.getMockContracts()
        };
    }

    getMockProvider() {
        return {
            getBlockNumber: async () => 10204870,
            getNetwork: async () => ({ name: 'sepolia', chainId: 11155111 })
        };
    }

    getMockWallet() {
        // Use a deterministic test wallet
        const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
        return new ethers.Wallet(privateKey);
    }

    getMockContracts() {
        const self = this;

        return {
            hook: {
                address: '0xC756695Dec602d696E2597c9F451717cEAFf39C2',
                interface: {
                    parseLog: () => null
                },
                on: (eventName, callback) => {
                    self.on(eventName, callback);
                }
            },
            registry: {
                isAuthorized: async () => self.isAuthorized
            },
            poolManager: {
                getSlot0: async (poolId) => {
                    return self.mockPoolState;
                }
            }
        };
    }

    // Simulate emitting MarketHealth events
    emitMarketHealth(volatilityIndex, liquidityDepth, imbalanceRatio) {
        this.emit('MarketHealth',
            this.mockPoolId,
            volatilityIndex,
            liquidityDepth,
            imbalanceRatio,
            Math.floor(Date.now() / 1000)
        );
    }

    // Update mock pool state (for testing)
    updatePoolState(newState) {
        this.mockPoolState = { ...this.mockPoolState, ...newState };
    }

    async getPoolState(poolManager, poolKey) {
        await this.sleep(50); // Simulate network delay
        return this.mockPoolState;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MockBlockchainService;
