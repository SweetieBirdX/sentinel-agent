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

## 🚀 Deployment Information

### Network
- **Chain**: Sepolia Testnet
- **Chain ID**: 11155111
- **Deployment Date**: 2026-02-06
- **Deployer**: `0xfD1e1485cEbb2f95fC2BEc916F86471A25b7d7Dd`

### Deployed Contracts

| Contract | Address | Etherscan | Status |
|----------|---------|-----------|--------|
| PoolManager (Uniswap) | `0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A` | [View](https://sepolia.etherscan.io/address/0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A) | ✅ Official |
| AgentRegistry | `0x7a6aC7FE20523A0A7E17B1734D1f87F8E30fF499` | [View](https://sepolia.etherscan.io/address/0x7a6aC7FE20523A0A7E17B1734D1f87F8E30fF499) | ✅ Verified |
| SentinelHook | `0x6379a715CfeE610248a38cdCebE9b7fd753308c0` | [View](https://sepolia.etherscan.io/address/0x6379a715CfeE610248a38cdCebE9b7fd753308c0) | ✅ Verified |
| Test Pool (ETH/USDC) | `0x9f50d60b8c19151d86a10dfadf99aa803aba1c211790853cbe0c93f4f95b84d3` | N/A (Pool ID) | ✅ Initialized |

### Hook Configuration
- **Permission Flags**: `0x4840`
- **Callbacks Enabled**:
  - ✅ beforeSwap (dynamic fees)
  - ✅ afterSwap (metrics emission)
  - ✅ beforeAddLiquidity (future use)

### Authorized Agents
- **Admin Agent**: `0x722B7327f0df62bfE99aAD50EE56b5f5aE76Fe87`
  - Reputation: 100
  - Status: Active
  - Authorized: ✅

### Environment Setup

To interact with deployed contracts:
```bash
# Copy these to your .env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
HOOK_ADDRESS=0x6379a715CfeE610248a38cdCebE9b7fd753308c0
AGENT_REGISTRY_ADDRESS=0x7a6aC7FE20523A0A7E17B1734D1f87F8E30fF499
POOL_MANAGER_ADDRESS=0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A
POOL_ID=0x9f50d60b8c19151d86a10dfadf99aa803aba1c211790853cbe0c93f4f95b84d3
ADMIN_AGENT_ADDRESS=0x722B7327f0df62bfE99aAD50EE56b5f5aE76Fe87
```

### Deployment Transactions

All transactions are on Sepolia testnet and can be verified on [Sepolia Etherscan](https://sepolia.etherscan.io).

1. **AgentRegistry Deployment** (`0x2e92b9...af7a`) - [View Tx](https://sepolia.etherscan.io/tx/0x2e92b9eacda54707aeff33c32a218b522c48c542f07449e92712156777a2af7a)
2. **SentinelHook Deployment** (`0xcc94c2...8d2`) - [View Tx](https://sepolia.etherscan.io/tx/0xcc94c208570850f247f605afc508ac110f04f6b9442ae13c1eced15a4dc7b8d2)
3. **Agent Registration** (`0x595f09...d39`) - [View Tx](https://sepolia.etherscan.io/tx/0x595f09a1a32d8b15b9a7ba185bc1e480eedbfd6d11557b95a837128e8649ad39)
4. **Agent Authorization** (`0xdf0ffe...d26`) - [View Tx](https://sepolia.etherscan.io/tx/0xdf0ffeb289ac18922b478cd5f6fb77f871f2ddc0597e321c93793810bf65bd26)
5. **Pool Creation** (`0x330c1b...26d`) - [View Tx](https://sepolia.etherscan.io/tx/0x330c1b423f3345c514492fd121721096c9a8e47d5a279096cbdd8f274018026d)

**Total Gas Used**: ~3,242,060 gas | **Cost in ETH**: ~0.003 ETH | **USD Value**: $0 (testnet)

---
*Built for ETHGlobal Hackathon - Uniswap Foundation Track*
