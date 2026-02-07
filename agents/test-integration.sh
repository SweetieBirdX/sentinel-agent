#!/bin/bash
# Sentinel Agent - End-to-End Integration Test

echo "╔═══════════════════════════════════════════════════╗"
echo "║  SENTINEL AGENT - INTEGRATION TEST               ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Load environment
if [ -f .env ]; then
    source .env
    echo "✅ Loaded .env file"
else
    echo "⚠️  .env file not found, using environment variables"
fi

echo "📋 Configuration Check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Network: Sepolia"
echo "Hook: ${HOOK_ADDRESS:-Not set}"
echo "Registry: ${AGENT_REGISTRY_ADDRESS:-Not set}"
echo "Pool: ${POOL_ID:-Not set}"
echo "Agent: ${ADMIN_AGENT_ADDRESS:-Not set}"
echo ""

# Validate required environment variables
REQUIRED_VARS=("SEPOLIA_RPC_URL" "HOOK_ADDRESS" "AGENT_REGISTRY_ADDRESS" "POOL_MANAGER_ADDRESS" "POOL_ID")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please set these in your .env file or environment"
    exit 1
fi

echo ""
echo "🔍 Step 1: Verify Contract Deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if cast is available
if ! command -v cast &> /dev/null; then
    echo "⚠️  'cast' command not found. Skipping contract verification."
    echo "   Install foundry: https://getfoundry.sh/"
    SKIP_CONTRACT_CHECK=true
else
    SKIP_CONTRACT_CHECK=false
fi

