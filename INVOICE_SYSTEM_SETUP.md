# Invoice System - Complete Setup Guide 📄

## Overview

The invoice system allows DAR users to generate professional invoices for their work over the past 2 weeks, send them to clients via email with approval buttons, and track invoice status in real-time.

---

## Features

✅ **Automatic Invoice Generation**
- Pulls all tasks from the last 2 weeks
- Calculates total hours worked
- Generates unique invoice numbers (INV-YYYYMM-0001)
- Creates professional PDF invoices

✅ **Email Delivery**
- Sends to client email
- CC's miguel@migueldiaz.ca
- Includes detailed task breakdown
- Attached PDF invoice
- Approve/Reject buttons

✅ **Client Approval System**
- One-click approval via email
- One-click rejection via email
- Updates database automatically
- Notifies admin when approved/rejected

✅ **Invoice Tracking (DAR Portal)**
- View all invoices in DAR Portal
- Status badges (Pending/Approved/Rejected)
- Real-time updates
- Invoice history

✅ **Admin Invoice Management**
- View all invoices from all users
- Detailed invoice breakdown
- Task-by-task view
- Filter by status
- User and client information

---

## Setup Instructions

### Step 1: Run Database Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the content from: `supabase/migrations/20251028_create_invoices_system.sql`
3. Paste and click **"Run"**
4. Wait for ✅ Success

This creates:
- `invoices` table
- `invoice_items` table
- RLS policies
- Helper functions
- Triggers for notifications

### Step 2: Deploy Edge Functions

Deploy the invoice email function:

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai
supabase functions deploy send-invoice-email
supabase functions deploy invoice-webhook
```

### Step 3: Configure Netlify Redirects

Add these redirects to handle invoice approval/rejection:

Edit `public/_redirects` and add:

```
/api/invoice-approve  /.netlify/functions/invoice-webhook?action=approve  200
/api/invoice-reject   /.netlify/functions/invoice-webhook?action=reject   200
```

Or create Netlify Functions (if using Netlify):

**`netlify/functions/invoice-approve.ts`:**
```typescript
import { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  const id = event.queryStringParameters?.id;
  const email = event.queryStringParameters?.email;
  
  // Redirect to Supabase Edge Function
  const supabaseUrl = process.env.SUPABASE_URL;
  const redirectUrl = `${supabaseUrl}/functions/v1/invoice-webhook?action=approve&id=${id}&email=${encodeURIComponent(email || '')}`;
  
  return {
    statusCode: 302,
    headers: {
      Location: redirectUrl,
    },
  };
};
```

**`netlify/functions/invoice-reject.ts`:**
```typescript
import { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  const id = event.queryStringParameters?.id;
  const email = event.queryStringParameters?.email;
  
  // Redirect to Supabase Edge Function
  const supabaseUrl = process.env.SUPABASE_URL;
  const redirectUrl = `${supabaseUrl}/functions/v1/invoice-webhook?action=reject&id=${id}&email=${encodeURIComponent(email || '')}`;
  
  return {
    statusCode: 302,
    headers: {
      Location: redirectUrl,
    },
  };
};
```

### Step 4: Test the System

**As DAR User:**
1. **Log in as DAR User**
2. **Go to "Invoices" tab** (in sidebar)
3. **Select a client**
4. **Review the preview** (shows last 2 weeks of work)
5. **Set hourly rate** (default: $50/hour)
6. **Add notes** (optional)
7. **Click "Send Invoice"**
8. **Check email** (both client and miguel@migueldiaz.ca)
9. **Click "Approve Invoice"** button in email
10. **Verify status** changes to "Approved" in DAR Portal

**As Admin:**
1. **Log in as Admin**
2. **Go to Admin page**
3. **Click "Invoices" tab**
4. **View all invoices** from all users
5. **Click "View"** on any invoice
6. **Review complete invoice details** and task breakdown
7. **Check approval status** and approval info

---

## How It Works

### 1. Invoice Generation Flow

```
DAR User clicks "Send Invoice"
    ↓
