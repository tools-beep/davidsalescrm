#!/bin/bash

echo "🔧 Dialpad OAuth Environment Setup"
echo "=================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "⚠️  Supabase CLI is not installed."
    echo "Install it with: brew install supabase/tap/supabase"
    echo ""
fi

echo "📋 You need the following from Dialpad:"
echo "   1. Client ID"
echo "   2. Client Secret"
echo "   3. Confirmed redirect URI: https://app.stafflyhq.ai/oauth/dialpad/callback"
echo ""

read -p "Do you have your Dialpad credentials? (y/n): " has_creds

if [ "$has_creds" != "y" ]; then
    echo ""
    echo "📧 Contact Dialpad support to get:"
    echo "   - OAuth Client ID"
    echo "   - OAuth Client Secret"
    echo "   - Confirm redirect URI is authorized"
    echo ""
    echo "Then run this script again."
    exit 0
fi

echo ""
echo "📝 Enter your Dialpad credentials:"
echo ""

read -p "Dialpad Client ID: " client_id
read -p "Dialpad Client Secret: " client_secret

if [ -z "$client_id" ] || [ -z "$client_secret" ]; then
    echo "❌ Client ID and Secret are required"
    exit 1
fi

echo ""
echo "🚀 Setting up environment variables..."
echo ""

# Set Supabase secrets
if command -v supabase &> /dev/null
then
    echo "📤 Setting Supabase secrets..."
    supabase secrets set DIALPAD_CLIENT_ID="$client_id"
    supabase secrets set DIALPAD_CLIENT_SECRET="$client_secret"
    supabase secrets set DIALPAD_REDIRECT_URL="https://app.stafflyhq.ai/oauth/dialpad/callback"
    
    echo "✅ Supabase secrets set"
    echo ""
    
    echo "📤 Deploying dialpad-oauth-exchange function..."
    supabase functions deploy dialpad-oauth-exchange
    
    if [ $? -eq 0 ]; then
        echo "✅ Edge function deployed"
    else
        echo "❌ Failed to deploy Edge function"
    fi
else
    echo "⚠️  Supabase CLI not found. Skipping Supabase setup."
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Add to Netlify Environment Variables:"
echo "   VITE_DIALPAD_CLIENT_ID = $client_id"
echo "   VITE_DIALPAD_REDIRECT_URL = https://app.stafflyhq.ai/oauth/dialpad/callback"
echo ""
echo "2. Rebuild and deploy your app:"
echo "   npm run build"
echo "   netlify deploy --prod"
echo ""
echo "3. Test on https://app.stafflyhq.ai"
echo "   - Click Dialpad CTI widget"
echo "   - Click 'Connect Dialpad'"
echo "   - Should redirect to Dialpad OAuth"
echo ""
echo "✅ Setup complete!"