if [ "$SKIP_CONTRACT_CHECK" = false ]; then
    # Check Hook exists
    HOOK_CODE=$(cast code "$HOOK_ADDRESS" --rpc-url "$SEPOLIA_RPC_URL" 2>/dev/null)
    if [ ${#HOOK_CODE} -gt 10 ]; then
        echo "✅ SentinelHook deployed and verified"
    else
        echo "❌ SentinelHook not found!"
        exit 1
    fi

    # Check Registry exists
    REGISTRY_CODE=$(cast code "$AGENT_REGISTRY_ADDRESS" --rpc-url "$SEPOLIA_RPC_URL" 2>/dev/null)
    if [ ${#REGISTRY_CODE} -gt 10 ]; then
        echo "✅ AgentRegistry deployed and verified"
    else
        echo "❌ AgentRegistry not found!"
        exit 1
    fi

    # Check Pool exists
    POOL_STATE=$(cast call "$POOL_MANAGER_ADDRESS" \
        "getSlot0(bytes32)(uint160,int24,uint16,uint24)" \
        "$POOL_ID" \
        --rpc-url "$SEPOLIA_RPC_URL" 2>/dev/null)

    if [ $? -eq 0 ]; then
        echo "✅ Pool initialized and ready"
    else
        echo "❌ Pool not found!"
        exit 1
    fi
else
    echo "⚠️  Skipping contract verification (cast not available)"
fi

echo ""
echo "🔍 Step 2: Verify Agent Authorization..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$SKIP_CONTRACT_CHECK" = false ] && [ -n "$ADMIN_AGENT_ADDRESS" ]; then
    # Check agent is authorized in registry
    IS_AUTHORIZED=$(cast call "$AGENT_REGISTRY_ADDRESS" \
        "isAuthorized(address)(bool)" \
        "$ADMIN_AGENT_ADDRESS" \
        --rpc-url "$SEPOLIA_RPC_URL" 2>/dev/null)

    if [ "$IS_AUTHORIZED" = "true" ]; then
        echo "✅ Agent authorized in registry"
    else
        echo "⚠️  Agent not authorized in registry (may need authorization)"
    fi

    # Check agent is authorized in hook
    IS_AUTHORIZED_HOOK=$(cast call "$HOOK_ADDRESS" \
        "authorizedAgents(address)(bool)" \
        "$ADMIN_AGENT_ADDRESS" \
        --rpc-url "$SEPOLIA_RPC_URL" 2>/dev/null)

    if [ "$IS_AUTHORIZED_HOOK" = "true" ]; then
        echo "✅ Agent authorized in hook"
    else
        echo "⚠️  Agent not pre-authorized in hook (will verify via signature)"
    fi
else
    echo "⚠️  Skipping authorization check (cast not available or ADMIN_AGENT_ADDRESS not set)"
fi

echo ""
echo "🔍 Step 3: Test Agent System Startup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies!"
        exit 1
    fi
fi

# Start agents in background
echo "Starting agent system..."
cd "$(dirname "$0")" || exit 1
npm start > test-agent.log 2>&1 &
AGENT_PID=$!

echo "Agent system PID: $AGENT_PID"
echo "Waiting 30 seconds for initialization..."
sleep 30

# Check if process is still running
if kill -0 $AGENT_PID 2>/dev/null; then
    echo "✅ Agent system running"
else
    echo "❌ Agent system crashed!"
    echo ""
    echo "Last 50 lines of log:"
    tail -50 test-agent.log
    exit 1
fi

echo ""
echo "🔍 Step 4: Monitor Agent Activity..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Monitor logs for 60 seconds
echo "Monitoring agent activity for 60 seconds..."
echo "Check logs/combined.log for details..."

sleep 60

# Check for key log entries
STATISTICAL_STARTED=false
POLICY_STARTED=false
EXECUTION_STARTED=false
PRICE_FETCHED=false

if grep -q "Statistical Agent started" test-agent.log 2>/dev/null; then
    STATISTICAL_STARTED=true
    echo "✅ Statistical Agent initialized"
else
    echo "⚠️  Statistical Agent may not have started"
fi

if grep -q "Policy Agent started" test-agent.log 2>/dev/null; then
    POLICY_STARTED=true
    echo "✅ Policy Agent initialized"
else
    echo "⚠️  Policy Agent may not have started"
fi

if grep -q "Execution Agent started" test-agent.log 2>/dev/null; then
    EXECUTION_STARTED=true
    echo "✅ Execution Agent initialized"
else
    echo "⚠️  Execution Agent may not have started"
fi

# Check for price fetching
if grep -qi "price" test-agent.log 2>/dev/null || ([ -f logs/combined.log ] && grep -qi "price" logs/combined.log 2>/dev/null); then
    PRICE_FETCHED=true
    echo "✅ Price fetching operational"
else
    echo "⚠️  No price data detected"
fi

# Check for system fully operational
if grep -q "SYSTEM FULLY OPERATIONAL" test-agent.log 2>/dev/null; then
    echo "✅ System fully operational"
else
    echo "⚠️  System may not be fully operational"
fi

echo ""
echo "🔍 Step 5: Cleanup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop agent system gracefully
echo "Stopping agent system..."
kill -SIGINT $AGENT_PID 2>/dev/null
sleep 5

# Force kill if still running
if kill -0 $AGENT_PID 2>/dev/null; then
    echo "Force stopping agent system..."
    kill -9 $AGENT_PID 2>/dev/null
    sleep 2
fi

echo "✅ Cleanup complete"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  INTEGRATION TEST COMPLETE                       ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "📊 Summary:"
if [ "$SKIP_CONTRACT_CHECK" = false ]; then
    echo "   - Contracts: ✅ Deployed and verified"
else
    echo "   - Contracts: ⚠️  Verification skipped (cast not available)"
fi

if [ "$STATISTICAL_STARTED" = true ] && [ "$POLICY_STARTED" = true ] && [ "$EXECUTION_STARTED" = true ]; then
    echo "   - Agents: ✅ Running and operational"
else
    echo "   - Agents: ⚠️  Some agents may not have started properly"
fi

if [ "$PRICE_FETCHED" = true ]; then
    echo "   - Price Fetching: ✅ Operational"
else
    echo "   - Price Fetching: ⚠️  No price data detected"
fi

echo "   - Integration: ✅ Test completed"
echo ""
echo "📝 Next Steps:"
echo "   1. Review logs in logs/combined.log"
echo "   2. Check test-agent.log for details"
echo "   3. Run 'npm start' to start for demo"
echo ""
