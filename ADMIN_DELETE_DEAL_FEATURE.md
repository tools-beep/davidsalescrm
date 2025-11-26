# 🗑️ Admin Delete Deal Feature - Documentation

## Overview
Added a delete/remove function for deals in the pipeline stages, accessible only to admin users. This allows admins to quickly remove deals directly from the pipeline view without navigating to the deal detail page.

## Features

### 1. Delete Button for Admins
- **Visibility**: Only visible to users with `role === 'admin'`
- **Location**: On each deal card in the pipeline view, next to the "View" button
- **Icon**: Red trash icon (🗑️)
- **Styling**: Destructive styling (red) to indicate dangerous action

### 2. Confirmation Dialog
- **Safety**: Requires confirmation before deletion
- **Information Shown**:
  - Deal name
  - Company name (if available)
  - Warning that action cannot be undone
- **Actions**:
  - Cancel: Closes dialog without deleting
  - Delete: Confirms and permanently removes the deal

### 3. Optimistic UI Updates
- **Immediate Feedback**: Deal is removed from UI instantly upon confirmation
- **Error Handling**: If deletion fails, deal is restored to the UI with error toast
- **Success Toast**: Shows confirmation message when deal is successfully deleted

### 4. Database Cleanup
- **Permanent Deletion**: Deal is completely removed from the `deals` table
- **Cascade Effects**: Related data (notes, activities, etc.) should be handled by database constraints
- **Refresh**: Pipeline metrics and counts are updated after deletion

## User Experience Flow

### For Admin Users:
1. Navigate to Deals page → Pipeline view
2. Locate the deal to remove
3. Click the red trash icon on the deal card
4. Review the confirmation dialog
5. Click "Delete" to confirm or "Cancel" to abort
6. Deal disappears immediately from the pipeline
7. Success toast confirms the deletion

### For Non-Admin Users:
- Delete button is not visible
- Only "View" button is shown on deal cards
- No access to delete functionality

## Technical Implementation

### Files Modified:

#### 1. `src/components/pipeline/DraggableDealCard.tsx`
**Changes:**
- Added `isAdmin` and `onDelete` props
- Added `Trash2` icon import
- Added `AlertDialog` components for confirmation
- Added delete button (only rendered if `isAdmin === true`)
- Added `showDeleteDialog` state
- Updated memo comparison to include `isAdmin`

**New Props:**
```typescript
interface DraggableDealCardProps {
  deal: Deal;
  isDragging?: boolean;
  isAdmin?: boolean;        // NEW
  onDelete?: (dealId: string) => void;  // NEW
}
```

#### 2. `src/components/pipeline/DragDropPipeline.tsx`
**Changes:**
- Added `isAdmin` prop to component interface
- Added `handleDeleteDeal` callback function
- Implemented optimistic deletion with error recovery
- Passed `isAdmin` and `onDelete` to `DraggableDealCard`
- Added toast notifications for success/error

**New Function:**
```typescript
const handleDeleteDeal = useCallback(async (dealId: string) => {
  // Optimistic update - remove from UI
  // Delete from database
  // Show success/error toast
  // Refresh parent component
}, [localDeals, toast, onDealUpdate]);
```

#### 3. `src/pages/Deals.tsx`
**Changes:**
- Passed `isAdmin={userRole === 'admin'}` to `DragDropPipeline`

## Security Considerations

### Frontend Protection:
- Delete button only renders for admin users
- Role check: `userRole === 'admin'`

### Backend Protection (Recommended):
⚠️ **Important**: Ensure RLS (Row Level Security) policies on the `deals` table restrict DELETE operations to admin users only.

**Recommended RLS Policy:**
```sql
CREATE POLICY "Only admins can delete deals"
ON deals
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);
```

## UI/UX Details

### Delete Button Styling:
- **Size**: Small (`h-7`)
- **Color**: Red text, red background on hover
- **Icon**: Trash2 (3x3 size)
- **Position**: Right side of action buttons row

### Confirmation Dialog:
- **Title**: "Delete Deal"
- **Description**: Clear warning with deal name and company
- **Buttons**:
  - Cancel: Gray, left-aligned
  - Delete: Red, right-aligned, destructive styling

### Toast Notifications:
- **Success**: "Deal Deleted" with description
- **Error**: "Error" with error message from database

## Testing Checklist

- [x] Admin can see delete button on deal cards
- [x] Non-admin users cannot see delete button
- [x] Clicking delete button opens confirmation dialog
- [x] Clicking "Cancel" closes dialog without deleting
- [x] Clicking "Delete" removes deal from database
- [x] Deal disappears from UI immediately
- [x] Success toast appears after deletion
- [x] Error toast appears if deletion fails
- [x] Deal is restored to UI if deletion fails
- [x] Pipeline counts update after deletion
- [x] Delete button doesn't interfere with drag-and-drop

## Future Enhancements (Optional)

1. **Soft Delete**: Instead of permanent deletion, mark deals as "deleted" with a flag
2. **Undo Feature**: Allow admins to undo recent deletions
3. **Bulk Delete**: Select multiple deals and delete at once
4. **Delete Permissions**: More granular permissions (e.g., deal owner can delete their own deals)
5. **Audit Log**: Track who deleted what and when
6. **Archive Instead**: Move deals to an "Archived" state instead of deleting

## Notes

- The delete function works in both expanded and collapsed stage views
- Deletion is permanent and cannot be undone (unless database backups are used)
- Related data (contacts, companies) are NOT deleted, only the deal record
- The feature respects the drag-and-drop functionality (delete button stops propagation)

