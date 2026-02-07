const { ethers } = require('ethers');
const { createAgentLogger } = require('./logger');

const logger = createAgentLogger('Phala');

class PhalaService {
    constructor() {
        this.agentId = null;
        this.privateKey = null;
        this.isInitialized = false;
        this.nonceTracker = new Set(); // Prevent replay attacks
    }

    /**
     * Initialize the Phala TEE service
     * In production: would connect to actual Phala Network
     */
    async initialize(agentAddress, privateKey) {
        logger.info('Initializing Phala TEE service...');

        this.agentId = agentAddress;
        this.privateKey = privateKey;

        // In production: Connect to actual Phala Network
        // const phala = await PhalaSDK.connect(endpoint);

        this.isInitialized = true;
        logger.info('✅ Phala service initialized', { agentId: this.agentId });
    }

    /**
     * Execute computation in simulated TEE
     * Returns result + cryptographic attestation
     */
    async executeInTEE(computation) {
        if (!this.isInitialized) {
            throw new Error('Phala service not initialized');
        }

        logger.debug('Executing in TEE', { type: computation.type });

        // Simulate TEE execution
        const result = this.simulateComputation(computation);

        // Generate attestation
        const attestation = await this.generateAttestation(result, computation);

        return { result, attestation };
    }

    /**
     * Simulate secure enclave computation
     * In production: This runs inside actual secure enclave
     */
    simulateComputation(computation) {
        switch (computation.type) {
            case 'VOLATILITY_ANALYSIS':
                return this.calculateVolatility(computation.data);

            case 'FEE_RECOMMENDATION':
                return this.recommendFee(computation.data);

            case 'MARKET_HEALTH':
                return this.analyzeMarketHealth(computation.data);

            default:
                throw new Error(`Unknown computation: ${computation.type}`);
        }
    }

    /**
     * Calculate volatility from price history
     */
    calculateVolatility(data) {
        const { priceHistory } = data;

        if (!priceHistory || priceHistory.length < 2) return { volatility: 0 };

        const returns = [];
        for (let i = 1; i < priceHistory.length; i++) {
            const ret = (priceHistory[i] - priceHistory[i - 1]) / priceHistory[i - 1];
            returns.push(ret);
        }

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, ret) =>
            sum + Math.pow(ret - mean, 2), 0) / returns.length;

        return {
            volatility: Math.sqrt(variance),
            dataPoints: priceHistory.length,
            timestamp: Date.now()
        };
    }

    /**
     * Generate fee recommendation based on market data
     */
    recommendFee(data) {
        const { volatility, spread } = data;

        let fee = 3000; // Base 0.3%

        // Adjust for volatility
        if (volatility > 0.05) fee += 3000;
        else if (volatility > 0.02) fee += 1000;

        // Adjust for spread
        if (spread > 0.01) fee += 2000;
        else if (spread > 0.005) fee += 1000;

        // Clamp to bounds
        fee = Math.max(500, Math.min(10000, fee));

        return {
            recommendedFee: fee,
            feePct: (fee / 10000 * 100).toFixed(2) + '%',
            confidence: this.calculateConfidence(data),
            timestamp: Date.now()
        };
    }

    /**
     * Analyze overall market health
     */
    analyzeMarketHealth(data) {
        const { volatility, spread, liquidity } = data;

        let healthScore = 100;

        // Deduct for high volatility
        if (volatility > 0.05) healthScore -= 30;
        else if (volatility > 0.02) healthScore -= 15;

        // Deduct for high spread
        if (spread > 0.02) healthScore -= 25;
        else if (spread > 0.01) healthScore -= 10;

        // Deduct for low liquidity
        if (liquidity < 10000) healthScore -= 20;
        else if (liquidity < 50000) healthScore -= 10;

        return {
            healthScore: Math.max(0, healthScore),
            status: healthScore > 70 ? 'HEALTHY' : healthScore > 40 ? 'CAUTION' : 'CRITICAL',
            timestamp: Date.now()
        };
    }

    /**
     * Calculate confidence score
     */
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

    /**
     * Generate cryptographic attestation
     * In production: TEE generates hardware-backed attestation
     */
    async generateAttestation(result, computation) {
        const wallet = new ethers.Wallet(this.privateKey);
        const nonce = Date.now();

        const attestation = {
            version: '1.0',
            teeType: 'PHALA_SIMULATED',
            agentId: this.agentId,
            result: result,
            timestamp: nonce,
            computationType: computation.type,
            // In production: would include enclave quote
            enclaveQuote: 'SIMULATED_ENCLAVE_QUOTE'
        };

        // Create hash of attestation data
        const hash = ethers.solidityPackedKeccak256(
            ['address', 'uint256', 'bytes32'],
            [
                this.agentId,
                attestation.timestamp,
                ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(result)))
            ]
        );

        // Sign it with agent's private key
        attestation.signature = await wallet.signMessage(ethers.getBytes(hash));
        attestation.messageHash = hash;

        logger.debug('Generated attestation', {
            agentId: this.agentId,
            type: computation.type
        });

        return attestation;
    }

    /**
     * Verify an attestation
     * Checks signature validity and prevents replay attacks
     */
    verifyAttestation(attestation) {
        try {
            // Check for replay attack
            if (this.nonceTracker.has(attestation.timestamp)) {
                logger.warn('Replay attack detected', { timestamp: attestation.timestamp });
                return false;
            }

            // Check attestation is not too old (5 minutes max)
            const age = Date.now() - attestation.timestamp;
            if (age > 5 * 60 * 1000) {
                logger.warn('Attestation expired', { age: `${age / 1000}s` });
                return false;
            }

            // Recreate the hash
            const hash = ethers.solidityPackedKeccak256(
                ['address', 'uint256', 'bytes32'],
                [
                    attestation.agentId,
                    attestation.timestamp,
                    ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(attestation.result)))
                ]
            );

            // Recover signer from signature
            const recoveredAddress = ethers.verifyMessage(
                ethers.getBytes(hash),
                attestation.signature
            );

            const isValid = recoveredAddress.toLowerCase() === attestation.agentId.toLowerCase();

            if (isValid) {
                // Track nonce to prevent replay
                this.nonceTracker.add(attestation.timestamp);

                // Clean old nonces (keep last 1000)
                if (this.nonceTracker.size > 1000) {
                    const oldest = [...this.nonceTracker].slice(0, 100);
                    oldest.forEach(n => this.nonceTracker.delete(n));
                }

                logger.debug('Attestation verified', { agentId: attestation.agentId });
            } else {
                logger.warn('Attestation verification failed', {
                    expected: attestation.agentId,
                    recovered: recoveredAddress
                });
            }

            return isValid;

        } catch (error) {
            logger.error('Attestation verification error:', error);
            return false;
        }
    }

    /**
     * Encode attestation for on-chain verification
     */
    encodeForOnChain(attestation) {
        return ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'uint256', 'bytes32', 'bytes'],
            [
                attestation.agentId,
                attestation.timestamp,
                attestation.messageHash,
                attestation.signature
            ]
        );
    }
}

// Export singleton
module.exports = new PhalaService();
