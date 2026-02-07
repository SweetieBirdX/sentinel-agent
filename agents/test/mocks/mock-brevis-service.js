/**
 * Mock Brevis Service
 * Simulates ZK-ML proof generation for testing
 */

class MockBrevisService {
    constructor() {
        this.isInitialized = false;
    }

    async initialize() {
        this.isInitialized = true;
        return true;
    }

    async proveVolatilityCalculation(priceHistory, calculatedVolatility) {
        if (!this.isInitialized) {
            throw new Error('Mock Brevis service not initialized');
        }

        // Return a mock proof
        return {
            proof: '0xmockzkproof...',
            publicInputs: [
                priceHistory.length,
                Math.floor(calculatedVolatility * 1e6)
            ],
            timestamp: Date.now()
        };
    }
}

module.exports = MockBrevisService;
