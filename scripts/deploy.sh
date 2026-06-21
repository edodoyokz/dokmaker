#!/bin/bash

# DokMaker Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Example: ./scripts/deploy.sh staging

set -e

ENVIRONMENT=${1:-staging}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================="
echo "DokMaker Deployment - $ENVIRONMENT"
echo "=========================================="

cd "$PROJECT_DIR"

# Step 1: Verification
echo ""
echo "Step 1: Running verification..."
npm run lint
npm run typecheck
npm test
npm run build
npx prisma validate
npx prisma migrate status
echo "✓ All verifications passed"

# Step 2: Check environment
echo ""
echo "Step 2: Checking environment variables..."
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create it from .env.example"
    exit 1
fi

# Source env file
source .env

# Check required vars
REQUIRED_VARS=(
    "DATABASE_URL"
    "DIRECT_URL"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "APP_BASE_URL"
    "PAKASIR_PROJECT_SLUG"
    "PAKASIR_API_KEY"
    "PAKASIR_WEBHOOK_URL"
    "R2_ACCOUNT_ID"
    "R2_ACCESS_KEY_ID"
    "R2_SECRET_ACCESS_KEY"
    "R2_BUCKET_NAME"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required variable: $var"
        exit 1
    fi
done
echo "✓ All required variables set"

# Step 3: Database migration
echo ""
echo "Step 3: Running database migration..."
npx prisma migrate deploy
echo "✓ Database migration completed"

# Step 4: Seed (optional for staging)
if [ "$ENVIRONMENT" = "staging" ]; then
    echo ""
    echo "Step 4: Seeding database..."
    npx prisma db seed
    echo "✓ Database seeded"
else
    echo ""
    echo "Step 4: Skipping seed for production"
fi

# Step 5: Deploy
echo ""
echo "Step 5: Deploying to $ENVIRONMENT..."

if command -v vercel &> /dev/null; then
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod
    else
        vercel
    fi
    echo "✓ Deployment completed"
else
    echo "⚠️  Vercel CLI not found. Install with: npm i -g vercel"
    echo "   Then run: vercel $([ "$ENVIRONMENT" = "production" ] && echo "--prod")"
    exit 1
fi

# Step 6: Post-deployment check
echo ""
echo "Step 6: Post-deployment verification..."
DEPLOYED_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "unknown")
echo "Deployed to: https://$DEPLOYED_URL"

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify app loads at https://$DEPLOYED_URL"
echo "2. Run smoke tests from docs/production/smoke-test-report.md"
echo "3. Configure Pakasir webhook URL"
echo "4. Monitor logs for errors"
