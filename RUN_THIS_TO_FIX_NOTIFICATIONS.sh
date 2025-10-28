#!/bin/bash

# Quick fix for notifications not working
# This script runs the database migration

echo "🔔 Fixing Notifications System..."
echo ""
echo "Running database migration..."
echo ""

cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai

supabase db push

echo ""
echo "✅ Done!"
echo ""
echo "Now test:"
echo "1. Open Admin Portal"
echo "2. Have a DAR user start a task"
echo "3. You should see a notification!"
echo ""

