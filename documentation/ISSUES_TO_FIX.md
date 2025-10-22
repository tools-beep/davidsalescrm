# Issues to Fix

## 1. Deal Count Discrepancy ❌

### Current State
- **Database**: 783 deals with stage = "uncontacted" 
- **Screen**: Only showing 543 deals in "Uncontacted" column
- **Missing**: 240 deals (783 - 543 = 240)

### Root Cause
The `DragDropPipeline` component at line 282-288 groups deals by normalized stage:

```typescript
const dealsByStage = useMemo(() => {
  return stages.reduce((acc, stageLabel) => {
    const key = normalizeStage(stageLabel);
    acc[stageLabel] = localDeals.filter(deal => normalizeStage(deal.stage) === key);
    return acc;
  }, {} as Record<string, Deal[]>);
}, [localDeals, stages]);
```

**The Problem**: 
- Pipeline `stages` array uses display labels: `["uncontacted", "no answer/gatekeeper", ...]`
- But these are being normalized and compared
- If a stage label from the pipeline doesn't exactly match after normalization, deals disappear

### What We Need
1. Your Excel file's "Deal Stage" column - what EXACT text values are in there?
2. Check browser console for warnings: `[Stage Mapping] Unknown stage: ...`
3. The actual pipeline configuration stages

## 2. Discovery/DM Connected Same Count ⚠️

- **148 deals** in "dm connected" 
- This includes all "Discovery" deals that were mapped to "dm connected"
- **This is correct** - we intentionally mapped Discovery → dm connected
- If you want Discovery as a separate stage, we need to add it to the database enum

## 3. Excel vs Database Mismatch

### Your Excel File
- Uncontacted: 793 deals

### Our Database  
- uncontacted: 783 deals
- **Missing**: 10 deals

**Possible reasons**:
1. 10 deals failed to import (check console for errors during upload)
2. 10 deals were imported but with a different stage
3. RLS (Row Level Security) is hiding 10 deals from your user

## What I Need From You

To fix the count discrepancy, please:

1. **Open browser console** (F12) and look for:
   - `[BulkImport] Parsed rows: XXXX` 
   - `[Stage Mapping] Unknown stage:` warnings
   - Any errors

2. **Check your Excel file's "Deal Stage" column** - send me a list of UNIQUE stage values (case-sensitive)

3. **Tell me**: Do you want "Discovery" as a separate stage, or is it OK to have it grouped with "DM Connected"?

## EOD Portal Improvements ⏰

I'll tackle these after we fix the bulk upload:

1. ✅ Add Clock In function
2. ✅ Change "Save & Submit Report" → "Submit EOD"
3. ✅ Add comments section when tasks are started
4. ✅ Email function to miguel@migueldiaz.ca
5. ✅ Store EOD history for tracking

## Temporary Workaround

While we investigate, you can see ALL deals by:
1. Go to Deals page
2. Switch to "List View" instead of "Pipeline View"
3. This shows all 1307 deals without stage grouping

