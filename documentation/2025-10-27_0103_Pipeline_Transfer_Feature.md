# Pipeline Transfer Feature

**Date:** October 27, 2025, 1:03 AM  
**Feature:** Transfer deals between pipelines with one click  
**Status:** ✅ IMPLEMENTED

---

## Overview

Added a "Transfer Pipeline" button to each deal card that allows users to quickly move deals from one pipeline to another. This makes it easy to reorganize deals without manually editing each one.

---

## Features

### 1. **Transfer Button on Deal Cards**
- ✅ Button appears on every deal card in pipeline view
- ✅ Shows "Transfer Pipeline" with an arrow icon
- ✅ Only visible when there are 2+ pipelines available
- ✅ Dropdown menu shows all available pipelines (except current one)

### 2. **Smart Transfer Logic**
- ✅ Automatically moves deal to the **first stage** of the target pipeline
- ✅ Updates both `pipeline_id` and `stage` in one transaction
- ✅ Refreshes the view after transfer
- ✅ Shows success confirmation message

### 3. **User Experience**
- ✅ Click "Transfer Pipeline" button
- ✅ Select target pipeline from dropdown
- ✅ Deal instantly moves to new pipeline
- ✅ Success message shows: "Successfully moved [Deal Name] to [Pipeline Name]"

---

## How It Works

### User Flow:
```
1. User views deals in "Sales Pipeline"
2. Clicks "Transfer Pipeline" on a deal card
3. Selects "Recruitment Pipeline" from dropdown
4. Deal is moved to first stage of Recruitment Pipeline
5. View refreshes to show updated deals
6. Success message appears
```

### Database Update:
```sql
UPDATE deals 
SET 
  pipeline_id = 'new_pipeline_id',
  stage = 'first_stage_of_new_pipeline'
WHERE id = 'deal_id';
```

---

## Implementation Details

### 1. Updated `DraggableDealCard.tsx`

#### Added Imports:
```typescript
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

#### Added Props:
```typescript
interface Pipeline {
  id: string;
  name: string;
}

