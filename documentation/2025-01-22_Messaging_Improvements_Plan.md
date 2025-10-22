# 2025-01-22: Messaging Improvements Plan

## 📋 Overview
Comprehensive improvements to messaging system including archive/delete functionality, unread notifications, and UI enhancements.

---

## 🎯 Features to Implement

### 1. **Fix Admin Group Chat Display** ✅
   - **Status:** IN PROGRESS
   - **Issue:** Group chats not appearing in "All Conversations" list
   - **Solution:** Rewritten `loadGroupChats` with better error handling and logging
   - **Changes Made:**
     - Split query into multiple steps
     - Added detailed console logging
     - Used `.maybeSingle()` instead of `.single()` to avoid errors
     - Better error handling

### 2. **Archive Conversations**
   - **For:** Direct messages (conversations)
   - **Features:**
     - Archive button in conversation dropdown
     - Archived conversations hidden from main list
     - View archived conversations (optional filter)
     - Unarchive functionality
   - **Database:**
     - Add `archived` boolean column
     - Add `archived_at` timestamp
     - Add `archived_by` user reference

### 3. **Delete Group Chats**
   - **For:** Group chats only
   - **Features:**
     - Delete button in group chat dropdown
     - Soft delete (deleted_at timestamp)
     - Only creator or admin can delete
     - Confirmation dialog
   - **Database:**
     - Add `deleted_at` timestamp
     - Add `deleted_by` user reference

### 4. **Unread Message Notifications**
   - **For:** EOD Portal
   - **Features:**
     - Red badge with unread count
     - Show on "Messages" tab in EOD Portal
     - Update in real-time
     - Reset when user opens messages
   - **Database:**
     - Add `unread_count` to `conversation_participants`
     - Add `unread_count` to `group_chat_members`
     - Add `last_read_at` timestamp
     - Triggers to increment on new message

### 5. **Improve EOD Messaging UI**
   - **Features:**
     - Better visual hierarchy
     - Clearer message bubbles
     - Improved spacing
     - Better empty states
     - Smoother animations

---

## 🗄️ Database Changes

### Migration File: `20250122000000_add_archive_and_delete_functions.sql`

#### Conversations (Archive):
```sql
ALTER TABLE conversations
ADD COLUMN archived BOOLEAN DEFAULT FALSE,
ADD COLUMN archived_at TIMESTAMPTZ,
ADD COLUMN archived_by UUID REFERENCES auth.users(id);
```

#### Group Chats (Soft Delete):
```sql
ALTER TABLE group_chats
ADD COLUMN deleted_at TIMESTAMPTZ,
ADD COLUMN deleted_by UUID REFERENCES auth.users(id);
```

#### Unread Counts:
```sql
ALTER TABLE conversation_participants
ADD COLUMN unread_count INTEGER DEFAULT 0,
ADD COLUMN last_read_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE group_chat_members
ADD COLUMN unread_count INTEGER DEFAULT 0,
ADD COLUMN last_read_at TIMESTAMPTZ DEFAULT NOW();
```

#### Functions:
- `mark_conversation_read(conversation_uuid, user_uuid)` - Reset unread count
- `mark_group_chat_read(group_uuid, user_uuid)` - Reset group unread count
- `increment_unread_count()` - Trigger function for new messages
- `increment_group_unread_count()` - Trigger function for group messages

#### Triggers:
- `trigger_increment_unread` - On INSERT to `messages`
- `trigger_increment_group_unread` - On INSERT to `group_chat_messages`

---

## 🎨 UI Changes

### Admin Messages Page (`src/pages/Messages.tsx`):

#### 1. Conversation Card with Dropdown:
```typescript
<div className="flex items-center gap-3">
  <Avatar>...</Avatar>
  <div className="flex-1">
    <p>{conv.other_user.full_name}</p>
    <p>{conv.last_message}</p>
  </div>
  {conv.unread_count > 0 && (
    <Badge className="bg-red-500">{conv.unread_count}</Badge>
  )}
  <DropdownMenu>
    <DropdownMenuTrigger>
      <MoreVertical />
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => archiveConversation(conv.id)}>
        <Archive /> Archive
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

#### 2. Group Chat Card with Dropdown:
```typescript
<div className="flex items-center gap-3">
  <Avatar>...</Avatar>
  <div className="flex-1">
    <p>{group.name} <Badge>Group</Badge></p>
    <p>{group.member_count} members</p>
  </div>
  {group.unread_count > 0 && (
    <Badge className="bg-red-500">{group.unread_count}</Badge>
  )}
  <DropdownMenu>
    <DropdownMenuTrigger>
      <MoreVertical />
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => deleteGroupChat(group.id)}>
        <Trash2 /> Delete Group
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

### EOD Portal (`src/pages/EODPortal.tsx`):

#### Messages Tab with Badge:
```typescript
<TabsTrigger value="messages" className="relative">
  <MessageSquare className="h-4 w-4 mr-2" />
  Messages
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
      {unreadCount}
    </span>
  )}
</TabsTrigger>
```

