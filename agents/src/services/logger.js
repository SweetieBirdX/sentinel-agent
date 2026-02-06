const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { LOG } = require('../config/constants');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, agent, ...meta }) => {
        let log = `${timestamp} [${level}]`;

        if (agent) {
            log += ` [${agent}]`;
        }

        log += `: ${message}`;

        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }

        return log;
    })
);

// File format (JSON for easy parsing)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Create transports
const transports = [
    // Console output
    new winston.transports.Console({
        format: consoleFormat,
        level: LOG.LEVEL
    })
];

// File output (if enabled)
if (LOG.TO_FILE) {
    transports.push(
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: LOG.MAX_SIZE,
            maxFiles: LOG.MAX_FILES
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: fileFormat,
            maxsize: LOG.MAX_SIZE,
            maxFiles: LOG.MAX_FILES
        })
    );
}

// Create logger
const logger = winston.createLogger({
    level: LOG.LEVEL,
    transports,
    exitOnError: false
});

// Create child logger for specific agent
function createAgentLogger(agentName) {
    return logger.child({ agent: agentName });
}

// Helper to log transaction
function logTransaction(logger, txHash, description) {
    logger.info(`Transaction: ${description}`, {
        txHash,
        etherscan: `https://sepolia.etherscan.io/tx/${txHash}`
    });
}

// Helper to log error with stack
function logError(logger, error, context = {}) {
    logger.error(error.message, {
        ...context,
        stack: error.stack,
        name: error.name
    });
}

module.exports = {
    logger,
    createAgentLogger,
    logTransaction,
    logError
};