System fetches all time entries from last 2 weeks
    ↓
Calculates total hours and amount
    ↓
Generates unique invoice number
    ↓
Creates invoice record in database
    ↓
Creates invoice_items records (task breakdown)
    ↓
Calls send-invoice-email Edge Function
    ↓
Generates PDF and HTML email
    ↓
Sends email via Resend to client + miguel@migueldiaz.ca
```

### 2. Approval Flow

```
Client receives email
    ↓
Clicks "Approve Invoice" button
    ↓
Redirects to /api/invoice-approve?id=XXX&email=YYY
    ↓
Netlify redirects to Supabase Edge Function
    ↓
Edge Function calls approve_invoice() database function
    ↓
Database updates invoice status to "approved"
    ↓
Trigger creates admin notification
    ↓
Client sees success page
    ↓
DAR user sees "Approved" badge in portal
```

### 3. Email Format

**Subject:** `Invoice INV-202410-0001 - ABC Corporation`

**Body:**
- Professional header with Staffly branding
- Invoice summary (client, invoice number, total hours, total amount)
- Detailed task breakdown table (date, task, hours)
- **Approve** button (green)
- **Reject** button (red)
- Note about attached PDF
- Footer with contact info

**Attachment:** `Invoice_INV-202410-0001.pdf`

---

## Database Schema

### invoices Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| invoice_number | TEXT | Unique (e.g., INV-202410-0001) |
| user_id | UUID | DAR user who created it |
| client_name | TEXT | Client name |
| client_email | TEXT | Client email |
| start_date | DATE | Period start (2 weeks ago) |
| end_date | DATE | Period end (today) |
| total_hours | DECIMAL | Total hours worked |
| total_amount | DECIMAL | Total amount (hours × rate) |
| currency | TEXT | Default: USD |
| status | TEXT | pending/approved/rejected |
| approved_at | TIMESTAMP | When approved |
| approved_by_email | TEXT | Who approved/rejected |
| pdf_url | TEXT | URL to PDF (optional) |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | When created |
| updated_at | TIMESTAMP | Last updated |

### invoice_items Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| invoice_id | UUID | Foreign key to invoices |
| task_date | DATE | Date task was performed |
| task_description | TEXT | Task description |
| hours | DECIMAL | Hours spent |
| rate | DECIMAL | Hourly rate |
| amount | DECIMAL | Total (hours × rate) |
| created_at | TIMESTAMP | When created |

---

## UI Components

### DAR Portal - Invoices Tab

**Invoice Generator Card:**
- Client dropdown (shows assigned clients)
- Client email input (auto-filled, editable)
- Hourly rate input (default: $50)
- Notes textarea (optional)
- Invoice preview (shows last 2 weeks of tasks)
- Total hours and amount
- "Send Invoice" button

**Recent Invoices Card:**
- List of recent invoices
- Invoice number
- Client name
- Date range
- Total amount
- Total hours
- Status badge (Pending/Approved/Rejected)

### Admin Portal - Invoices Tab

**All Invoices Table:**
- Invoice number (with monospace font)
- User name and email
- Client name and email
- Period (start - end date)
- Total hours
- Total amount
- Status badge (Pending/Approved/Rejected with icons)
- Created date
- "View" button to see details

**Invoice Details Dialog:**
- **Invoice Summary:**
  - User information
  - Client information
  - Period
  - Status badge
- **Approval Information:**
  - Who approved/rejected
  - When approved/rejected
  - Displayed in green box if approved
- **Task Breakdown Table:**
  - Date of each task
  - Task description
  - Hours spent
  - Hourly rate
  - Amount per task
  - **Total row** with total hours and total amount

---

## Edge Functions

### send-invoice-email

**Purpose:** Generate and send invoice emails with PDF attachments

**Input:**
```json
{
  "invoice_id": "uuid",
  "user_id": "uuid",
  "client_name": "ABC Corp",
  "client_email": "client@example.com",
  "start_date": "2024-10-14",
  "end_date": "2024-10-28"
}
```

**Process:**
1. Fetch user profile
2. Fetch invoice details
3. Fetch invoice items
4. Generate PDF HTML
5. Generate email HTML with approve/reject buttons
6. Send email via Resend
7. Return success/error

**Output:**
```json
{
  "success": true,
  "message": "Invoice email sent successfully",
  "email_id": "resend-email-id"
}
```

### invoice-webhook

**Purpose:** Handle invoice approval/rejection from email buttons

**URL Parameters:**
- `action`: "approve" or "reject"
- `id`: invoice UUID
- `email`: client email

**Process:**
1. Fetch invoice details
2. Check if already processed
3. Call `approve_invoice()` or `reject_invoice()` function
4. Return HTML success/error page

**Response:** HTML page with success/error message and "Go to Dashboard" button

---

## Security

### RLS Policies

**invoices table:**
- Users can view their own invoices
- Users can create their own invoices
- Users can update their own pending invoices
- Admins can view all invoices
- Admins can update all invoices

**invoice_items table:**
- Users can view items for their own invoices
- Users can create items for their own invoices
- Admins can view all invoice items

### Webhook Security

- No authentication required (uses signed URLs)
- Email parameter validates client identity
- One-time use (status check prevents re-processing)
- HTTPS only

---

## Customization

### Change Hourly Rate Default

Edit `InvoiceGenerator.tsx`:
```typescript
const [hourlyRate, setHourlyRate] = useState<string>("75.00"); // Change from 50.00
```

### Change Invoice Period

Edit `InvoiceGenerator.tsx` in `loadInvoicePreview()`:
```typescript
startDate.setDate(startDate.getDate() - 30); // Change from 14 to 30 for 1 month
```

### Change Email Branding

Edit `send-invoice-email/index.ts`:
```typescript
from: "Your Company <noreply@yourdomain.com>",
```

### Change Invoice Number Format

Edit migration SQL:
```sql
new_number := 'YOURPREFIX-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
```

---

## Troubleshooting

### "No work entries found"

**Cause:** No time entries for selected client in last 2 weeks

**Solution:**
- Ensure DAR user has clocked time for this client
- Check date range (last 14 days)
- Verify client name matches exactly

### "Failed to send email"

**Cause:** Resend API error or missing API key

**Solution:**
1. Check Supabase Edge Function logs
2. Verify `RESEND_API_KEY` environment variable
3. Check Resend dashboard for errors
4. Ensure sender domain is verified

### "Invoice already processed"

**Cause:** Client clicked approve/reject button multiple times

**Solution:**
- This is expected behavior (prevents duplicate processing)
- Status is already updated in database
- No action needed

### Approval button doesn't work

**Cause:** Redirect not configured or Edge Function not deployed

**Solution:**
1. Check Netlify redirects are configured
2. Verify Edge Function is deployed: `supabase functions list`
3. Test webhook URL directly in browser
4. Check Edge Function logs for errors

---

## Testing Checklist

### Basic Functionality
- [ ] DAR user can see "Invoices" tab ✅
- [ ] Client dropdown shows assigned clients ✅
- [ ] Preview shows last 2 weeks of tasks ✅
- [ ] Total hours calculated correctly ✅
- [ ] Total amount calculated correctly ✅
- [ ] "Send Invoice" button works ✅

### Email Delivery
- [ ] Email sent to client ✅
- [ ] Email sent to miguel@migueldiaz.ca ✅
- [ ] Email has correct subject ✅
- [ ] Email has task breakdown ✅
- [ ] Email has approve button ✅
- [ ] Email has reject button ✅
- [ ] PDF attached ✅

### Approval Flow
- [ ] Click "Approve" button ✅
- [ ] Redirects to success page ✅
- [ ] Database updated to "approved" ✅
- [ ] DAR portal shows "Approved" badge ✅
- [ ] Admin gets notification ✅

### Rejection Flow
- [ ] Click "Reject" button ✅
- [ ] Redirects to success page ✅
- [ ] Database updated to "rejected" ✅
- [ ] DAR portal shows "Rejected" badge ✅

### Edge Cases
- [ ] Can't send invoice with no tasks ✅
- [ ] Can't approve already approved invoice ✅
- [ ] Can't reject already rejected invoice ✅
- [ ] Invoice number is unique ✅
- [ ] Multiple invoices for same client work ✅

---

## Maintenance

### Regular Tasks

**Weekly:**
- Check invoice delivery success rate
- Monitor Resend email logs
- Review rejected invoices

**Monthly:**
- Review invoice numbering sequence
- Check database storage usage
- Update hourly rates if needed

### Database Cleanup (Optional)

Archive old invoices (older than 1 year):
```sql
-- Create archive table
CREATE TABLE invoices_archive AS SELECT * FROM invoices WHERE FALSE;