---

## 🔧 Functions to Implement

### Admin Messages (`src/pages/Messages.tsx`):

```typescript
// Archive conversation
const archiveConversation = async (conversationId: string) => {
  await supabase
    .from('conversations')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      archived_by: currentUser.id
    })
    .eq('id', conversationId);
  
  await loadConversations(); // Reload
  toast({ title: 'Conversation archived' });
};

// Unarchive conversation
const unarchiveConversation = async (conversationId: string) => {
  await supabase
    .from('conversations')
    .update({
      archived: false,
      archived_at: null,
      archived_by: null
    })
    .eq('id', conversationId);
  
  await loadConversations();
  toast({ title: 'Conversation unarchived' });
};

// Delete group chat
const deleteGroupChat = async (groupId: string) => {
  // Show confirmation dialog
  if (!confirm('Are you sure you want to delete this group chat?')) {
    return;
  }
  
  await supabase
    .from('group_chats')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: currentUser.id
    })
    .eq('id', groupId);
  
  await loadGroupChats();
  setSelectedGroup(null);
  toast({ title: 'Group chat deleted' });
};

// Mark conversation as read
const markConversationRead = async (conversationId: string) => {
  await supabase.rpc('mark_conversation_read', {
    conversation_uuid: conversationId,
    user_uuid: currentUser.id
  });
};

// Mark group chat as read
const markGroupChatRead = async (groupId: string) => {
  await supabase.rpc('mark_group_chat_read', {
    group_uuid: groupId,
    user_uuid: currentUser.id
  });
};

// Load unread counts
const loadUnreadCounts = async () => {
  // For conversations
  const { data: convUnread } = await supabase
    .from('conversation_participants')
    .select('conversation_id, unread_count')
    .eq('user_id', currentUser.id);
  
  // Update conversations with unread counts
  // ...
  
  // For group chats
  const { data: groupUnread } = await supabase
    .from('group_chat_members')
    .select('group_id, unread_count')
    .eq('user_id', currentUser.id);
  
  // Update group chats with unread counts
  // ...
};
```

### EOD Portal (`src/pages/EODPortal.tsx`):

```typescript
// Get total unread count
const [unreadCount, setUnreadCount] = useState(0);

const loadUnreadCount = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  // Get direct message unread count
  const { data: convData } = await supabase
    .from('conversation_participants')
    .select('unread_count')
    .eq('user_id', user.id);
  
  const convUnread = convData?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0;
  
  // Get group chat unread count
  const { data: groupData } = await supabase
    .from('group_chat_members')
    .select('unread_count')
    .eq('user_id', user.id);
  
  const groupUnread = groupData?.reduce((sum, g) => sum + (g.unread_count || 0), 0) || 0;
  
  setUnreadCount(convUnread + groupUnread);
};

// Subscribe to changes
useEffect(() => {
  loadUnreadCount();
  
  const subscription = supabase
    .channel('unread_updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages'
    }, () => {
      loadUnreadCount();
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'group_chat_messages'
    }, () => {
      loadUnreadCount();
    })
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

## ✅ Implementation Checklist

### Phase 1: Database (DONE)
- [x] Create migration file
- [x] Add archive columns to conversations
- [x] Add delete columns to group_chats
- [x] Add unread_count columns
- [x] Create helper functions
- [x] Create triggers

### Phase 2: Admin Messages
- [ ] Add dropdown menus to conversation cards
- [ ] Implement archiveConversation function
- [ ] Implement unarchiveConversation function
- [ ] Implement deleteGroupChat function
- [ ] Add confirmation dialog for delete
- [ ] Update loadConversations to exclude archived
- [ ] Add "Show Archived" filter option
- [ ] Implement markConversationRead
- [ ] Implement markGroupChatRead
- [ ] Display unread counts on cards

### Phase 3: EOD Portal
- [ ] Add unread count state
- [ ] Implement loadUnreadCount function
- [ ] Add real-time subscription for unread updates
- [ ] Display badge on Messages tab
- [ ] Mark messages as read when opened
- [ ] Improve UI design

### Phase 4: Testing
- [ ] Test archive conversation
- [ ] Test unarchive conversation
- [ ] Test delete group chat
- [ ] Test unread counts update
- [ ] Test real-time notifications
- [ ] Test across multiple users

### Phase 5: Documentation
- [ ] Create user guide
- [ ] Update technical documentation
- [ ] Add screenshots

---

## 🎯 Priority Order

1. **Fix group chat display** (IN PROGRESS) - Critical bug
2. **Add unread notifications** - High priority for UX
3. **Add archive functionality** - Medium priority
4. **Add delete functionality** - Medium priority
5. **Improve UI** - Low priority (polish)

---

**Status:** 🚧 **In Progress**  
**Next Step:** Complete admin Messages.tsx implementation

