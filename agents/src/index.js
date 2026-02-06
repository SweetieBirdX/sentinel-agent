require('dotenv').config();
const blockchainService = require('./services/blockchain');
const { logger } = require('./services/logger');
const StatisticalAgent = require('./agents/statistical-agent');
const PolicyAgent = require('./agents/policy-agent');
const ExecutionAgent = require('./agents/execution-agent');

class SentinelAgentSystem {
    constructor() {
        this.agents = {};
        this.isRunning = false;
    }

    /**
     * Initialize and start the entire system
     */
    async start() {
        logger.info('');
        logger.info('╔═══════════════════════════════════════════╗');
        logger.info('║   🔒 SENTINEL AGENT SYSTEM STARTING...   ║');
        logger.info('╚═══════════════════════════════════════════╝');
        logger.info('');

        try {
            // Validate environment
            this.validateEnvironment();

            // Initialize blockchain connection
            logger.info('📡 Connecting to blockchain...');
            await blockchainService.initialize(process.env.AGENT_PRIVATE_KEY);

            // Initialize agents in order
            logger.info('');
            logger.info('🤖 Initializing agent swarm...');

            // Statistical Agent (data collection)
            this.agents.statistical = new StatisticalAgent();
            await this.agents.statistical.start();

            // Policy Agent (decision making)
            this.agents.policy = new PolicyAgent(this.agents.statistical);
            await this.agents.policy.start();

            // Execution Agent (transaction execution)
            this.agents.execution = new ExecutionAgent(this.agents.policy);
            await this.agents.execution.start();

            // Start health monitoring
            this.startHealthMonitor();

            // Setup graceful shutdown
            this.setupShutdownHandlers();

            this.isRunning = true;

            logger.info('');
            logger.info('╔═══════════════════════════════════════════╗');
            logger.info('║     ✅ SYSTEM FULLY OPERATIONAL          ║');
            logger.info('╚═══════════════════════════════════════════╝');
            logger.info('');
            logger.info(`📊 Monitoring pool: ${process.env.POOL_ID}`);
            logger.info(`🏦 Hook address: ${process.env.HOOK_ADDRESS}`);
            logger.info(`👤 Agent address: ${blockchainService.wallet.address}`);
            logger.info('');
            logger.info('Press Ctrl+C to stop gracefully');
            logger.info('');

        } catch (error) {
            logger.error('Failed to start system:', error);
            process.exit(1);
        }
    }

    /**
     * Validate required environment variables
     */
    validateEnvironment() {
        const required = [
            'SEPOLIA_RPC_URL',
            'AGENT_PRIVATE_KEY',
            'HOOK_ADDRESS',
            'AGENT_REGISTRY_ADDRESS',
            'POOL_MANAGER_ADDRESS',
            'POOL_ID'
        ];

        const missing = required.filter(key => !process.env[key]);

        if (missing.length > 0) {
            logger.error('❌ Missing required environment variables:');
            missing.forEach(key => logger.error(`   - ${key}`));
            logger.error('');
            logger.error('Please check your .env file');
            process.exit(1);
        }

        logger.info('✅ Environment validated');
    }

    /**
     * Start health monitoring
     */
    startHealthMonitor() {
        setInterval(() => {
            const status = {
                uptime: Math.floor(process.uptime()),
                memory: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
                agents: {
                    statistical: {
                        dataPoints: this.agents.statistical.metrics.priceHistory.length,
                        lastPrice: this.agents.statistical.cexPrice
                    },
                    policy: {
                        decisions: this.agents.policy.decisionHistory.length,
                        lastFee: this.agents.policy.lastFee
                    },
                    execution: {
                        executions: this.agents.execution.executionHistory.length,
                        pending: this.agents.execution.pendingTxs.size
                    }
                }
            };

            logger.debug('Health check', {
                uptime: `${status.uptime}s`,
                memory: `${status.memory}MB`,
                dataPoints: status.agents.statistical.dataPoints,
                decisions: status.agents.policy.decisions
            });

            // Alert if issues detected
            if (status.agents.statistical.dataPoints === 0 && status.uptime > 60) {
                logger.warn('⚠️  Statistical agent has no data after 60s');
            }

        }, 60000); // Every minute
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupShutdownHandlers() {
        const shutdown = async (signal) => {
            if (!this.isRunning) return;

            logger.info('');
            logger.info(`📴 Received ${signal}, shutting down gracefully...`);
            this.isRunning = false;

            // Stop agents in reverse order
            logger.info('Stopping agents...');
            if (this.agents.execution) this.agents.execution.stop();
            if (this.agents.policy) this.agents.policy.stop();
            if (this.agents.statistical) this.agents.statistical.stop();

            // Wait for pending work
            if (this.agents.execution && this.agents.execution.pendingTxs.size > 0) {
                logger.info('Waiting for pending transactions...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }

            logger.info('');
            logger.info('👋 Shutdown complete. Goodbye!');
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

        process.on('uncaughtException', (error) => {
            logger.error('💥 Uncaught exception:', error);
            shutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('💥 Unhandled rejection:', { reason, promise });
        });
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            running: this.isRunning,
            uptime: process.uptime(),
            agents: {
                statistical: this.agents.statistical ? 'running' : 'stopped',
                policy: this.agents.policy ? 'running' : 'stopped',
                execution: this.agents.execution ? 'running' : 'stopped'
            }
        };
    }
}

// Start the system
const system = new SentinelAgentSystem();
system.start().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
});

module.exports = SentinelAgentSystem;