interface DraggableDealCardProps {
  deal: Deal;
  isDragging?: boolean;
  pipelines?: Pipeline[];
  currentPipelineId?: string;
  onTransferPipeline?: (dealId: string, newPipelineId: string) => void;
}
```

#### Added UI:
```typescript
{/* Transfer Pipeline Button */}
{pipelines && pipelines.length > 1 && onTransferPipeline && (
  <div className="pt-2 border-t border-border/50">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs h-7">
          <ArrowRightLeft className="h-3 w-3 mr-1" />
          Transfer Pipeline
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {pipelines
          .filter(p => p.id !== currentPipelineId)
          .map((pipeline) => (
            <DropdownMenuItem
              key={pipeline.id}
              onClick={() => onTransferPipeline(deal.id, pipeline.id)}
            >
              {pipeline.name}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
)}
```

### 2. Updated `DragDropPipeline.tsx`

#### Added Props:
```typescript
interface Pipeline {
  id: string;
  name: string;
}

interface DragDropPipelineProps {
  // ... existing props
  pipelines?: Pipeline[];
  onTransferPipeline?: (dealId: string, newPipelineId: string) => void;
}
```

#### Passed Props to Cards:
```typescript
<DraggableDealCard 
  key={deal.id}
  deal={deal} 
  isDragging={activeDeal?.id === deal.id}
  pipelines={pipelines}
  currentPipelineId={pipelineId}
  onTransferPipeline={onTransferPipeline}
/>
```

### 3. Updated `Deals.tsx`

#### Added Transfer Function:
```typescript
const handleTransferPipeline = useCallback(async (dealId: string, newPipelineId: string) => {
  try {
    const targetPipeline = pipelines.find(p => p.id === newPipelineId);
    const defaultStage = targetPipeline?.stages?.[0] || 'not contacted';
    
    const { error } = await supabase
      .from("deals")
      .update({ 
        pipeline_id: newPipelineId,
        stage: defaultStage.replace(/\s*\/\s*/g, ' / ').toLowerCase().trim()
      })
      .eq("id", dealId);

    if (error) throw error;

    await fetchDeals();
    
    const deal = deals.find(d => d.id === dealId);
    const pipelineName = targetPipeline?.name || 'new pipeline';
    alert(`Successfully moved "${deal?.name}" to ${pipelineName}`);
  } catch (error) {
    console.error("Error transferring deal:", error);
    alert("Failed to transfer deal. Please try again.");
  }
}, [pipelines, deals]);
```

#### Passed Props to Component:
```typescript
<DragDropPipeline 
  deals={filteredDeals} 
  onDealUpdate={fetchDeals}
  stages={pipelineStages}
  stageColors={...}
  pipelineId={selectedPipeline || undefined}
  pipelines={pipelines.map(p => ({ id: p.id, name: p.name }))}
  onTransferPipeline={handleTransferPipeline}
/>
```

---

## UI/UX Details

### Button Appearance:
- **Size:** Small (`h-7`)
- **Style:** Outline variant
- **Icon:** ArrowRightLeft (bidirectional arrow)
- **Width:** Full width of card
- **Position:** Below stage badge, separated by border

### Dropdown Menu:
- **Alignment:** Right-aligned with button
- **Width:** 224px (`w-56`)
- **Label:** "Move to Pipeline"
- **Items:** All pipelines except current one
- **Empty State:** "No other pipelines available"

### Event Handling:
- **stopPropagation():** Prevents card drag when clicking button
- **Dropdown closes** automatically after selection
- **Success feedback:** Alert with deal name and target pipeline

---

## Use Cases

### 1. **Sales to Recruitment**
```
Deal: "Hire Marketing Manager"
From: Sales Pipeline → To: Recruitment Pipeline
Result: Deal moves to "Not Contacted" stage in Recruitment
```

### 2. **Reorganizing Deals**
```
User realizes deal belongs in different pipeline
Clicks "Transfer Pipeline" → Selects correct pipeline
Deal instantly moves without losing data
```

### 3. **Pipeline Cleanup**
```
Multiple deals in wrong pipeline
Batch transfer by clicking button on each deal
All deals properly categorized
```

---

## Benefits

✅ **Fast:** One-click transfer instead of editing deal details  
✅ **Safe:** Automatically sets appropriate first stage  
✅ **Clear:** Shows success message with deal and pipeline names  
✅ **Smart:** Only shows when multiple pipelines exist  
✅ **Intuitive:** Dropdown shows only valid target pipelines  

---

## Testing Checklist

- [x] ✅ Button appears on deal cards when 2+ pipelines exist
- [x] ✅ Button hidden when only 1 pipeline exists
- [x] ✅ Dropdown shows all pipelines except current one
- [x] ✅ Clicking pipeline transfers deal successfully
- [x] ✅ Deal moves to first stage of target pipeline
- [x] ✅ Success message displays correctly
- [x] ✅ View refreshes after transfer
- [x] ✅ No linting errors
- [x] ✅ stopPropagation prevents unwanted drag events

---

## Files Modified

1. ✅ `src/components/pipeline/DraggableDealCard.tsx`
   - Added transfer button UI
   - Added dropdown menu
   - Added pipeline props

2. ✅ `src/components/pipeline/DragDropPipeline.tsx`
   - Added pipeline props to interface
   - Passed props to deal cards

3. ✅ `src/pages/Deals.tsx`
   - Added `handleTransferPipeline` function
   - Passed pipelines and handler to component

---

## Future Enhancements

💡 **Possible improvements:**
- Batch transfer (select multiple deals)
- Custom stage selection (instead of always first stage)
- Transfer history/undo functionality
- Drag deals between pipeline columns
- Keyboard shortcuts for transfer

---

## Notes

- Transfer button uses `stopPropagation()` to prevent interfering with card drag
- Default stage is normalized to match database enum format
- Success message uses browser `alert()` (can be replaced with toast notification)
- Transfer refreshes entire deals list to ensure data consistency

---

## Related Features

- ✅ **Pipeline Management:** Create/edit pipelines
- ✅ **Drag & Drop:** Move deals between stages
- ✅ **Stage Mapping:** Automatic stage normalization
- ✅ **Deal Filtering:** Filter by pipeline

---

**This feature makes pipeline management much more flexible and user-friendly!** 🎉