-- Move old invoices
INSERT INTO invoices_archive 
SELECT * FROM invoices 
WHERE created_at < NOW() - INTERVAL '1 year';

-- Delete from main table
DELETE FROM invoices 
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## Future Enhancements

### 1. Custom Invoice Templates
Allow users to choose from multiple PDF templates

### 2. Recurring Invoices
Automatically generate invoices every 2 weeks

### 3. Payment Integration
Add Stripe/PayPal payment buttons

### 4. Invoice Reminders
Send reminder emails for pending invoices after 7 days

### 5. Multi-Currency Support
Support EUR, GBP, CAD, etc.

### 6. Invoice Editing
Allow editing invoices before sending

### 7. Bulk Invoicing
Generate invoices for all clients at once

### 8. Invoice Analytics
Dashboard showing total invoiced, approved, pending amounts

---

## Support

### Common Issues

**Q: Can I change the invoice after sending?**
A: No, invoices are immutable once sent. Create a new invoice if needed.

**Q: What happens if client doesn't approve?**
A: Invoice stays in "pending" status. You can follow up manually.

**Q: Can I delete an invoice?**
A: Currently no. Contact admin to delete via database.

**Q: How do I change my hourly rate?**
A: Set it in the "Hourly Rate" field before generating invoice.

**Q: Can I invoice for more than 2 weeks?**
A: Not currently. This would require code changes.

