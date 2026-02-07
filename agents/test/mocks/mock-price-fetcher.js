/**
 * Mock Price Fetcher
 * Simulates Binance API with controllable price data
 */

const EventEmitter = require('events');

class MockPriceFetcher extends EventEmitter {
    constructor() {
        super();
        this.currentPrice = 2000;
        this.scenario = 'NORMAL';
        this.isRunning = false;
        this.interval = null;
    }

    start(intervalMs = 1000) {
        if (this.isRunning) return;

        this.isRunning = true;
        this.interval = setInterval(() => {
            const price = this.generatePrice();
            this.emit('price', {
                symbol: 'ETHUSDC',
                price: price,
                timestamp: Date.now()
            });
        }, intervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
    }

    setScenario(scenario) {
        this.scenario = scenario;
    }

    setPrice(price) {
        this.currentPrice = price;
    }

    generatePrice() {
        switch (this.scenario) {
            case 'NORMAL':
                // 1% volatility
                this.currentPrice *= (1 + (Math.random() - 0.5) * 0.02);
                break;

            case 'HIGH_VOLATILITY':
                // 5% volatility
                this.currentPrice *= (1 + (Math.random() - 0.5) * 0.10);
                break;

            case 'LOW_VOLATILITY':
                // 0.1% volatility
                this.currentPrice *= (1 + (Math.random() - 0.5) * 0.002);
                break;

            case 'CRASH':
                // Steady decline
                this.currentPrice *= 0.997;
                break;

            case 'PUMP':
                // Steady increase
                this.currentPrice *= 1.003;
                break;

            case 'STABLE':
                // Almost no movement
                this.currentPrice += (Math.random() - 0.5) * 2;
                break;
        }

        return this.currentPrice;
    }

    // Simulate fetching current price (like real API)
    async getCurrentPrice() {
        return {
            symbol: 'ETHUSDC',
            price: this.currentPrice.toString(),
            timestamp: Date.now()
        };
    }
}

module.exports = MockPriceFetcher;
