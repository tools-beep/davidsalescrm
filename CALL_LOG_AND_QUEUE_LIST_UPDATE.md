# Call Log & Queue List View Update

## Date: November 19, 2025

## Updates Made

### ✅ 1. Call Log Auto-Show After Hangup

**Status:** Already Working ✓

The call log dialog **already automatically opens** after hanging up a call. The system is properly configured:

**How it works:**
1. When a call ends in Dialpad, `DialpadMiniDialer.tsx` dispatches a `dialpad:call:ended` event with full call data
2. `DealDetail.tsx` listens for this event and automatically:
   - Opens the Call Log Form
   - Pre-populates it with call data (phone number, duration, timestamps, dealId, contactId)
   - Switches to the "Calls" tab

**Code Flow:**
```typescript
// DialpadMiniDialer.tsx (lines 158-182)
else if (payload.state === 'off') {
  // Call ended
  const callData = {
    phoneNumber: payload.external_number || phoneNumber || 'Unknown',
    callId: payload.id,
    startTime: callStartTime,
    endTime,
    duration,
    dealId: dealId,
    contactId: contactId,
  };
  
  // Dispatch global event
  const callEndEvent = new CustomEvent('dialpad:call:ended', {
    detail: callData
  });
  window.dispatchEvent(callEndEvent);
}

// DealDetail.tsx (lines 142-156)
const handleCallEnded = (event: CustomEvent) => {
  console.log('=== CALL ENDED EVENT RECEIVED ===');
  
  // Store call data
  if (event.detail) {
    setPendingCallLog(event.detail);
  }
  
  // Open the dialog
  setCallLogOpen(true);
  setActiveTab('calls');
  console.log('✅ Call log form opened, switched to calls tab');
};
```

**If the call log is not showing:**
1. Check browser console for the logs: "📞 Call ended", "✅ Global call ended event dispatched"
2. Make sure you're calling from a Deal Detail page (not from another page)
3. Ensure the Dialpad iframe is properly loaded and authenticated

---

### ✅ 2. Queue Tab Now Shows List View

**File:** `src/pages/Tasks.tsx`

**Change:** Converted the Queue tab from single-task card view to a multi-task list view.

**Before:** 
- Showed one task at a time in a large card
- Had "Task 1 of X" navigation
- Used `currentTaskIndex` to track which task was being viewed

**After:**
- Shows **all queued tasks** in a scrollable list
- Each task displayed in its own card
- All tasks visible at once for easy scanning
- Quick actions on each task:
  - ✅ **Complete** - Mark task as completed
  - ❌ **Skip** - Mark task as cancelled
  - 📦 **Back to Pending** - Return task to pending status

**Benefits:**
- ✅ See all queued tasks at once
- ✅ Better overview of work to be done
- ✅ Quick access to task actions
- ✅ Easier to prioritize and plan
- ✅ Consistent with other tabs (All Tasks, Overdue, Today, Skipped)

**Task Card Features:**
- Task title and description
- Priority and status badges
- Associated deal (clickable link)
- Contact info with call button (if phone available)
- Company info with call button (if phone available)
- Due date
- Quick action buttons

---

## Testing

### Test Call Log Auto-Show:
1. Go to any Deal Detail page
2. Click the call button on a contact's phone number
3. Make a call using Dialpad
4. Hang up the call
5. **Expected:** Call log form automatically opens with pre-filled data

### Test Queue List View:
1. Go to Tasks page
2. Start a queue with multiple tasks (select tasks and click "Start Queue")
3. Click on the "Queue" tab
4. **Expected:** See all queued tasks in a list format
5. Test action buttons on each task

---

## Related Files

**Call Log System:**
- `/src/components/calls/DialpadMiniDialer.tsx` - Dispatches call ended event
- `/src/components/calls/DialpadCTIManager.tsx` - Manages CTI state
- `/src/components/calls/CallLogForm.tsx` - The call log dialog
- `/src/pages/DealDetail.tsx` - Listens for event and opens dialog

**Queue List View:**
- `/src/pages/Tasks.tsx` - Tasks page with updated Queue tab (lines 447-574)

---

## Notes

- The call log feature has been working since the previous implementation
- The Queue list view provides a better user experience for managing multiple tasks
- Both features are now consistent with the rest of the UI design

