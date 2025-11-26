# 🔍 Comprehensive Debug Guide - Account Manager Pipeline Issue

## Current Issue
Account Managers cannot see their assigned clients/deals in the pipeline, even after assignment.

## Debug Logs Added

I've added extensive logging at every critical point in the data flow. Here's what to look for in the console:

### 1. **User Role & Client Assignments** (Deals.tsx - `checkUserRole`)
```
=== CHECK USER ROLE - START ===
👤 Auth user: [user_id] [email]
👤 User role: manager
📋 Raw client assignments data: [...]
✅ Setting assigned clients: ["Client Name 1", "Client Name 2"]
```

**What to check:**
- Is `assignedClients` populated with the correct client names?
- Do the client names match EXACTLY with the company names in the database?

### 2. **Fetching Deals** (Deals.tsx - `fetchDeals`)
```
=== FETCHING DEALS - START ===
📍 STATE SNAPSHOT:
   selectedPipeline: [pipeline_id]
   userRole: manager
   assignedClients: ["Client Name 1"]
   assignedClients.length: 1
```

**What to check:**
- Is `assignedClients` still populated when fetching deals?
- Is the correct pipeline selected?

### 3. **API Route Response** (For restricted roles)
```
🔐 Using internal API `/api/fetch-pipeline-deals` (service role) to bypass RLS
✅ API route response count: 79
```

**What to check:**
- How many deals did the API return?
- This should match the total deals in the pipeline

### 4. **Client-Side Filtering** (Deals.tsx - `fetchDeals`)
```
🔍 APPLYING CLIENT-SIDE FILTER
📊 Total deals before filter: 79
📋 Assigned clients: ["NextHome Northern Lights Realty"]
📋 Unique company/deal names in data: ["Staffly - Internal", "NextHome Northern Lights", ...]
🔁 Normalized assigned clients: ["nexthome northern lights realty"]
🔑 Key words from assigned clients: ["nexthome", "northern", "lights", "realty"]
```

**What to check:**
- Are the assigned client names being normalized correctly?
- Do any of the company names in the data match the assigned clients?

### 5. **Individual Deal Matching** (Deals.tsx - `fetchDeals`)
```
🔍 NEXTHOME DEAL CHECK:
  Deal name: NextHome Northern Lights
  Company name: NextHome Northern Lights Realty
  Normalized company: nexthome northern lights realty
  Has match? ✅ YES
  ✅ THIS DEAL WILL BE SHOWN
```

**What to check:**
- Are deals matching correctly?
- If a deal says "❌ NO", why isn't it matching?

### 6. **Setting Deals State** (Deals.tsx - `fetchDeals`)
```
🎯 ABOUT TO SET DEALS STATE
🎯 filteredData length: 4
🎯 filteredData sample: [{name: "Deal 1", stage: "active clients (launched)", ...}]
✅ DEALS STATE UPDATED - New length: 4
```

**What to check:**
- How many deals are being set in state?
- What are their names and stages?

### 7. **Filtered Deals Memo** (Deals.tsx - `filteredDeals`)
```
🔍 FILTERED DEALS MEMO - START
🔍 Input deals.length: 4
🔍 Active filters: {stages: [], priorities: [], ...}
❌ Deal "XYZ" filtered out by stage filter. Deal stage: "active clients (launched)", Allowed stages: []
🔍 FILTERED DEALS MEMO - END
🔍 Output filteredDeals.length: 0
🔍 Deals filtered out: 4
```

**⚠️ CRITICAL CHECK:**
- If deals are being filtered out here, this is likely the problem!
- Check if `filters.stages` is accidentally set to something
- Check if any other filters are active

### 8. **Rendering DragDropPipeline** (Deals.tsx - render)
```
🚀 RENDERING DragDropPipeline
🚀 filteredDeals length: 4
🚀 filteredDeals sample: [{name: "Deal 1", stage: "active clients (launched)"}]
🚀 pipelineStages: ["onboarding call booked", "onboarding call attended", "active clients (launched)", ...]
```

**What to check:**
- How many deals are being passed to DragDropPipeline?
- Do the deal stages match any of the pipelineStages?

