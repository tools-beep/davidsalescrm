# 🔧 Fix Client Success Pipeline - Quick Guide

## Problem

You see "Total Deals: 1" but no deals are showing in any stage.

## Root Cause

The deal has `pipeline_id` set to Client Success Pipeline, but its `stage` value doesn't match any of the 9 Client Success stages. For example:
- Deal might have stage "uncontacted" (Outbound stage)
- Deal might have stage "closed won" (Outbound stage)
- Deal might have wrong capitalization or spacing

## Quick Fix

### Option 1: Run Complete Fix (Recommended)

**In Supabase SQL Editor**, run:
```
RUN_ALL_FIXES.sql
```

This will:
1. Assign deals with Client Success stages to correct pipeline
2. **Fix deals in Client Success Pipeline that have wrong stages** ← This fixes your issue!
3. Apply all other fixes (DAR, email, etc.)

### Option 2: Diagnostic First

If you want to see what stage the deal has:

**In Supabase SQL Editor**, run:
```
FIND_MISSING_DEAL.sql
```

This will show you:
- What stage the deal currently has
- Why it's not appearing
- Exact fix needed

### Option 3: Quick Fix Only

If you just want to fix this specific issue:

```sql
-- Fix deals in Client Success Pipeline with wrong stages
UPDATE deals
SET stage = 'onboarding call booked'
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002'
AND stage NOT IN (
  'onboarding call booked',
  'onboarding call attended',
  'active client (operator)',
  'active client - project in progress',
  'paused client',
  'candidate replacement',
  'project rescope / expansion',
  'active client - project maintenance',
  'cancelled / completed'
);
```

## After Running the Fix

1. **Refresh the Deals page** (hard refresh: Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. **Select "Client Success Pipeline"** from the dropdown
3. **You should now see the deal** in "Onboarding Call Booked" stage

## Valid Client Success Stages

Make sure deals in this pipeline only have these stages:

1. `onboarding call booked`
2. `onboarding call attended`
3. `active client (operator)`
4. `active client - project in progress`
5. `paused client`
6. `candidate replacement`
7. `project rescope / expansion`
8. `active client - project maintenance`
9. `cancelled / completed`

## Why This Happens

This usually occurs when:
1. A deal is manually moved to Client Success Pipeline
2. But its stage wasn't updated to a valid Client Success stage
3. The UI filters out deals with invalid stages for that pipeline

## Verification

After the fix, run this to verify:

```sql
SELECT 
  name,
  stage,
  pipeline_id
FROM deals
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002';
```

All deals should have stages from the list above.

---

**Run `RUN_ALL_FIXES.sql` now to fix this issue! 🚀**

