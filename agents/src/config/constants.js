require('dotenv').config();

module.exports = {
    // Network Configuration
    NETWORK: {
        CHAIN_ID: parseInt(process.env.SEPOLIA_CHAIN_ID || '11155111'),
        NAME: 'Sepolia',
        RPC_URL: process.env.SEPOLIA_RPC_URL
    },

    // Fee Parameters (in basis points, 10000 = 1%)
    FEE: {
        MIN: parseInt(process.env.MIN_FEE || '500'),      // 0.05%
        MAX: parseInt(process.env.MAX_FEE || '10000'),    // 1.00%
        DEFAULT: parseInt(process.env.DEFAULT_FEE || '3000')  // 0.30%
    },

    // Risk Management
    RISK: {
        MAX_FEE_CHANGE_PER_UPDATE: 3000,      // 0.3% max change
        MIN_CONFIDENCE_THRESHOLD: parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD || '0.7'),
        EMERGENCY_SPREAD_THRESHOLD: 0.02,     // 2%
        VOLATILITY_HIGH: 0.05,                // 5%
        VOLATILITY_MEDIUM: 0.02,              // 2%
        MAX_SLIPPAGE: 0.005                   // 0.5%
    },

    // Analysis Parameters
    ANALYSIS: {
        PRICE_HISTORY_SIZE: parseInt(process.env.VOLATILITY_WINDOW_SIZE || '100'),
        INTERVAL_MS: parseInt(process.env.ANALYSIS_INTERVAL_MS || '30000'),
        PRICE_FETCH_INTERVAL_MS: parseInt(process.env.PRICE_FETCH_INTERVAL_MS || '5000')
    },

    // Blockchain
    BLOCKCHAIN: {
        CONFIRMATION_BLOCKS: 2,
        GAS_BUFFER_PERCENT: 20,
        MAX_GAS_PRICE_GWEI: 50,        // Max gas price willing to pay
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY_MS: 5000
    },

    // Pool Configuration
    POOL: {
        ID: process.env.POOL_ID,
        TOKEN0: process.env.TOKEN0_ADDRESS,
        TOKEN1: process.env.TOKEN1_ADDRESS
    },

    // External APIs
    API: {
        BINANCE_BASE_URL: process.env.BINANCE_API_URL || 'https://api.binance.com/api/v3'
    },

    // Logging
    LOG: {
        LEVEL: process.env.LOG_LEVEL || 'info',
        TO_FILE: process.env.LOG_TO_FILE === 'true',
        MAX_FILES: 5,
        MAX_SIZE: 5242880  // 5MB
    }
};
