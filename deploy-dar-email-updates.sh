#!/bin/bash

# Deploy DAR Email Updates
# This script deploys the updated send-eod-email Edge Function with new formatting

echo "🚀 Deploying DAR Email Updates..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase."
    echo "Run: supabase login"
    exit 1
fi

echo "📧 Deploying send-eod-email Edge Function..."
supabase functions deploy send-eod-email

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DAR Email Edge Function deployed successfully!"
    echo ""
    echo "📋 Changes Applied:"
    echo "  ✓ Email sender changed to: Staffly DAR <dar@admin.stafflyhq.ai>"
    echo "  ✓ Subject format: Client Name - VA Name - Date"
    echo "  ✓ Header changed to: Daily Activity Report"
    echo "  ✓ Client name displayed below header"
    echo "  ✓ Client names removed from individual task items"
    echo ""
    echo "🎉 All updates deployed!"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

