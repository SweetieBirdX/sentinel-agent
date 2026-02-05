# 🔒 Sentinel Agent

> Trustless Intelligence for Autonomous Liquidity

Autonomous liquidity management system for Uniswap v4 that uses AI agents to optimize pools, prevent LVR attacks, and redistribute MEV to liquidity providers.

## Track
Uniswap Foundation - Agentic Finance ($5,000 prize pool)

## Problem
LPs on Uniswap v4 lose an estimated $500M+ annually to Loss-Versus-Rebalancing (LVR) - arbitrageurs exploit stale AMM prices.

## Solution
- AI agents predict and prevent LVR attacks
- Dynamic fees based on verifiable off-chain intelligence  
- MEV capture and redistribution to LPs
- Runs in Trusted Execution Environments for transparency

## Quick Start
```bash
forge install
forge test
forge script script/Anvil.s.sol --rpc-url http://localhost:8545 --broadcast
```

## Tech Stack
- Solidity 0.8.26 + Foundry
- Uniswap v4 Hooks (beforeSwap, afterSwap, beforeAddLiquidity)
- Phala Network (TEE)
- Brevis (ZK-ML)

## 🚀 Deployed Contracts (Sepolia Testnet)

### Contract Addresses
- **AgentRegistry**: `0x7a6aC7FE20523A0A7E17B1734D1f87F8E30fF499`
  - [View on Etherscan](https://sepolia.etherscan.io/address/0x7a6aC7FE20523A0A7E17B1734D1f87F8E30fF499)
- **SentinelHook**: `0x6379a715CfeE610248a38cdCebE9b7fd753308c0`
  - [View on Etherscan](https://sepolia.etherscan.io/address/0x6379a715CfeE610248a38cdCebE9b7fd753308c0)
- **PoolManager**: `0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A` (Official Uniswap)

---
*Built for ETHGlobal Hackathon - Uniswap Foundation Track*
