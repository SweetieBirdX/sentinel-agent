const StatisticalAgent = require('../src/agents/statistical-agent');
const PolicyAgent = require('../src/agents/policy-agent');
const ExecutionAgent = require('../src/agents/execution-agent');

describe('Sentinel Agent System Tests', () => {
    let statisticalAgent, policyAgent, executionAgent;

    beforeAll(() => {
        // Mock environment
        process.env.SEPOLIA_RPC_URL = 'https://sepolia.example.com';
        process.env.AGENT_PRIVATE_KEY = '0x' + '1'.repeat(64);
        process.env.HOOK_ADDRESS = '0x' + '2'.repeat(40);
        process.env.POOL_ID = '0x' + '3'.repeat(64);
    });

    describe('Statistical Agent', () => {
        beforeEach(() => {
            statisticalAgent = new StatisticalAgent();
        });

        test('should initialize correctly', () => {
            expect(statisticalAgent).toBeDefined();
            expect(statisticalAgent.metrics).toBeDefined();
        });

        test('should calculate volatility from price history', () => {
            // Add mock price history
            statisticalAgent.metrics.priceHistory = [
                { price: 2000, timestamp: Date.now() - 5000 },
                { price: 2010, timestamp: Date.now() - 4000 },
                { price: 2005, timestamp: Date.now() - 3000 },
                { price: 2020, timestamp: Date.now() - 2000 },
                { price: 2015, timestamp: Date.now() - 1000 }
            ];

            const volatility = statisticalAgent.calculateVolatility();
            expect(volatility).toBeGreaterThan(0);
            expect(volatility).toBeLessThan(1);
        });

        test('should generate valid recommendations', () => {
            statisticalAgent.cexPrice = 2000;
            statisticalAgent.dexPrice = 2010;
            statisticalAgent.metrics.volatility = 0.03;
            statisticalAgent.metrics.spread = 0.005;

            const recommendation = statisticalAgent.generateRecommendation();

            expect(recommendation).toHaveProperty('recommendedFee');
            expect(recommendation.recommendedFee).toBeGreaterThanOrEqual(500);
            expect(recommendation.recommendedFee).toBeLessThanOrEqual(10000);
            expect(recommendation).toHaveProperty('confidence');
        });
    });

    describe('Policy Agent', () => {
        beforeEach(() => {
            statisticalAgent = new StatisticalAgent();
            policyAgent = new PolicyAgent(statisticalAgent);
        });

        test('should initialize correctly', () => {
            expect(policyAgent).toBeDefined();
            expect(policyAgent.lastFee).toBe(3000);
        });

        test('should reject low confidence recommendations', () => {
            const decision = policyAgent.applyDecisionRules({
                recommendedFee: 4000,
                volatility: 0.02,
                spread: 0.001,
                confidence: 0.5  // Below threshold
            });

            expect(decision.approved).toBe(false);
            expect(decision.reason).toContain('confidence');
        });

        test('should limit fee changes', () => {
            policyAgent.lastFee = 3000;

            const decision = policyAgent.applyDecisionRules({
                recommendedFee: 8000,  // Too big of a jump
                volatility: 0.02,
                spread: 0.001,
                confidence: 0.9
            });

            const feeChange = Math.abs(decision.approvedFee - 3000);
            expect(feeChange).toBeLessThanOrEqual(3000);
        });

        test('should activate emergency mode on high spread', () => {
            const decision = policyAgent.applyDecisionRules({
                recommendedFee: 4000,
                volatility: 0.02,
                spread: 0.03,  // Above emergency threshold
                confidence: 0.9
            });

            expect(decision.approvedFee).toBe(10000);  // MAX_FEE
            expect(decision.reason).toContain('EMERGENCY');
        });
    });

    describe('Execution Agent', () => {
        beforeEach(() => {
            statisticalAgent = new StatisticalAgent();
            policyAgent = new PolicyAgent(statisticalAgent);
            executionAgent = new ExecutionAgent(policyAgent);
        });

        test('should initialize correctly', () => {
            expect(executionAgent).toBeDefined();
            expect(executionAgent.pendingTxs).toBeDefined();
        });

        test('should encode hookData correctly', () => {
            const instruction = {
                fee: 3500,
                signer: '0x' + '1'.repeat(40),
                signature: '0x' + '2'.repeat(130)
            };

            const hookData = executionAgent.encodeHookData(instruction);

            expect(hookData).toBeDefined();
            expect(hookData.startsWith('0x')).toBe(true);
        });
    });
});
