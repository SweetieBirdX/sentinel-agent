# Sentinel Agent System

AI agent swarm for autonomous Uniswap v4 liquidity management.

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
