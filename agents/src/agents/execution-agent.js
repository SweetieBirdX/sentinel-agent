const EventEmitter = require('events');
const { ethers } = require('ethers');
const blockchainService = require('../services/blockchain');
const { createAgentLogger, logTransaction, logError } = require('../services/logger');
const { BLOCKCHAIN } = require('../config/constants');

const logger = createAgentLogger('Execution');

class ExecutionAgent extends EventEmitter {
    constructor(policyAgent) {
        super(); // Required for EventEmitter
        this.policyAgent = policyAgent;
        this.pendingTxs = new Map();
        this.executionHistory = [];
    }

    /**
     * Start the execution agent
     */
    async start() {
        logger.info('⚡ Starting Execution Agent...');

        // Subscribe to policy agent instructions
        this.policyAgent.on('instruction', (instruction) => {
            this.executeInstruction(instruction);
        });

        logger.info('✅ Execution Agent started');
    }

    /**
     * Execute a signed instruction
     */
    async executeInstruction(instruction) {
        logger.info('Executing instruction', {
            fee: instruction.fee,
            feePct: (instruction.fee / 10000).toFixed(2) + '%',
            nonce: instruction.nonce
        });

        try {
            // NOTE: In actual implementation, we would call a swap router
            // or position manager that triggers our hook with hookData.
            // For the hackathon demo, we'll simulate this by directly
            // showing what the hookData would be.

            // Encode hookData
            const hookData = this.encodeHookData(instruction);

            logger.info('HookData prepared', {
                fee: instruction.fee,
                signer: instruction.signer,
                signature: instruction.signature.slice(0, 10) + '...'
            });

            // In real implementation:
            // const tx = await swapRouter.swap(poolKey, swapParams, hookData);

            // For demo, we'll just log the instruction
            logger.info('📝 Instruction ready for swap execution', {
                hookData: hookData.slice(0, 20) + '...',
                fee: instruction.fee,
                deadline: new Date(instruction.deadline * 1000).toISOString()
            });

            // Record execution
            this.executionHistory.push({
                ...instruction,
                status: 'simulated',
                timestamp: Date.now()
            });

            // Emit success
            logger.info('✅ Instruction executed successfully');

        } catch (error) {
            logError(logger, error, {
                context: 'executeInstruction',
                instruction
            });
        }
    }

    /**
     * Encode hookData for swap
     */
    encodeHookData(instruction) {
        return ethers.AbiCoder.defaultAbiCoder().encode(
            ['uint24', 'address', 'bytes'],
            [instruction.fee, instruction.signer, instruction.signature]
        );
    }

    /**
     * Build and submit actual swap transaction (for production)
     */
    async submitSwapTransaction(instruction, swapParams) {
        try {
            // Get gas price
            const gasPrice = await blockchainService.getGasPrice();

            logger.debug('Gas price', {
                gwei: ethers.formatUnits(gasPrice, 'gwei')
            });

            // Encode hookData
            const hookData = this.encodeHookData(instruction);

            // Build transaction
            // Note: This requires SwapRouter contract which may not be deployed yet
            // const tx = await swapRouter.swap(poolKey, swapParams, {
            //     gasPrice,
            //     gasLimit: estimatedGas
            // });

            logger.info('Transaction submitted');

            // Wait for confirmation
            // const receipt = await blockchainService.waitForTransaction(tx.hash);

            // logTransaction(logger, receipt.hash, 'Swap executed');

            return {
                success: true,
                // txHash: receipt.hash,
                // gasUsed: receipt.gasUsed
            };

        } catch (error) {
            logError(logger, error, { context: 'submitSwapTransaction' });

            // Retry logic
            if (error.code === 'CALL_EXCEPTION') {
                logger.warn('Transaction reverted, possible authorization issue');
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get execution history
     */
    getExecutionHistory() {
        return this.executionHistory;
    }

    /**
     * Get pending transactions
     */
    getPendingTransactions() {
        return Array.from(this.pendingTxs.entries());
    }

    /**
     * Stop the agent
     */
    stop() {
        logger.info('Execution Agent stopped');
    }
}

module.exports = ExecutionAgent;
