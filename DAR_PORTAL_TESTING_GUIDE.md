# DAR Portal Testing Guide

## Quick Tests to Verify All Fixes

### Test 1: Task Duration Accuracy (Pause/Resume)
**What was fixed:** Duration now correctly includes time from paused sessions

**How to test:**
1. Clock in for a client
2. Start a task and let it run for 2 minutes
3. Pause the task
4. Wait a moment, then resume the task
5. Let it run for another 2 minutes
6. Stop the task and add comments
7. **Expected Result:** Duration should show approximately 4 minutes total

**Success Criteria:** ✅ Duration accurately reflects total work time across pause/resume cycles

---

### Test 2: Clock-In Persistence (Browser Tab Switching)
**What was fixed:** Clock-in status now persists when switching tabs or refreshing

**How to test:**
1. Clock in for a client
2. Note the clock-in time
3. Switch to another browser tab for 30 seconds
4. Switch back to the DAR portal tab
5. **Expected Result:** You should still be clocked in with the same time

**Alternative test:**
1. Clock in for a client
2. Refresh the page (F5 or Ctrl+R)
3. Wait for the page to reload
4. **Expected Result:** Clock-in status should reload and show you're still clocked in

**Success Criteria:** ✅ Clock-in status persists across tab switches and page refreshes

---

### Test 3: Queue Tasks Persistence (Logout/Refresh)
**What was fixed:** Queue tasks now properly persist in the database and reload

**How to test:**
1. Select a client
2. Add 3 tasks to the queue with different descriptions:
   - "Task 1: Test queue persistence"
   - "Task 2: Verify data loads"
   - "Task 3: Check after refresh"
3. Click "Show Queue" to verify tasks are visible
4. Refresh the page (F5)
5. **Expected Result:** All 3 tasks should still be in the queue

**Alternative test (logout):**
1. Add tasks to queue
2. Log out
3. Log back in
4. Navigate to the DAR portal
5. Select the same client
6. **Expected Result:** Queue tasks should still be there

**Success Criteria:** ✅ Queue tasks persist across page refreshes and login sessions

---

### Test 4: Clock-In + Task Start
**What was fixed:** Verified no code clocks you out when starting a task

**How to test:**
1. Clock in for a client
2. Note the green "Clocked In" indicator
3. Enter a task description
4. Click "Start Task"
5. **Expected Result:** Clock-in status should remain unchanged (still showing "Clocked In")

**Success Criteria:** ✅ Clock-in status is unaffected by starting, pausing, or stopping tasks

---

## Advanced Testing Scenarios

### Multi-Tab Testing
**Purpose:** Verify real-time sync works across multiple tabs

**How to test:**
1. Open DAR portal in two browser tabs
2. In Tab 1: Clock in for Client A
3. In Tab 2: Refresh or wait a few seconds
4. **Expected Result:** Tab 2 should show you're clocked in for Client A
5. In Tab 1: Add a task to the queue
6. In Tab 2: Check the queue
7. **Expected Result:** Tab 2 should show the new queued task

---

### Error Recovery Testing
**Purpose:** Verify error handling works correctly

**How to test:**
1. Open browser developer tools (F12)
2. Go to Network tab
3. Enable "Offline" mode
4. Try to add a task to the queue
5. **Expected Result:** You should see an error toast message
6. Disable "Offline" mode
7. Try again
8. **Expected Result:** Task should now be added successfully

---

## What to Look For

### ✅ Success Indicators
- Clock-in status shows green dot and "Clocked In" badge
- Queue tasks show count in parentheses: "Queue (3)"
- Task duration increases in real-time (updates every second)
- Toast notifications appear for actions (Clock In, Task Started, etc.)
- Console logs show data loading (open browser console with F12)

### ❌ Potential Issues
- Clock-in status shows "Not Clocked In" immediately after clocking in
- Queue tasks disappear after refresh
- Task duration is incorrect after pause/resume
- Error messages in browser console (red text)
- No toast notifications appearing

---

## Console Logging

### Helpful Console Messages
When everything is working, you should see these messages in the browser console (F12 → Console tab):

```
Loaded clock-ins from database: 1
Clock-in state updated for 5 clients
Loaded queue tasks from database: 3
```

### Error Messages to Watch For
If you see these, something needs attention:

```
Error querying clock-ins: ...
Error loading queue tasks: ...
Failed to load client clock-ins: ...
```

---

## Troubleshooting

### Problem: Clock-in status shows "Not Clocked In" but I just clocked in

**Possible Causes:**
1. Data is still loading - wait 2-3 seconds
2. Network issue - check internet connection
3. Database permission issue - check browser console for errors

**Solution:**
1. Refresh the page
2. Check browser console for error messages
3. Try logging out and back in

---

### Problem: Queue tasks disappear after refresh

**Possible Causes:**
1. Tasks didn't save to database
2. RLS policy preventing access
3. Network issue during save

**Solution:**
1. Check browser console for "Loaded queue tasks from database: X" message
2. Look for error messages
3. Try adding a task again and check Network tab in dev tools

---

### Problem: Task duration is still incorrect

**Possible Causes:**
1. Browser cache showing old code
2. Need to hard refresh

**Solution:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Try in incognito/private mode

---

## Report Issues

If you encounter any issues after testing:

1. **Note the exact steps** to reproduce the problem
2. **Check browser console** for error messages (F12 → Console)
3. **Check network requests** (F12 → Network tab)
4. **Take screenshots** if helpful
5. **Note browser and version** (Chrome, Firefox, Safari, etc.)

---

## Expected Improvements

After these fixes, you should experience:

✅ Accurate task durations that include paused time
✅ Clock-in status that persists across sessions
✅ Queue tasks that never disappear
✅ Stable state when switching tabs or browsers
✅ Real-time updates across multiple tabs
✅ Clear error messages when something goes wrong
✅ Better logging for debugging issues

---

## Quick Reference Commands

### Open Browser Console
- **Windows/Linux:** F12 or Ctrl+Shift+I
- **Mac:** Cmd+Option+I

### Hard Refresh (Clear Cache)
- **Windows/Linux:** Ctrl+Shift+R or Ctrl+F5
- **Mac:** Cmd+Shift+R

### View Network Requests
- F12 → Network tab → Refresh page

---

## Summary

All four reported issues have been fixed:

1. ✅ **Task duration accuracy** - Now includes accumulated time from pause/resume
2. ✅ **Clock-in persistence** - No more auto-clock-out on tab switch
3. ✅ **Queue task persistence** - Tasks saved to database and reload properly
4. ✅ **Clock-in stability** - Starting tasks doesn't affect clock-in status

The DAR portal should now work reliably for daily use!

