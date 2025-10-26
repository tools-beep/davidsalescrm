# React Hooks Error Fix

**Date:** October 27, 2025, 1:10 AM  
**Error:** "Rendered more hooks than during the previous render"  
**Status:** ✅ FIXED

---

## Error Details

```
Uncaught Error: Rendered more hooks than during the previous render.
at DragDropPipeline (DragDropPipeline.tsx:341:24)
```

---

## Root Cause

The `updateDealStage` callback had `isUpdating` in its dependency array:

```typescript
}, [localDeals, toast, isUpdating]);  // ❌ BAD
```

This caused the callback to be recreated every time `isUpdating` changed, which then caused `handleDragEnd` to be recreated, leading to inconsistent hook calls.

---

## Solution

Removed `isUpdating` from the dependency array and replaced it with `pipelineId`:

```typescript
}, [localDeals, toast, pipelineId]);  // ✅ GOOD
```

**Why this works:**
- `isUpdating` is a state variable that changes frequently
- It's used inside the callback but doesn't need to be in dependencies
- The callback uses the current value via closure
- `pipelineId` is stable and actually needed for the update logic

---

## Files Modified

✅ `src/components/pipeline/DragDropPipeline.tsx`
- Line 301: Changed dependency array

---

## Testing

- [x] ✅ No hooks error
- [x] ✅ Drag and drop works
- [x] ✅ No linting errors
- [x] ✅ Performance maintained

---

**Error resolved!** 🎉

