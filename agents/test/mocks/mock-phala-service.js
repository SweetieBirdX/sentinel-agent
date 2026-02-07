/**
 * Mock Phala Service
 * Simulates TEE attestation for testing
 */

const { ethers } = require('ethers');

class MockPhalaService {
    constructor() {
        this.isInitialized = false;
        this.agentId = null;
    }

    async initialize(agentAddress, privateKey) {
        this.isInitialized = true;
        this.agentId = agentAddress;
        this.privateKey = privateKey;
    }

    async executeInTEE(computation) {
        if (!this.isInitialized) {
            throw new Error('Mock Phala service not initialized');
        }

        // Simulate computation
        const result = this.simulateComputation(computation);

        // Generate mock attestation
        const attestation = this.generateMockAttestation(result);

        return { result, attestation };
    }

    simulateComputation(computation) {
        switch (computation.type) {
            case 'FEE_RECOMMENDATION':
                return this.computeFeeRecommendation(computation.data);

            case 'VOLATILITY_ANALYSIS':
                return this.computeVolatility(computation.data);

            default:
                throw new Error('Unknown computation type');
        }
    }

    computeVolatility(data) {
        const { priceHistory } = data;

        if (!priceHistory || priceHistory.length < 2) return 0;

        const returns = [];
        for (let i = 1; i < priceHistory.length; i++) {
            const ret = (priceHistory[i] - priceHistory[i - 1]) / priceHistory[i - 1];
            returns.push(ret);
        }

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, ret) =>
            sum + Math.pow(ret - mean, 2), 0) / returns.length;

        return Math.sqrt(variance);
    }

    computeFeeRecommendation(data) {
        const { volatility, spread } = data;

        let fee = 3000;

        if (volatility > 0.05) fee += 3000;
        else if (volatility > 0.02) fee += 1000;

        if (spread > 0.01) fee += 2000;
        else if (spread > 0.005) fee += 1000;

        fee = Math.max(500, Math.min(10000, fee));

        return {
            recommendedFee: fee,
            confidence: this.calculateConfidence(data),
            feePct: (fee / 10000).toFixed(2) + '%',
            timestamp: Date.now()
        };
    }

    calculateConfidence(data) {
        let confidence = 0.5;

        if (data.priceHistory && data.priceHistory.length > 50) {
            confidence += 0.2;
        }

        if (data.volatility !== undefined && data.spread !== undefined) {
            confidence += 0.3;
        }

        return Math.min(confidence, 1.0);
    }

    generateMockAttestation(result) {
        return {
            version: '1.0',
            teeType: 'PHALA_MOCK',
            agentId: this.agentId,
            result: result,
            timestamp: Date.now(),
            signature: ethers.hexlify(ethers.randomBytes(65)) // Mock signature
        };
    }

    verifyAttestation(attestation) {
        // In mock mode, always return true
        return true;
    }
}

module.exports = MockPhalaService;
