# Sentinel Agent System

AI agent swarm for autonomous Uniswap v4 liquidity management with Dual Verification (TEE + ZK-ML).

## Setup
```bash
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

## Architecture

- **Statistical Agent**: Monitors market conditions and calculates metrics
- **Policy Agent**: Makes decisions based on risk parameters
- **Execution Agent**: Builds and submits transactions

## Layer 3: Verification Bridge

**Dual Verification System:**

1. **TEE Attestation (Phala Network)**
   - Proves computation happened in secure enclave
   - Cryptographic signature verification
   - Implemented as working simulation

2. **ZK-ML Proofs (Brevis)**
   - Proves computation correctness without revealing details
   - Protects proprietary trading strategies
   - Architecture ready for production integration
   - Currently simulated for hackathon demo

**Why Both?**
- TEE proves *who* did the computation (identity)
- ZK proves *what* was computed (correctness)
- Together: Complete verifiable intelligence

## Running Individual Agents
```bash
npm run statistical  # Run only statistical agent
npm run policy       # Run only policy agent
npm run execution    # Run only execution agent
```

## Testing
```bash
npm test
```
