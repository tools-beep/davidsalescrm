#!/bin/bash

# Deploy Dialpad Sync Fix
# This script deploys the fixed dialpad-sync edge function

echo "🚀 Deploying Dialpad Sync Fix..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Deploy the function
echo "📦 Deploying dialpad-sync function..."
npx supabase functions deploy dialpad-sync

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Go to Supabase Dashboard → Edge Functions → dialpad-sync"
    echo "2. Verify DIALPAD_API_KEY environment variable is set"
    echo "3. Check the logs for any errors"
    echo "4. Test the sync in your CRM"
    echo ""
    echo "🔍 To check if it's working:"
    echo "   - Open CRM in browser"
    echo "   - Open console (F12)"
    echo "   - Look for: '🔄 Starting Dialpad auto-sync...'"
    echo "   - Should see: '✅ Dialpad sync completed'"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Please check the error message above."
    exit 1
fi

