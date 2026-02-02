# Aria Onchain Analyst — Pipeline Runner
# Runs the Node.js pipeline. Tweet posting handled by cron agent via browser.
# Usage: powershell -File scripts/run-pipeline.ps1

$ErrorActionPreference = "Continue"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $ProjectDir

# Clear Gabe's X tokens so Bird CLI (if it works) uses Aria's credentials
$env:AUTH_TOKEN = ''
$env:CT0 = ''

Write-Host "=== Aria Pipeline Starting ==="
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Run the pipeline
node src/index.js 2>&1
$exitCode = $LASTEXITCODE

Write-Host "=== Pipeline Complete (exit: $exitCode) ==="
exit $exitCode