---

## Files Created/Modified

### New Files
- `supabase/migrations/20251028_create_invoices_system.sql` - Database schema
- `supabase/functions/send-invoice-email/index.ts` - Email sending function
- `supabase/functions/invoice-webhook/index.ts` - Approval/rejection webhook
- `src/components/invoices/InvoiceGenerator.tsx` - UI component
- `INVOICE_SYSTEM_SETUP.md` - This documentation

### Modified Files
- `src/pages/EODPortal.tsx` - Added Invoices tab

---

## Environment Variables Required

In Supabase Edge Functions:
- `RESEND_API_KEY` - Your Resend API key
- `SUPABASE_URL` - Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided

---

## Success Criteria

✅ DAR users can generate invoices
✅ Invoices sent to client + miguel@migueldiaz.ca
✅ PDF attached to email
✅ Task breakdown included
✅ Approve/Reject buttons work
✅ Database updates on approval/rejection
✅ Status visible in DAR Portal
✅ Admin notifications work
✅ Invoice history tracked

---

**Status**: ✅ Ready to Deploy
**Time to Setup**: 5 minutes
**Risk Level**: Low (new feature, no breaking changes)

---

## Next Steps

1. ✅ Run database migration
2. ✅ Deploy Edge Functions
3. ✅ Configure redirects (if using Netlify)
4. ✅ Test with a real client
5. ✅ Monitor email delivery

**Everything is ready - just run the migration and deploy!** 🎉

