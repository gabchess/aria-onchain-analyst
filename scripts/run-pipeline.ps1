# Aria Onchain Analyst — Pipeline Runner
# Handles browser stop/start around the Node.js pipeline
# Usage: powershell -File scripts/run-pipeline.ps1

$ErrorActionPreference = "Continue"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $ProjectDir

# Clear Gabe's X tokens so Bird CLI uses Aria's Chrome profile
$env:AUTH_TOKEN = ''
$env:CT0 = ''

Write-Host "=== Aria Pipeline Starting ==="
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Stop OpenClaw browser so Bird CLI can access cookie DB
Write-Host "Stopping OpenClaw browser..."
try { openclaw browser stop --profile openclaw 2>&1 | Out-Null } catch {}
Start-Sleep -Seconds 2

# Run the pipeline
Write-Host "Running pipeline..."
$result = node src/index.js 2>&1
$exitCode = $LASTEXITCODE
Write-Host $result

# Restart browser
Write-Host "Restarting OpenClaw browser..."
try { openclaw browser start --profile openclaw 2>&1 | Out-Null } catch {}

Write-Host "=== Pipeline Complete (exit: $exitCode) ==="
exit $exitCode
