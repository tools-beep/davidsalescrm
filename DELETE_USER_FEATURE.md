# 🗑️ Delete User Feature - Admin Panel

## ✅ Feature Added

Admins can now permanently delete user accounts from the DAR Admin panel.

---

## 🎯 Where to Find It

### Location 1: Users Tab
**Path**: Admin → Users Tab

- Delete button (trash icon) appears in the rightmost column of each user row
- Located next to "Enable/Disable" button

### Location 2: Roles Tab (User Management)
**Path**: Admin → Roles Tab → User Management Section

- "Delete User" button appears next to "Reset Password" button
- Full text button with trash icon

---

## 🔒 Safety Features

### Double Confirmation Required:

1. **First Confirmation**: Alert dialog explaining consequences
   ```
   Are you sure you want to delete [Name] ([Email])?
   
   This will:
   - Delete their account permanently
   - Remove all their data (deals, calls, tasks, etc.)
   - Cannot be undone
   
   Type "DELETE" to confirm.
   ```

2. **Second Confirmation**: Prompt requiring exact text "DELETE"
   ```
   Type "DELETE" to permanently delete [Name]'s account:
   ```

### Protection Against Accidental Deletion:
- ❌ Clicking "Cancel" on first dialog → No action
- ❌ Clicking "Cancel" on second prompt → No action
- ❌ Typing anything other than "DELETE" → No action
- ✅ Only typing exactly "DELETE" → Proceeds with deletion

---

## 🗑️ What Gets Deleted

When a user is deleted:

### 1. **User Profile** ✅
- Removed from `user_profiles` table
- All profile data deleted

### 2. **Authentication** ✅
- Auth user deleted from Supabase Auth
- Can no longer log in

### 3. **Related Data** (Cascade Delete)
Depending on database constraints, these may be deleted:
- Deals owned by user
- Calls logged by user
- Tasks created by user
- DAR/EOD reports
- Time entries
- Client assignments
- And more...

**Note**: The exact cascade behavior depends on your database foreign key constraints.

---

## 🚨 Important Warnings

### ⚠️ PERMANENT ACTION
- **Cannot be undone**
- **No recovery possible**
- **All data is lost**

### ⚠️ Use Cases for Deletion
**When to delete a user:**
- Employee left the company
- Account created by mistake
- Duplicate account
- User requested account deletion (GDPR compliance)

**When NOT to delete:**
- User is temporarily inactive → Use "Disable" instead
- User on vacation → Use "Disable" instead
- Need to preserve historical data → Use "Disable" instead

### ⚠️ Best Practice: Disable First
**Recommended workflow:**
1. **Disable** the user first (keeps data, prevents login)
2. **Wait 30-90 days** to ensure no data is needed
3. **Delete** if confirmed no longer needed

---

## 🔧 Technical Details

### Function: `deleteUser()`

**Location**: `src/pages/Admin.tsx`

**Process**:
1. Show confirmation dialogs
2. Verify user typed "DELETE"
3. Delete from `user_profiles` table
4. Delete from Supabase Auth (admin API)
5. Update UI to remove user from list
6. Show success/error toast

**Error Handling**:
- If profile deletion fails → Shows error, no changes made
- If auth deletion fails → Profile deleted, shows warning
- If both fail → Shows error, no changes made

### Permissions Required:
- **Admin role** in `user_profiles` table
- **Service role key** for auth deletion (automatic in Supabase)

---

## 🧪 Testing

### Test 1: Successful Deletion
1. Go to Admin → Users tab
2. Find a test user
3. Click trash icon
4. Click "OK" on first dialog
5. Type "DELETE" in prompt
6. ✅ User should be deleted
7. ✅ Toast shows success message
8. ✅ User removed from list

### Test 2: Cancelled Deletion
1. Click trash icon
2. Click "Cancel" on first dialog
3. ✅ Nothing happens
4. ✅ User still in list

### Test 3: Wrong Confirmation Text
1. Click trash icon
2. Click "OK" on first dialog
3. Type "delete" (lowercase) or anything else
4. ✅ Deletion cancelled
5. ✅ User still in list

### Test 4: Verify Auth Deletion
1. Delete a user
2. Try to log in with that user's credentials
3. ✅ Login should fail
4. ✅ "Invalid credentials" error

---

## 📊 UI Updates

### Users Tab:
**Before**:
```
| Name | Email | Role | Status | Timezone | [Assign Clients] [Enable/Disable] |
```

**After**:
```
| Name | Email | Role | Status | Timezone | [Assign Clients] [Enable/Disable] [🗑️] |
```

### Roles Tab (User Management):
**Before**:
```
| Name | Email | Role | [Reset Password] |
```

**After**:
```
| Name | Email | Role | [Reset Password] [Delete User] |
```

---

## 🔍 Troubleshooting

### Issue: "Failed to delete user"

**Possible Causes**:
1. **Database constraints** - User has related data that can't be deleted
2. **Permission issues** - Admin doesn't have delete permissions
3. **Network error** - Connection to Supabase failed

**Solutions**:
1. Check database foreign key constraints
2. Verify admin role in database
3. Check browser console for detailed error
4. Try disabling user instead

### Issue: "Partial deletion" Warning

**What it means**:
- User profile was deleted
- But auth user deletion failed
- User can't log in (profile missing) but auth record exists

**Solution**:
- Contact Supabase support to manually delete auth user
- Or use Supabase Dashboard → Authentication → Users → Delete

### Issue: Can't delete specific user

**Possible Reasons**:
1. **Self-deletion prevented** - Can't delete your own account
2. **Last admin** - Can't delete the only admin
3. **System user** - Some users might be protected

**Solution**:
- Add protection logic if needed
- Create another admin first
- Use Supabase Dashboard for system users

---

## 🎯 Future Enhancements (Optional)

### Soft Delete Option:
Instead of permanent deletion, mark as deleted:
```typescript
// Add 'deleted_at' column
updateUser(id, { 
  is_active: false, 
  deleted_at: new Date().toISOString() 
});
```

### Bulk Delete:
Allow selecting multiple users and deleting at once.

### Audit Log:
Log all user deletions for compliance:
```sql
CREATE TABLE user_deletion_log (
  id UUID PRIMARY KEY,
  deleted_user_id UUID,
  deleted_by_admin_id UUID,
  deleted_at TIMESTAMP,
  reason TEXT
);
```

### Data Export Before Delete:
Offer to export user's data before deletion (GDPR compliance).

---

## ✅ Summary

**Feature**: Delete User Account
**Location**: Admin → Users Tab & Roles Tab
**Safety**: Double confirmation required
**Impact**: Permanent deletion of user and related data
**Status**: ✅ **COMPLETE & READY TO USE**

---

**Use with caution!** 🚨 This is a destructive action that cannot be undone.

