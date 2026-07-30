#!/usr/bin/env bash
set -e

MESSAGE="${1:-Auto deploy: $(date '+%Y-%m-%d %H:%M:%S')}"

echo "=========================================="
echo " 🚀 Starting Auto Deployment Process"
echo "=========================================="

if [ -z "$(git status --porcelain)" ]; then
    echo "ℹ️ No changes detected to commit."
else
    echo "📦 Staging changes..."
    git add .
    echo "💬 Committing: '$MESSAGE'..."
    git commit -m "$MESSAGE"
fi

echo "⬆️ Pushing code to GitHub (main)..."
git push origin main

WEBHOOK_URL="${HOSTINGER_WEBHOOK_URL}"

if [ -f ".env" ]; then
    ENV_URL=$(grep "^HOSTINGER_WEBHOOK_URL=" .env | cut -d '=' -f2-)
    if [ -n "$ENV_URL" ]; then
        WEBHOOK_URL="$ENV_URL"
    fi
fi

if [ -n "$WEBHOOK_URL" ]; then
    echo "🌐 Triggering Hostinger Auto-Deploy Webhook..."
    curl -X POST "$WEBHOOK_URL"
    echo -e "\n✅ Hostinger webhook triggered successfully!"
else
    echo "✅ Pushed to GitHub! GitHub Actions / Hostinger Webhook will auto-deploy now."
fi

echo "=========================================="
echo " 🎉 Deployment Finished Successfully!"
echo "=========================================="
