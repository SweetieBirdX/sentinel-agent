$env:Path = "$env:USERPROFILE\.foundry\bin;" + $env:Path
# Load .env variables
Get-Content .env | ForEach-Object { 
    if ($_ -match "^([^#][^=]*)=(.*)$") { 
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process") 
    } 
}

Write-Host "========================================="
Write-Host "SENTINEL AGENT - DEPLOYMENT VERIFICATION"
Write-Host "========================================="
Write-Host ""

Write-Host "📋 Checking Contract Addresses..."
Write-Host "AgentRegistry: $env:AGENT_REGISTRY_ADDRESS"
Write-Host "SentinelHook: $env:HOOK_ADDRESS"
Write-Host "PoolManager: $env:POOL_MANAGER_ADDRESS"
Write-Host "Pool ID: $env:POOL_ID"
Write-Host ""

Write-Host "🔍 Verifying AgentRegistry..."
$OWNER = cast call $env:AGENT_REGISTRY_ADDRESS 'owner()(address)' --rpc-url $env:SEPOLIA_RPC_URL
Write-Host "Owner: $OWNER"
if ($OWNER -eq $env:DEPLOYER_ADDRESS) {
  Write-Host "✅ Owner correct"
} else {
  Write-Host "❌ Owner mismatch!"
}
Write-Host ""

Write-Host "🔍 Verifying SentinelHook..."
$REGISTRY = cast call $env:HOOK_ADDRESS 'agentRegistry()(address)' --rpc-url $env:SEPOLIA_RPC_URL
Write-Host "Registry in Hook: $REGISTRY"
if ($REGISTRY -eq $env:AGENT_REGISTRY_ADDRESS) {
  Write-Host "✅ Registry correct"
} else {
  Write-Host "❌ Registry mismatch!"
}
Write-Host ""

Write-Host "🔍 Verifying Agent Authorization..."
$IS_AUTH = cast call $env:AGENT_REGISTRY_ADDRESS 'isAuthorized(address)(bool)' $env:ADMIN_AGENT_ADDRESS --rpc-url $env:SEPOLIA_RPC_URL
Write-Host "Agent Authorized in Registry: $IS_AUTH"
$IS_AUTH_HOOK = cast call $env:HOOK_ADDRESS 'authorizedAgents(address)(bool)' $env:ADMIN_AGENT_ADDRESS --rpc-url $env:SEPOLIA_RPC_URL
Write-Host "Agent Authorized in Hook: $IS_AUTH_HOOK"
Write-Host ""

Write-Host "🔍 Verifying Pool..."
try {
    # Check if pool is initialized by querying slot0
    # Note: Using 2>$null isn't native PS error redirection for external commands in all versions, but `cast` output handles it. We check LASTEXITCODE.
    cast call $env:POOL_MANAGER_ADDRESS 'getSlot0(bytes32)(uint160,int24,uint16,uint24)' $env:POOL_ID --rpc-url $env:SEPOLIA_RPC_URL | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Pool exists and initialized"
    } else {
        Write-Host "❌ Pool not found or not initialized"
    }
} catch {
    Write-Host "❌ Pool verification failed"
    Write-Host $_
}
Write-Host ""

Write-Host "📊 Wallet Balances..."
$DEPLOYER_BAL = cast balance $env:DEPLOYER_ADDRESS --rpc-url $env:SEPOLIA_RPC_URL
$AGENT_BAL = cast balance $env:ADMIN_AGENT_ADDRESS --rpc-url $env:SEPOLIA_RPC_URL
$DEPLOYER_ETH = cast --to-unit $DEPLOYER_BAL ether
$AGENT_ETH = cast --to-unit $AGENT_BAL ether
Write-Host "Deployer: $DEPLOYER_ETH ETH"
Write-Host "Agent: $AGENT_ETH ETH"
Write-Host ""

Write-Host "========================================="
Write-Host "VERIFICATION COMPLETE"
Write-Host "========================================="
