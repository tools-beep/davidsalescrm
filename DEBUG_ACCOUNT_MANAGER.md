# Debugging Account Manager Client Assignment Issue

## Problem
Hannah@stafflyhq.ai (Account Manager) should see 1 deal in Fulfillment - Operators pipeline but sees nothing.

---

## Steps to Debug

### 1. Check Browser Console Logs

When logged in as hannah@stafflyhq.ai and viewing the Deals page, look for these console logs:

#### **A. User Role & Client Assignment:**
```
👤 User role: manager
🔍 Fetching client assignments for user: [user-id]
📋 Raw client assignments data: [{client_name: "Company Name"}]
✅ Assigned clients: ["Company Name"]
✅ Assigned clients count: 1
```

**If you see:**
- ⚠️ `No clients assigned to this user` → The user has no entries in `user_client_assignments` table
- Empty array → Check the `user_client_assignments` table in Supabase

---

#### **B. Deals Fetching:**
```
=== FETCHING DEALS ===
Selected pipeline: [pipeline-id]
User Role: manager
Assigned Clients: ["Company Name"]
📊 Fetched data length: 100
📊 Sample of fetched deals: [{name: "Deal 1", company_name: "Company Name", ...}]
```

**What to check:**
- Does the fetched data include the expected deal?
- Does the `company_name` in the deal match the `Assigned Clients` EXACTLY?

---

#### **C. Filtering Process:**
```
🔒 User role requires client filtering: manager
🔍 Applying client assignment filter...
Normalized assigned clients: ["company name"]
Deal: "Deal 1" | Company: "Company Name" | Normalized: "company name" | Assigned: true
✅ Filtered to 1 deals from assigned clients (from 100 total)
```

**What to check:**
- Are the normalized names matching?
- Case sensitivity issues?
- Extra spaces or special characters?

---

### 2. Check Database Directly in Supabase Dashboard

#### **A. Check user_profiles:**
```sql
SELECT user_id, email, role, first_name, last_name
FROM user_profiles
WHERE email = 'hannah@stafflyhq.ai';
```

Expected: Should return 1 row with `role = 'manager'`

---

#### **B. Check user_client_assignments:**
```sql
SELECT uca.*, up.email
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
WHERE up.email = 'hannah@stafflyhq.ai';
```

Expected: Should return at least 1 row with `client_name = [Company Name]`

---

#### **C. Check the deal's company:**
```sql
SELECT 
    d.id,
    d.name as deal_name,
    d.stage,
    d.company_id,
    c.name as company_name,
    p.name as pipeline_name
FROM deals d
LEFT JOIN companies c ON c.id = d.company_id
LEFT JOIN pipelines p ON p.id = d.pipeline_id
WHERE p.name ILIKE '%fulfillment%'
ORDER BY d.created_at DESC
LIMIT 10;
```

Expected: Should show the deal with its company name

---

#### **D. Check for exact name matching:**
```sql
-- This query will show if the client name matches the company name
SELECT 
    uca.client_name as "Assigned Client Name",
    c.name as "Company Name",
    LOWER(TRIM(uca.client_name)) as "Normalized Assigned",
    LOWER(TRIM(c.name)) as "Normalized Company",
    CASE 
        WHEN LOWER(TRIM(uca.client_name)) = LOWER(TRIM(c.name)) THEN '✅ MATCH'
        ELSE '❌ NO MATCH - THIS IS THE PROBLEM!'
    END as "Match Status"
FROM user_client_assignments uca
CROSS JOIN companies c
WHERE uca.user_id IN (
    SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'
);
```

This will show ALL companies and whether they match the assigned client names.

---

### 3. Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **No client assigned** | Console: `⚠️ No clients assigned` | Go to Admin > DAR Admin > Assign client to hannah@stafflyhq.ai |
| **Name mismatch** | Console: `Company: "ABC Corp" \| Assigned: false` | Update `client_name` in `user_client_assignments` to match company name EXACTLY |
| **No company on deal** | Console: `Company: undefined` | Update the deal to have a valid `company_id` |
| **Wrong pipeline** | Deal in different pipeline | Check `pipeline_id` on the deal matches "Fulfillment - Operators" |
| **Deal filtered out** | Console shows deal then filters it | Check the client_name matches company.name exactly (case-insensitive, but exact text) |

---

### 4. Quick Fix SQL (if name mismatch found)

If you find the client name doesn't match the company name exactly, run:

```sql
-- Update the client assignment to match the actual company name
UPDATE user_client_assignments
SET client_name = (SELECT name FROM companies WHERE id = 'actual-company-id')
WHERE user_id = (SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai');
```

---

### 5. Test the Fix

1. Log out of hannah@stafflyhq.ai
2. Log back in
3. Go to Deals page
4. Check browser console for the debug logs
5. The deal should now appear in the Fulfillment - Operators pipeline

---

## Need More Help?

Share the following from the browser console:
1. The output after "=== FETCHING DEALS ===" 
2. The output after "🔒 Applying client assignment filter"
3. The results from the database queries above

