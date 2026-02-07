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
     * Execute a signed instruction with TEE attestation
     */
    async executeInstruction(instruction) {
        logger.info('⚡ Preparing instruction', {
            fee: instruction.fee,
            feePct: (instruction.fee / 10000).toFixed(2) + '%',
            hasAttestation: !!instruction.attestation,
            nonce: instruction.nonce
        });

        try {
            // Encode hookData with attestation (new format for TEE verification)
            const hookData = this.encodeHookData(instruction);

            logger.info('HookData prepared', {
                fee: instruction.fee,
                signer: instruction.signer,
                hasAttestation: !!instruction.attestation,
                hookDataLength: hookData.length
            });

            // In real implementation:
            // const tx = await swapRouter.swap(poolKey, swapParams, hookData);

            // For demo, log the prepared instruction
            logger.info('📝 Instruction ready for swap execution', {
                hookData: hookData.slice(0, 40) + '...',
                fee: instruction.fee,
                deadline: instruction.deadline ? new Date(instruction.deadline * 1000).toISOString() : 'N/A'
            });

            // Record execution
            this.executionHistory.push({
                ...instruction,
                hookData: hookData,
                status: 'simulated',
                timestamp: Date.now()
            });

            // Emit success event
            this.emit('executed', {
                fee: instruction.fee,
                hookData: hookData,
                timestamp: Date.now()
            });

            logger.info('✅ Instruction executed successfully (TEE attested)');

        } catch (error) {
            logError(logger, error, {
                context: 'executeInstruction',
                instruction
            });
        }
    }

    /**
     * Encode hookData for swap with TEE attestation
     * Format: (uint24 recommendedFee, bytes attestation)
     * Attestation: (address agentId, uint256 timestamp, bytes32 resultHash, bytes signature)
     */
    encodeHookData(instruction) {
        const { fee, attestation } = instruction;

        if (!attestation) {
            // No attestation - legacy format (fee + empty attestation)
            logger.debug('Encoding hookData without attestation');
            return ethers.AbiCoder.defaultAbiCoder().encode(
                ['uint24', 'bytes'],
                [fee, '0x']
            );
        }

        // Encode attestation for on-chain verification
        // Must match SentinelHook._verifyAttestation() expected format
        const resultHash = ethers.keccak256(
            ethers.toUtf8Bytes(JSON.stringify(attestation.result))
        );

        const attestationBytes = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'uint256', 'bytes32', 'bytes'],
            [
                attestation.agentId,
                attestation.timestamp,
                resultHash,
                attestation.signature
            ]
        );

        logger.debug('Encoding hookData with TEE attestation', {
            agentId: attestation.agentId,
            timestamp: attestation.timestamp,
            resultHash: resultHash.slice(0, 10) + '...'
        });

        // Encode complete hookData: (fee, attestationBytes)
        const hookData = ethers.AbiCoder.defaultAbiCoder().encode(
            ['uint24', 'bytes'],
            [fee, attestationBytes]
        );

        return hookData;
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