### 9. **DragDropPipeline Receiving Deals** (DragDropPipeline.tsx)
```
=== DRAG DROP PIPELINE DEBUG ===
[DragDrop] Deals prop updated. Count: 4
[DragDrop] Pipeline stages: ["onboarding call booked", ...]
[DragDrop] Syncing localDeals with props. New count: 4
```

**What to check:**
- Is DragDropPipeline receiving the deals?
- Are localDeals being synced?

### 10. **Deals by Stage Computation** (DragDropPipeline.tsx)
```
=== DEALS BY STAGE COMPUTATION ===
Total deals to categorize: 4
Pipeline stages: ["onboarding call booked", "onboarding call attended", "active clients (launched)", ...]
✅ Deal "NextHome Northern Lights" matches stage "active clients (launched)"
Stage "active clients (launched)" has 4 deals
```

**What to check:**
- Are deals matching their stages?
- How many deals are in each stage?

### 11. **Stage Rendering** (DragDropPipeline.tsx)
```
[RENDER] Stage "active clients (launched)": {
  stageDealsCount: 4,
  dealsByStageKeys: ["onboarding call booked", "onboarding call attended", "active clients (launched)", ...],
  hasKey: true,
  actualDeals: ["Deal 1", "Deal 2", "Deal 3", "Deal 4"]
}
```

**What to check:**
- Does the stage have deals?
- Is the stage key present in dealsByStage?

## Common Issues & Solutions

### Issue 1: No Deals Returned from API
**Symptom:** `✅ API route response count: 0`
**Solution:** Check if deals exist in the database for this pipeline

### Issue 2: Client Names Don't Match
**Symptom:** `❌ THIS DEAL WILL BE FILTERED OUT` for all deals
**Solution:** 
- Check `user_client_assignments` table - does `client_name` match `companies.name`?
- Run the SQL fix script to sync client names

### Issue 3: Deals Filtered Out by Stage Filter
**Symptom:** `❌ Deal "XYZ" filtered out by stage filter`
**Solution:**
- Check if Advanced Filters sidebar has stage filters applied
- Clear all filters and try again

### Issue 4: Stage Names Don't Match
**Symptom:** `⚠️ ORPHAN DEALS (not matching any stage column)`
**Solution:**
- Deal stages are lowercase: `"active clients (launched)"`
- Pipeline stages should also be lowercase
- Check the stage normalization logic

### Issue 5: filteredDeals is Empty
**Symptom:** `🔍 Output filteredDeals.length: 0` but `🎯 filteredData length: 4`
**Solution:**
- The `useMemo` filteredDeals is applying additional filters
- Check `filters.stages`, `filters.priorities`, `filters.companies`, etc.
- These should all be empty arrays if no filters are active

## Step-by-Step Debugging Process

1. **Log in as Account Manager**
2. **Open Console** (F12 or Cmd+Option+I)
3. **Navigate to Deals page**
4. **Select the pipeline** where deals should appear
5. **Look for each log section above** in order
6. **Find where the count drops to 0** - that's your problem!

## Quick Fixes to Try

### Fix 1: Clear All Filters
```typescript
// In browser console:
localStorage.clear();
// Then refresh the page
```

### Fix 2: Check Client Assignments
```sql
-- In Supabase SQL Editor:
SELECT 
  uca.client_name as assigned_name,
  c.name as actual_company_name,
  d.name as deal_name,
  d.stage
FROM user_client_assignments uca
LEFT JOIN companies c ON LOWER(uca.client_name) = LOWER(c.name)
LEFT JOIN deals d ON d.company_id = c.id
WHERE uca.user_id = '[ACCOUNT_MANAGER_USER_ID]';
```

### Fix 3: Bypass Client Filter (Temporary Test)
Comment out the client filtering in `Deals.tsx` line 542-632 to see if deals appear without filtering.

## Next Steps

After reviewing the console logs, report back with:
1. Which log section shows the count dropping to 0?
2. What are the exact values in that section?
3. Any error messages?

This will help pinpoint the exact issue!

