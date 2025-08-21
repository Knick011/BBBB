# PowerShell script to start Metro with increased memory
Write-Host "Starting Metro with increased memory limit..." -ForegroundColor Green
$env:NODE_OPTIONS="--max-old-space-size=8192"
npx react-native start --reset-cache