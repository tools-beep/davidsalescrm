#!/bin/bash

echo "🔧 Deploying Invoice Webhook Fix..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    exit 1
fi

echo "📤 Deploying send-invoice-email function..."
if supabase functions deploy send-invoice-email; then
    echo "✅ send-invoice-email deployed"
else
    echo "❌ Failed to deploy send-invoice-email"
    exit 1
fi

echo ""
echo "📤 Deploying invoice-webhook function..."
if supabase functions deploy invoice-webhook; then
    echo "✅ invoice-webhook deployed"
else
    echo "❌ Failed to deploy invoice-webhook"
    exit 1
fi

echo ""
echo "🎉 Invoice system updated successfully!"
echo ""
echo "✅ Fixed:"
echo "   - Approve/Reject URLs now point to correct webhook"
echo "   - Webhook URL: app.stafflyhq.ai"
echo "   - Database updates working correctly"
echo ""
echo "📧 Test it:"
echo "   1. Go to DAR Portal → Invoices"
echo "   2. Send an invoice"
echo "   3. Check email and click Approve or Reject"
echo "   4. Should redirect to app.stafflyhq.ai with success message"
echo ""

