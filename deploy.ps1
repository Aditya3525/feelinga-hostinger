# Feelinga Hostinger Auto Commit, Push & Deploy Script
param (
    [string]$message = "Auto deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " 🚀 Starting Auto Deployment Process" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check if git status has changes
$status = git status --porcelain
if (-not $status) {
    Write-Host "ℹ️ No changes detected to commit." -ForegroundColor Yellow
} else {
    Write-Host "📦 Staging changes..." -ForegroundColor Green
    git add .

    Write-Host "💬 Committing with message: '$message'..." -ForegroundColor Green
    git commit -m "$message"
}

# 2. Push to GitHub
Write-Host "⬆️ Pushing code to GitHub (main)..." -ForegroundColor Green
git push origin main

# 3. Optional Hostinger Webhook Trigger
$webhookFile = "$PSScriptRoot\.env"
$webhookUrl = $env:HOSTINGER_WEBHOOK_URL

if (Test-Path $webhookFile) {
    Get-Content $webhookFile | ForEach-Object {
        if ($_ -match '^HOSTINGER_WEBHOOK_URL=(.+)$') {
            $webhookUrl = $matches[1].Trim()
        }
    }
}

if ($webhookUrl) {
    Write-Host "🌐 Triggering Hostinger Auto-Deploy Webhook..." -ForegroundColor Green
    try {
        $response = Invoke-RestMethod -Uri $webhookUrl -Method Post
        Write-Host "✅ Hostinger webhook triggered successfully!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Hostinger webhook trigger failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✅ Pushed to GitHub! GitHub Actions / Hostinger Webhook will auto-deploy now." -ForegroundColor Green
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " 🎉 Deployment Finished Successfully!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
