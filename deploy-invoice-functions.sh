#!/bin/bash

echo "🚀 Deploying Invoice Edge Functions..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: brew install supabase/tap/supabase"
    echo "Or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if project is linked
echo "📡 Checking Supabase project link..."
if ! supabase status &> /dev/null; then
    echo "⚠️  Project is not linked."
    echo "Please run: supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "Find your project ref in your Supabase dashboard URL:"
    echo "https://app.supabase.com/project/YOUR-PROJECT-REF/..."
    exit 1
fi

echo "✅ Project is linked"
echo ""

# Deploy send-invoice-email function
echo "📤 Deploying send-invoice-email function..."
if supabase functions deploy send-invoice-email; then
    echo "✅ send-invoice-email deployed successfully"
else
    echo "❌ Failed to deploy send-invoice-email"
    exit 1
fi

echo ""

# Deploy invoice-webhook function
echo "📤 Deploying invoice-webhook function..."
if supabase functions deploy invoice-webhook; then
    echo "✅ invoice-webhook deployed successfully"
else
    echo "❌ Failed to deploy invoice-webhook"
    exit 1
fi

echo ""
echo "🎉 All functions deployed successfully!"
echo ""
echo "⚠️  IMPORTANT: Don't forget to set your RESEND_API_KEY:"
echo "   supabase secrets set RESEND_API_KEY=your_key_here"
echo ""
echo "📋 Verify deployment:"
echo "   supabase functions list"
echo ""
echo "✅ You can now send invoices from the DAR Portal!"

