# 🎬 Sentinel Agent - Live Demo Script

> **Duration**: 3 minutes  
> **Audience**: Hackathon judges, developers, DeFi enthusiasts  
> **Goal**: Demonstrate autonomous AI agent system operating in real-time

---

## 📋 Pre-Demo Setup (2 minutes before demo)

### Terminal 1: Agent System
```bash
cd agents
npm start
```

**Expected Output:**
```
╔═══════════════════════════════════════════╗
║   🔒 SENTINEL AGENT SYSTEM STARTING...   ║
╚═══════════════════════════════════════════╝

📡 Connecting to blockchain...
✅ Blockchain service initialized successfully
🤖 Initializing agent swarm...
🔬 Starting Statistical Agent...
✅ Phala TEE service initialized
✅ Brevis ZK-ML service initialized
✅ Statistical Agent started
⚖️  Starting Policy Agent...
✅ Policy Agent started
⚡ Starting Execution Agent...
✅ Execution Agent started

╔═══════════════════════════════════════════╗
║     ✅ SYSTEM FULLY OPERATIONAL          ║
╚═══════════════════════════════════════════╝
```

### Terminal 2: Live Log Monitoring
```bash
cd agents
tail -f logs/combined.log
```

**Alternative (if logs not enabled):**
```bash
# Watch the main terminal output
# Or use: npm start | tee demo-output.log
```

### Browser Tabs (Pre-open):

1. **Sepolia Etherscan - SentinelHook**
   - URL: https://sepolia.etherscan.io/address/0x6379a715CfeE610248a38cdCebE9b7fd753308c0
   - Tab: "Events" section

2. **Sepolia Etherscan - PoolManager**
   - URL: https://sepolia.etherscan.io/address/0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A
   - Tab: "Events" section

3. **Binance - ETH/USDC Price**
   - URL: https://www.binance.com/en/trade/ETH_USDC
   - For real-time price comparison

4. **AgentRegistry (Optional)**
   - URL: https://sepolia.etherscan.io/address/0x7a6aC7FE20523A0A7E17B1734D1f87F8E30fF499

---

## 🎯 Demo Flow (3 minutes)

### Part 1: Introduction & System Overview (30 seconds)

**SAY:**
> "Sentinel Agent is an autonomous liquidity management system for Uniswap v4.
> It uses AI agents to prevent LVR attacks and optimize fees in real-time.
> 
> The problem: LPs lose $500M+ annually to Loss-Versus-Rebalancing - arbitrageurs
> exploit stale AMM prices.
> 
> Our solution: Autonomous AI agents that predict and prevent LVR attacks by
> dynamically adjusting fees based on real market conditions.
> 
> Watch as the system operates completely autonomously..."

**SHOW:** Terminal 1 with agents running

**POINT OUT:**
- Three agents initialized and running
- System status: "FULLY OPERATIONAL"
- No human intervention required

---

### Part 2: Agent System Operation (1 minute)

**SAY:**
> "The system has three autonomous agents working together in a pipeline:
> 
> 1. **Statistical Agent** - Monitors market conditions, fetches prices, calculates volatility
> 2. **Policy Agent** - Makes risk-based decisions about fee adjustments
> 3. **Execution Agent** - Prepares signed transactions with TEE attestations
> 
> Let me show you the live logs..."

**SWITCH TO:** Terminal 2 (live logs)

**POINT OUT IN LOGS:**

Look for entries like:
```
[Statistical] Price fetched: $2,450.32
[Statistical] Volatility: 0.034 (3.4%)
[Statistical] Spread: 0.0015 (0.15%)
[Statistical] Recommendation: fee=4500, confidence=0.85
[Policy] Processing recommendation
[Policy] Fee recommendation approved: 4500 (0.45%)
[Policy] Reason: Medium volatility, increasing fee
[Execution] ⚡ Preparing instruction
[Execution] HookData prepared
[Execution] ✅ Instruction executed successfully (TEE attested)
```

**EXPLAIN:**
> "You can see the agents working in real-time:
> - The Statistical Agent is fetching prices every 5 seconds
> - It's calculating volatility from price history
> - The Policy Agent is evaluating recommendations
> - The Execution Agent is preparing signed instructions
> 
> All of this is happening automatically, continuously, without any human input."

---

### Part 3: Key Innovation - Autonomous Decision Making (1 minute)

**SAY:**
> "The key innovation here is that these agents are AUTONOMOUS economic actors.
> They're not just executing user commands - they're making independent decisions
> based on real market data, with built-in risk management.
> 
> Let me show you a specific decision cycle..."

**WAIT FOR** a recommendation to appear in logs (or point to a recent one)

**SHOW:** A complete decision cycle in the logs

