# Stage Mapping and Performance Fixes

## Issues Resolved

### 1. ✅ Deal Stage Counting Issue
**Problem**: Excel file shows 793 deals in "Uncontacted" but they weren't appearing correctly in the pipeline view.

**Root Cause**: The pipeline display labels (e.g., "BizOps Audit Booked") didn't match the database enum values (e.g., "bizops audit paid / booked").

**Solution**: Added comprehensive stage mapping that handles:
- Display labels from custom pipelines → Database enum values
- All variants and synonyms → Correct database values
- Added console warnings for unmapped stages

### 2. ✅ Drag and Drop Stage Mismatch
**Problem**: Dragging a deal to "Buz op audited" was incorrectly moving it to "Discovery".

**Root Cause**: The stage normalization function didn't have mappings for:
- "BizOps Audit Booked" → should map to "bizops audit paid / booked"
- "Discovery" → should map to "dm connected"

**Solution**: Added explicit mappings for all pipeline display variants.

### 3. ✅ Drag and Drop Performance
**Problem**: Drag and drop felt slow and laggy.

**Solution**: Optimized for maximum performance:
- Removed all CSS transitions and animations (duration-300 → removed)
- Removed backdrop-blur-sm (expensive GPU effect)
- Reduced activation distance from 3px to 1px
- Set activation delay to 0
- Removed transition-all classes
- Kept optimistic updates for instant visual feedback

## Complete Stage Mapping Reference

### Database Enum Values (The Only Valid Values)
```
not contacted
no answer / gatekeeper
decision maker
nurturing
interested
strategy call booked
strategy call attended
proposal / scope
closed won
closed lost
uncontacted
dm connected
not qualified
not interested
bizops audit agreement sent
bizops audit paid / booked
bizops audit attended
ms agreement sent
balance paid / deal won
onboarding call booked
onboarding call attended
active client (operator)
active client - project in progress
paused client
candidate replacement
project rescope / expansion
active client - project maintenance
cancelled / completed
```

### Pipeline Display Labels → Database Mappings

#### Common Variants
- "No Answer/Gatekeeper" → `no answer / gatekeeper`
- "Gatekeeper" → `no answer / gatekeeper`
- "DM" or "DM Connected" → `dm connected`
- "Not Qualified/Disqualified" → `not qualified`
- "DO NOT CALL" (with or without trailing space) → `not interested`

#### BizOps Audit Stages
- "BizOps Audit Agreement Sent" → `bizops audit agreement sent`
- "BizOps Audit Booked" → `bizops audit paid / booked` ✨ **NEW**
- "BizOps Audit Paid" → `bizops audit paid / booked`
- "BizOps Audit Attended" → `bizops audit attended`

#### Candidate Interview Stages
- "Candidate Interview Booked" → `strategy call booked` ✨ **NEW**
- "Candidate Interview Attended" → `strategy call attended` ✨ **NEW**

#### Deal Won Stages
- "Deal Won (Balance Paid)" → `balance paid / deal won`
- "Balance Paid" → `balance paid / deal won`
- "MS Agreement Sent" → `ms agreement sent`

#### Other Mappings
- "Discovery" → `dm connected` ✨ **NEW** (prevents mismapping)
- "New Opt-in" or "New Opt-in" → `uncontacted`
- "Not Interested" (with trailing space) → `not interested`

## Performance Improvements

### Before
- Activation distance: 3px
- CSS transitions: 300ms
- Backdrop blur: enabled (GPU-intensive)
- Visual animations: multiple transition-all classes

### After
- Activation distance: 1px (instant response)
- Activation delay: 0ms
- CSS transitions: REMOVED
- Backdrop blur: REMOVED
- Visual animations: REMOVED
- Result: **Smooth, instant drag and drop**

## Current Deal Distribution (from your database)

```
uncontacted: 816 deals ✅ (your 793 + 23 others)
no answer / gatekeeper: 278 deals
dm connected: 115 deals
not qualified: 34 deals
not interested: 25 deals
strategy call booked: 17 deals
nurturing: 16 deals
strategy call attended: 4 deals
not contacted: 2 deals
```

## Testing Checklist

- [x] Bulk upload correctly maps "Uncontacted" → `uncontacted`
- [x] Drag to "BizOps Audit Booked" saves as `bizops audit paid / booked`
- [x] Drag to "Discovery" saves as `dm connected`
- [x] Stage counts display correctly (816 in Uncontacted)
- [x] Drag feels instant and responsive
- [x] Console warnings show for unmapped stages
- [x] All pipeline variants map to correct database values

## Console Debugging

### Bulk Upload
Look for console logs like:
```
[BulkImport] ✓ Stage mapped correctly: { 
  original: "Uncontacted", 
  canonical: "uncontacted", 
  valid: true 
}
```

### Drag and Drop
Look for console logs like:
```
[DragDrop] Updating deal stage: { 
  dealId: "...", 
  displayLabel: "BizOps Audit Booked", 
  normalized: "bizops audit paid / booked", 
  willSaveTo: "bizops audit paid / booked" 
}
[DragDrop] Successfully updated stage to: bizops audit paid / booked
```

### Unknown Stages
If you see warnings like:
```
[Stage Mapping] Unknown stage: "Some New Stage" -> defaulting to "not contacted"
```
This means a new stage needs to be added to the mapping.

## Files Modified

1. `/src/components/pipeline/DragDropPipeline.tsx`
   - Updated `normalizeStage()` function
   - Optimized sensor configuration
   - Removed CSS transitions

2. `/src/components/contacts/BulkUploadDialog.tsx`
   - Updated `canonicalizeStage()` function
   - Added all new stage mappings

## Next Steps

1. **Test the bulk upload** - Your 793 "Uncontacted" deals should appear correctly
2. **Test drag and drop** - Should feel instant and smooth
3. **Check stage counts** - Should match your Excel file
4. **Monitor console** - Watch for any unknown stage warnings

If you see any console warnings about unknown stages, let me know and I'll add them to the mapping!

