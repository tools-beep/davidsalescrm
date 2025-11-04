#!/bin/bash

# Deploy Updated DAR Email Function
# Date: November 4, 2025
# Changes: Updated email format (from, subject, header layout)

echo "🚀 Deploying Updated DAR Email Function..."
echo ""

# Check if we're in the right directory
if [ ! -f "supabase/functions/send-eod-email/index.ts" ]; then
    echo "❌ Error: send-eod-email function not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "📁 Found send-eod-email function"
echo ""

# Deploy the function
echo "📤 Deploying to Supabase..."
npx supabase functions deploy send-eod-email --project-ref qzxuhefnyskdtdfrcrtg

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment Successful!"
    echo ""
    echo "📧 Email Format Updates:"
    echo "   • From: Staffly DAR Report"
    echo "   • Subject: Staffly Daily Activity Reports"
    echo "   • Header: Daily Activity Report (no emoji)"
    echo "   • Layout: Client First Name → VA Name → Date"
    echo "   • Screenshots: Beside each task ✓"
    echo ""
    echo "🧪 Test by submitting a DAR report in the portal"
    echo ""
else
    echo ""
    echo "❌ Deployment Failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi

