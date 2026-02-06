const axios = require('axios');
const { API, ANALYSIS } = require('../config/constants');
const { createAgentLogger, logError } = require('./logger');

const logger = createAgentLogger('PriceFetcher');

class PriceFetcher {
    constructor() {
        this.lastPrice = null;
        this.priceHistory = [];
        this.isRunning = false;
        this.intervalId = null;
    }

    /**
     * Start fetching prices
     */
    start(callback) {
        if (this.isRunning) {
            logger.warn('Price fetcher already running');
            return;
        }

        logger.info('Starting price fetcher', {
            interval: `${ANALYSIS.PRICE_FETCH_INTERVAL_MS}ms`,
            source: 'Binance'
        });

        this.isRunning = true;

        // Fetch immediately
        this.fetchPrice(callback);

        // Then fetch on interval
        this.intervalId = setInterval(() => {
            this.fetchPrice(callback);
        }, ANALYSIS.PRICE_FETCH_INTERVAL_MS);
    }

    /**
     * Stop fetching prices
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        logger.info('Price fetcher stopped');
    }

    /**
     * Fetch current ETH/USDC price from Binance
     */
    async fetchPrice(callback) {
        try {
            const response = await axios.get(
                `${API.BINANCE_BASE_URL}/ticker/price`,
                {
                    params: { symbol: 'ETHUSDC' },
                    timeout: 5000
                }
            );

            const price = parseFloat(response.data.price);

            if (isNaN(price) || price <= 0) {
                throw new Error(`Invalid price: ${price}`);
            }

            this.lastPrice = price;
            this.priceHistory.push({
                price,
                timestamp: Date.now()
            });

            // Keep only recent history
            if (this.priceHistory.length > ANALYSIS.PRICE_HISTORY_SIZE) {
                this.priceHistory.shift();
            }

            logger.debug('Price fetched', {
                price: price.toFixed(2),
                source: 'Binance'
            });

            // Call callback with new price
            if (callback && typeof callback === 'function') {
                callback(price);
            }

            return price;

        } catch (error) {
            // Don't crash on network errors, just log
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                logger.warn('Price fetch timeout, will retry');
            } else {
                logError(logger, error, { context: 'fetchPrice' });
            }

            return this.lastPrice; // Return last known price
        }
    }

    /**
     * Get latest price
     */
    getLatestPrice() {
        return this.lastPrice;
    }

    /**
     * Get price history
     */
    getPriceHistory() {
        return this.priceHistory;
    }

    /**
     * Calculate price change percentage
     */
    getPriceChange(periodMinutes = 60) {
        if (this.priceHistory.length < 2) {
            return 0;
        }

        const now = Date.now();
        const periodMs = periodMinutes * 60 * 1000;

        // Find price from period ago
        let oldPrice = this.priceHistory[0].price;
        for (const item of this.priceHistory) {
            if (now - item.timestamp >= periodMs) {
                oldPrice = item.price;
                break;
            }
        }

        const currentPrice = this.lastPrice;
        const change = ((currentPrice - oldPrice) / oldPrice) * 100;

        return change;
    }
}

// Export singleton
const priceFetcher = new PriceFetcher();

module.exports = priceFetcher;
