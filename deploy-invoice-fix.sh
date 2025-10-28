#!/bin/bash

echo "🔧 Deploying Invoice PDF Fix..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI is not installed."
    exit 1
fi

# Deploy the updated function
echo "📤 Deploying send-invoice-email function..."
if supabase functions deploy send-invoice-email; then
    echo "✅ Function deployed successfully"
else
    echo "❌ Failed to deploy function"
    exit 1
fi

echo ""
echo "🎉 Invoice email function updated!"
echo ""
echo "📋 Current Status:"
echo "   ✅ Emails will be sent to client + miguel@migueldiaz.ca"
echo "   ✅ HTML attachment included (can be opened in browser)"
echo "   ⏳ PDF generation (requires PDFShift API key)"
echo ""
echo "💡 To enable real PDF attachments:"
echo "   1. Sign up at https://pdfshift.io (free tier available)"
echo "   2. Get your API key"
echo "   3. Run: supabase secrets set PDFSHIFT_API_KEY=your_key_here"
echo "   4. Redeploy: supabase functions deploy send-invoice-email"
echo ""
echo "✅ You can test the invoice system now!"
echo "   - Go to DAR Portal → Invoices"
echo "   - Create and send an invoice"
echo "   - Check your email (and client's email)"
echo ""

