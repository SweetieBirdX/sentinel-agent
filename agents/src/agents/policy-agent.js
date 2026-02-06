const EventEmitter = require('events');
const { ethers } = require('ethers');
const blockchainService = require('../services/blockchain');
const { createAgentLogger, logError } = require('../services/logger');
const { FEE, RISK, POOL } = require('../config/constants');

const logger = createAgentLogger('Policy');

class PolicyAgent extends EventEmitter {
    constructor(statisticalAgent) {
        super();
        this.statisticalAgent = statisticalAgent;
        this.lastFee = FEE.DEFAULT;
        this.nonce = 0;
        this.decisionHistory = [];
    }

    /**
     * Start the policy agent
     */
    async start() {
        logger.info('⚖️  Starting Policy Agent...');

        // Subscribe to statistical agent recommendations
        this.statisticalAgent.on('recommendation', (data) => {
            this.processRecommendation(data);
        });

        logger.info('✅ Policy Agent started');
    }

    /**
     * Process recommendation from statistical agent
     */
    async processRecommendation(recommendation) {
        logger.debug('Processing recommendation', {
            fee: recommendation.recommendedFee,
            confidence: recommendation.confidence
        });

        try {
            const { recommendedFee, volatility, spread, confidence } = recommendation;

            // Apply decision rules
            const decision = this.applyDecisionRules({
                recommendedFee,
                volatility,
                spread,
                confidence
            });

            if (!decision.approved) {
                logger.info('Recommendation rejected', {
                    reason: decision.reason
                });
                return;
            }

            // Create signed instruction
            const instruction = await this.createSignedInstruction(
                decision.approvedFee
            );

            logger.info('Fee recommendation approved', {
                originalFee: recommendedFee,
                approvedFee: decision.approvedFee,
                feePct: (decision.approvedFee / 10000).toFixed(2) + '%',
                reason: decision.reason
            });

            // Store in history
            this.decisionHistory.push({
                ...instruction,
                timestamp: Date.now(),
                volatility,
                spread
            });

            // Keep history manageable
            if (this.decisionHistory.length > 100) {
                this.decisionHistory.shift();
            }

            // Emit to execution agent
            this.emit('instruction', instruction);

            // Update last fee
            this.lastFee = decision.approvedFee;
            this.nonce++;

        } catch (error) {
            logError(logger, error, { context: 'processRecommendation' });
        }
    }

    /**
     * Apply decision rules and risk management
     */
    applyDecisionRules({ recommendedFee, volatility, spread, confidence }) {
        let approvedFee = recommendedFee;
        let approved = true;
        let reason = '';

        // Rule 1: Confidence threshold
        if (confidence < RISK.MIN_CONFIDENCE_THRESHOLD) {
            return {
                approved: false,
                approvedFee: this.lastFee,
                reason: `Low confidence: ${(confidence * 100).toFixed(1)}% < ${(RISK.MIN_CONFIDENCE_THRESHOLD * 100)}%`
            };
        }

        // Rule 2: Limit fee change per update
        const feeChange = Math.abs(approvedFee - this.lastFee);
        if (feeChange > RISK.MAX_FEE_CHANGE_PER_UPDATE) {
            const direction = approvedFee > this.lastFee ? 1 : -1;
            approvedFee = this.lastFee + (direction * RISK.MAX_FEE_CHANGE_PER_UPDATE);
            reason = `Fee change limited to ${RISK.MAX_FEE_CHANGE_PER_UPDATE / 100}%`;
            logger.warn('Fee change clamped', {
                requested: recommendedFee,
                approved: approvedFee
            });
        }

        // Rule 3: Emergency override - high spread
        if (spread > RISK.EMERGENCY_SPREAD_THRESHOLD) {
            approvedFee = FEE.MAX;
            reason = 'EMERGENCY: High spread, maximizing fees';
            logger.warn('⚠️  EMERGENCY MODE ACTIVATED', {
                spread: (spread * 100).toFixed(3) + '%'
            });
        }

        // Rule 4: Gradual fee reduction during low volatility
        if (volatility < 0.01 && approvedFee < this.lastFee) {
            // Allow fee reduction
            reason = 'Low volatility, reducing fees';
        }

        // Rule 5: Clamp to min/max bounds
        if (approvedFee < FEE.MIN) {
            approvedFee = FEE.MIN;
            reason = 'Clamped to minimum fee';
        }

        if (approvedFee > FEE.MAX) {
            approvedFee = FEE.MAX;
            reason = 'Clamped to maximum fee';
        }

        return {
            approved,
            approvedFee,
            reason: reason || 'Normal operation'
        };
    }

    /**
     * Create cryptographically signed instruction
     */
    async createSignedInstruction(fee) {
        const poolId = POOL.ID;
        const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

        // Create message hash (must match on-chain verification)
        const messageHash = ethers.solidityPackedKeccak256(
            ['uint24', 'bytes32', 'uint256', 'uint256'],
            [fee, poolId, this.nonce, deadline]
        );

        // Sign with agent wallet
        const signature = await blockchainService.wallet.signMessage(
            ethers.getBytes(messageHash)
        );

        return {
            fee,
            poolId,
            nonce: this.nonce,
            deadline,
            signature,
            signer: blockchainService.wallet.address,
            messageHash
        };
    }

    /**
     * Get decision history
     */
    getDecisionHistory() {
        return this.decisionHistory;
    }

    /**
     * Get last approved fee
     */
    getLastFee() {
        return this.lastFee;
    }

    /**
     * Stop the agent
     */
    stop() {
        logger.info('Policy Agent stopped');
    }
}

module.exports = PolicyAgent;
