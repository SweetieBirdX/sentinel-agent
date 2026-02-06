const EventEmitter = require('events');
const blockchainService = require('../services/blockchain');
const priceFetcher = require('../services/price-fetcher');
const { createAgentLogger, logError } = require('../services/logger');
const { POOL, ANALYSIS, RISK } = require('../config/constants');

const logger = createAgentLogger('Statistical');

class StatisticalAgent extends EventEmitter {
    constructor() {
        super();
        this.poolState = null;
        this.cexPrice = null;
        this.dexPrice = null;
        this.metrics = {
            volatility: 0,
            spread: 0,
            liquidityDepth: 0,
            priceHistory: []
        };
    }

    /**
     * Initialize and start monitoring
     */
    async start() {
        logger.info('🔬 Starting Statistical Agent...');

        try {
            // Start price fetcher
            priceFetcher.start((price) => {
                this.cexPrice = price;
                this.calculateMetrics();
            });

            // Listen to MarketHealth events from hook
            blockchainService.listenToEvent('hook', 'MarketHealth',
                (poolId, volatilityIndex, liquidityDepth, imbalanceRatio, timestamp) => {
                    this.handleMarketHealthEvent({
                        poolId,
                        volatilityIndex,
                        liquidityDepth,
                        imbalanceRatio,
                        timestamp
                    });
                }
            );

            // Start analysis loop
            this.startAnalysisLoop();

            logger.info('✅ Statistical Agent started');

        } catch (error) {
            logError(logger, error, { context: 'start' });
            throw error;
        }
    }

    /**
     * Handle MarketHealth event from hook
     */
    handleMarketHealthEvent(data) {
        logger.debug('MarketHealth event received', {
            volatility: data.volatilityIndex.toString(),
            liquidity: data.liquidityDepth.toString()
        });

        // Update metrics from on-chain event
        this.metrics.volatility = Number(data.volatilityIndex) / 1e6; // Scale down
        this.metrics.liquidityDepth = Number(data.liquidityDepth);
    }

    /**
     * Start periodic analysis
     */
    startAnalysisLoop() {
        logger.info('Starting analysis loop', {
            interval: `${ANALYSIS.INTERVAL_MS / 1000}s`
        });

        // Run immediately
        this.analyzeAndRecommend();

        // Then run periodically
        setInterval(() => {
            this.analyzeAndRecommend();
        }, ANALYSIS.INTERVAL_MS);
    }

    /**
     * Main analysis and recommendation logic
     */
    async analyzeAndRecommend() {
        try {
            // Fetch current pool state
            await this.updatePoolState();

            // Calculate all metrics
            await this.calculateMetrics();

            // Generate recommendation
            const recommendation = this.generateRecommendation();

            logger.info('Analysis complete', {
                cexPrice: this.cexPrice?.toFixed(2),
                dexPrice: this.dexPrice?.toFixed(2),
                spread: (recommendation.spread * 100).toFixed(3) + '%',
                volatility: (recommendation.volatility * 100).toFixed(3) + '%',
                recommendedFee: recommendation.recommendedFee,
                feePct: (recommendation.recommendedFee / 10000).toFixed(2) + '%'
            });

            // Emit to policy agent
            this.emit('recommendation', recommendation);

        } catch (error) {
            logError(logger, error, { context: 'analyzeAndRecommend' });
        }
    }

    /**
     * Update pool state from blockchain
     */
    async updatePoolState() {
        const poolId = POOL.ID;
        const state = await blockchainService.getPoolState(poolId);

        if (state) {
            this.poolState = state;

            // Convert to readable price
            this.dexPrice = blockchainService.sqrtPriceToPrice(
                state.sqrtPriceX96
            );

            // Add to price history
            this.metrics.priceHistory.push({
                price: this.dexPrice,
                timestamp: Date.now()
            });

            // Keep history size manageable
            if (this.metrics.priceHistory.length > ANALYSIS.PRICE_HISTORY_SIZE) {
                this.metrics.priceHistory.shift();
            }
        }
    }

    /**
     * Calculate all metrics
     */
    async calculateMetrics() {
        // Calculate spread (difference between CEX and DEX)
        if (this.cexPrice && this.dexPrice) {
            this.metrics.spread = Math.abs(this.dexPrice - this.cexPrice) / this.cexPrice;
        }

        // Calculate realized volatility from price history
        if (this.metrics.priceHistory.length >= 2) {
            this.metrics.volatility = this.calculateVolatility();
        }
    }

    /**
     * Calculate volatility (standard deviation of returns)
     */
    calculateVolatility() {
        const prices = this.metrics.priceHistory;

        if (prices.length < 2) return 0;

        // Calculate returns
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
            returns.push(ret);
        }

        // Calculate mean
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;

        // Calculate variance
        const variance = returns.reduce((sum, ret) => {
            return sum + Math.pow(ret - mean, 2);
        }, 0) / returns.length;

        // Return standard deviation
        return Math.sqrt(variance);
    }

    /**
     * Generate fee recommendation based on metrics
     */
    generateRecommendation() {
        const { volatility, spread, liquidityDepth } = this.metrics;

        // Base fee (default)
        let recommendedFee = 3000; // 0.3%

        // Adjust based on volatility
        if (volatility > RISK.VOLATILITY_HIGH) {
            recommendedFee += 3000; // +0.3%
            logger.debug('High volatility detected, increasing fee');
        } else if (volatility > RISK.VOLATILITY_MEDIUM) {
            recommendedFee += 1000; // +0.1%
            logger.debug('Medium volatility detected, slight fee increase');
        }

        // Adjust based on spread
        if (spread > RISK.EMERGENCY_SPREAD_THRESHOLD) {
            recommendedFee += 2000; // +0.2%
            logger.warn('High spread detected!', {
                spread: (spread * 100).toFixed(3) + '%'
            });
        } else if (spread > 0.005) {
            recommendedFee += 1000; // +0.1%
        }

        // Adjust based on liquidity depth
        if (liquidityDepth > 0 && liquidityDepth < 100000) {
            recommendedFee += 500; // +0.05%
            logger.debug('Low liquidity, increasing fee');
        }

        // Calculate confidence
        const confidence = this.calculateConfidence();

        return {
            recommendedFee,
            volatility,
            spread,
            liquidityDepth,
            confidence,
            timestamp: Date.now(),
            cexPrice: this.cexPrice,
            dexPrice: this.dexPrice
        };
    }

    /**
     * Calculate confidence score (0-1)
     */
    calculateConfidence() {
        let confidence = 0.5;

        // More data = higher confidence
        const dataPoints = this.metrics.priceHistory.length;
        if (dataPoints >= ANALYSIS.PRICE_HISTORY_SIZE) {
            confidence += 0.3;
        } else if (dataPoints >= 50) {
            confidence += 0.2;
        } else if (dataPoints >= 20) {
            confidence += 0.1;
        }

        // Have both CEX and DEX prices
        if (this.cexPrice && this.dexPrice) {
            confidence += 0.2;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Stop the agent
     */
    stop() {
        priceFetcher.stop();
        logger.info('Statistical Agent stopped');
    }
}

// Run standalone if executed directly
if (require.main === module) {
    const agent = new StatisticalAgent();

    // Initialize blockchain first
    blockchainService.initialize(process.env.AGENT_PRIVATE_KEY)
        .then(() => agent.start())
        .catch((error) => {
            logger.error('Failed to start:', error);
            process.exit(1);
        });

    // Handle shutdown
    process.on('SIGINT', () => {
        agent.stop();
        process.exit(0);
    });
}

module.exports = StatisticalAgent;