**EXAMPLE LOG ENTRY TO HIGHLIGHT:**
```
[Statistical] Recommendation: {
  "recommendedFee": 4500,
  "volatility": 0.034,
  "spread": 0.0015,
  "confidence": 0.85
}
[Policy] Fee recommendation approved: 4500 (0.45%)
[Policy] Reason: Medium volatility, increasing fee
[Execution] ⚡ Preparing instruction { fee: 4500, feePct: "0.45%" }
[Execution] HookData prepared { hasAttestation: true }
[Execution] ✅ Instruction executed successfully (TEE attested)
```

**EXPLAIN:**
> "Here's what just happened:
> 
> 1. The Statistical Agent detected 3.4% volatility in the market
> 2. It calculated that the current fee should be increased to 0.45%
> 3. The Policy Agent evaluated this against risk parameters:
>    - Confidence level: 85% (above threshold)
>    - Volatility: Medium (within acceptable range)
>    - Fee change: Within safety limits
> 4. The Policy Agent approved the recommendation
> 5. The Execution Agent prepared a signed instruction with TEE attestation
> 6. The instruction is ready to be used in the next swap
> 
> All of this happened automatically - no human intervention.
> The agents are making economic decisions based on real-time market data."

**HIGHLIGHT:**
> "Notice the TEE attestation - this proves the computation happened in a
> secure enclave. The hook can verify this on-chain before accepting the fee."

---

### Part 4: On-Chain Verification (30 seconds)

**SAY:**
> "Everything is verifiable on-chain. Let me show you..."

**SWITCH TO:** Browser - Etherscan Hook Contract

**SHOW:**
- Navigate to "Events" tab
- Look for `MarketHealth` events

**SAY:**
> "These MarketHealth events are emitted by the hook after every swap.
> They contain:
> - Pool ID
> - Volatility index
> - Liquidity depth
> - Imbalance ratio
> 
> This proves the hook is actively monitoring and the agents are responding
> to real market conditions."

**SWITCH TO:** PoolManager Events (if time permits)

**SAY:**
> "When a swap happens with our hook, you can see the dynamic fee being applied.
> The fee is determined by the agents' analysis, not a fixed value."

---

## 🎬 Closing Statement (if time permits)

**SAY:**
> "In summary, Sentinel Agent demonstrates:
> 
> ✅ **Autonomous Operation** - Agents make decisions without human input
> ✅ **Real-time Market Response** - Reacts to volatility and spread changes
> ✅ **Risk Management** - Built-in safeguards prevent extreme fee changes
> ✅ **Verifiable Intelligence** - TEE attestations prove computation integrity
> ✅ **On-chain Transparency** - All decisions are verifiable on Etherscan
> 
> This is the future of DeFi - autonomous, intelligent, and verifiable."

---

## 🛠️ Troubleshooting

### If agents don't start:
1. Check `.env` file has all required variables
2. Verify RPC URL is working: `curl $SEPOLIA_RPC_URL`
3. Check node_modules: `npm install`

### If no logs appear:
1. Check `LOG_TO_FILE=true` in `.env`
2. Verify `logs/` directory exists
3. Check file permissions

### If price fetching fails:
1. Check internet connection
2. Verify Binance API is accessible
3. Check logs for specific error messages

### If demo runs too fast:
- Pause between sections
- Explain each log entry in detail
- Show multiple decision cycles

### If demo runs too slow:
- Skip to Part 3 (Key Innovation)
- Show pre-recorded log snippets
- Focus on one complete decision cycle

---

## 📝 Demo Checklist

Before starting:
- [ ] Agents running in Terminal 1
- [ ] Logs monitoring in Terminal 2
- [ ] All browser tabs open
- [ ] Internet connection stable
- [ ] Screen sharing ready (if remote)

During demo:
- [ ] Show system startup (Part 1)
- [ ] Show live logs (Part 2)
- [ ] Explain decision cycle (Part 3)
- [ ] Show on-chain events (Part 4)
- [ ] Answer questions clearly

After demo:
- [ ] Stop agents gracefully (Ctrl+C)
- [ ] Save logs if needed
- [ ] Note any questions for follow-up

---

## 🎥 Recording Tips

If recording the demo:
1. **Start recording before setup** - Show the full startup process
2. **Use screen recording software** - OBS, Loom, or QuickTime
3. **Record at 1080p minimum** - Logs need to be readable
4. **Include audio** - Explain what's happening
5. **Keep it under 3 minutes** - Focus on key points
6. **Edit if needed** - Remove pauses, add captions

---

## 📊 Key Metrics to Highlight

During the demo, emphasize:
- **Response Time**: Agents react within seconds
- **Autonomy**: Zero human intervention
- **Accuracy**: Confidence scores in recommendations
- **Safety**: Risk management prevents extreme changes
- **Transparency**: All decisions verifiable on-chain

---

**Good luck with your demo! 🚀**
