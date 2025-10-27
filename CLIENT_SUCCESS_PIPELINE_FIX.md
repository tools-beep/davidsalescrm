# 🔧 Client Success Pipeline Fix

## Problem

The Client Success Pipeline is not showing any deals, even though deals might exist with Client Success stages.

## Root Cause

Deals with Client Success Pipeline stages may have:
1. **Wrong `pipeline_id`** - Assigned to Outbound Funnel instead of Client Success
2. **NULL `pipeline_id`** - No pipeline assigned at all
3. **Missing enum values** - Stage values not in database

## Client Success Pipeline Stages

These are the 9 stages in the Client Success Pipeline:

1. **Onboarding Call Booked** - `onboarding call booked`
2. **Onboarding Call Attended** - `onboarding call attended`
3. **Active Client (Operator)** - `active client (operator)`
4. **Active Client - Project in Progress** - `active client - project in progress`
5. **Paused Client** - `paused client`
6. **Candidate Replacement** - `candidate replacement`
7. **Project Rescope / Expansion** - `project rescope / expansion`
8. **Active Client - Project Maintenance** - `active client - project maintenance`
9. **Cancelled / Completed** - `cancelled / completed`

## Solution

### Option 1: Run Complete Fix (Recommended)

Run `RUN_ALL_FIXES.sql` in Supabase SQL Editor. This includes:
- All previous fixes
- Client Success Pipeline assignment fix

### Option 2: Diagnostic First

If you want to diagnose the issue first:

1. **Run diagnostic queries**:
   ```bash
   # In Supabase SQL Editor, run:
   CHECK_CLIENT_SUCCESS_PIPELINE.sql
   ```

2. **Review the results** to understand:
   - Does the pipeline exist?
   - How many deals are in it?
   - Are deals using Client Success stages but wrong pipeline?

3. **Apply the fix** based on diagnosis

### Option 3: Quick Fix Only

If you just want to fix the pipeline assignments:

```sql
-- Assign deals with Client Success stages to the correct pipeline
UPDATE deals
SET pipeline_id = '00000000-0000-0000-0000-000000000002'
WHERE stage IN (
  'onboarding call booked',
  'onboarding call attended',
  'active client (operator)',
  'active client - project in progress',
  'paused client',
  'candidate replacement',
  'project rescope / expansion',
  'active client - project maintenance',
  'cancelled / completed'
)
AND (pipeline_id IS NULL OR pipeline_id != '00000000-0000-0000-0000-000000000002');
```

## Verification

After running the fix:

1. **Check deal count**:
   ```sql
   SELECT COUNT(*) as total_deals
   FROM deals
   WHERE pipeline_id = '00000000-0000-0000-0000-000000000002';
   ```

2. **Check stage distribution**:
   ```sql
   SELECT stage, COUNT(*) as count
   FROM deals
   WHERE pipeline_id = '00000000-0000-0000-0000-000000000002'
   GROUP BY stage
   ORDER BY count DESC;
   ```

3. **In the UI**:
   - Go to Deals page
   - Select "Client Success Pipeline" from dropdown
   - You should now see deals organized by stage

## How Dragging Works

All Client Success Pipeline stages are properly mapped in the code:

```typescript
// These stages are recognized and will save correctly:
'onboarding call booked' → 'onboarding call booked'
'onboarding call attended' → 'onboarding call attended'
'active client (operator)' → 'active client (operator)'
'active client - project in progress' → 'active client - project in progress'
'paused client' → 'paused client'
'candidate replacement' → 'candidate replacement'
'project rescope / expansion' → 'project rescope / expansion'
'active client - project maintenance' → 'active client - project maintenance'
'cancelled / completed' → 'cancelled / completed'
```

## Common Issues

### Issue 1: "No deals showing"
**Cause**: Deals have wrong `pipeline_id`  
**Fix**: Run the UPDATE query above

### Issue 2: "Can't drag deals into stages"
**Cause**: Stage enum values missing  
**Fix**: Run `supabase/migrations/20251010180000_custom_pipelines.sql`

### Issue 3: "Deals disappear after dragging"
**Cause**: Stage name mismatch  
**Fix**: Already fixed in `normalizeStage()` function

## Files Involved

### Database
- `supabase/migrations/20251010180000_custom_pipelines.sql` - Creates pipeline and enum values
- `RUN_ALL_FIXES.sql` - Comprehensive fix including pipeline assignment

### Frontend
- `src/components/pipeline/DragDropPipeline.tsx` - Handles drag/drop and stage normalization
- `src/pages/Deals.tsx` - Filters deals by pipeline

### Documentation
- `CHECK_CLIENT_SUCCESS_PIPELINE.sql` - Diagnostic queries
- `CLIENT_SUCCESS_PIPELINE_FIX.md` - This file

## Testing Checklist

After applying the fix:

- [ ] Client Success Pipeline shows in dropdown
- [ ] Deals appear when pipeline is selected
- [ ] All 9 stages are visible
- [ ] Can drag deals between stages
- [ ] Deals save to correct stage
- [ ] Deal count is accurate
- [ ] Can transfer deals from/to other pipelines

---

**Fix applied! The Client Success Pipeline should now work properly. 🎉**

