import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Users, 
  Plus, 
  Send, 
  Search,
  MoreVertical,
  UserPlus,
  Archive,
  Trash2,
  ArchiveRestore,
  Image as ImageIcon,
  X,
  Menu,
  ArrowLeft
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface Conversation {
  id: string;
  other_user: User;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: User;
}

interface GroupChat {
  id: string;
  name: string;
  description?: string;
  member_count: number;
  unread_count: number;
  last_message?: string;
  last_message_time?: string;
}

export default function Messages() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [newChatDialog, setNewChatDialog] = useState(false);
  const [newGroupDialog, setNewGroupDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
      loadGroupChats();
      loadUsers();
      
      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, () => {
          if (selectedConversation) {
            loadMessages(selectedConversation);
          }
          loadConversations();
        })
        .subscribe();

      const groupMessagesSubscription = supabase
        .channel('group_messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_chat_messages'
        }, () => {
          if (selectedGroup) {
            loadGroupMessages(selectedGroup);
          }
          loadGroupChats();
        })
        .subscribe();

      return () => {
        messagesSubscription.unsubscribe();
        groupMessagesSubscription.unsubscribe();
      };
    }
  }, [currentUser, selectedConversation, selectedGroup]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, email, first_name, last_name')
      .neq('user_id', currentUser?.id);

    if (data) {
      setUsers(data.map((u: any) => ({
        id: u.user_id,
        email: u.email,
        full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
      })));
    }
  };

  const loadConversations = async () => {
    // Get all conversations where current user is a participant
    const { data: convData } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUser.id);

    if (!convData) return;

    const conversationIds = convData.map(c => c.conversation_id);
    
    // Get conversation details with other participants
    const conversations: Conversation[] = [];
    
    for (const convId of conversationIds) {
      // Get other participant
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId)
        .neq('user_id', currentUser.id)
        .single();

      if (participants) {
        // Get user info
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('user_id, email, first_name, last_name')
          .eq('user_id', participants.user_id)
          .single();

        if (userProfile) {
          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get user's last_read_at for this conversation
          const { data: participantData } = await (supabase as any)
            .from('conversation_participants')
            .select('last_read_at')
            .eq('conversation_id', convId)
            .eq('user_id', currentUser.id)
            .single();

          // Calculate unread count
          let unreadCount = 0;
          if (participantData) {
            const { count } = await (supabase as any)
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', convId)
              .gt('created_at', participantData.last_read_at || '1970-01-01')
              .neq('sender_id', currentUser.id);
            
            unreadCount = count || 0;
          }

          conversations.push({
            id: convId,
            other_user: {
              id: userProfile.user_id,
              email: userProfile.email,
              full_name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
            },
            last_message: lastMsg?.content,
            last_message_time: lastMsg?.created_at,
            unread_count: unreadCount
          });
        }
      }
    }

    // Sort conversations by last message time (newest first)
    conversations.sort((a, b) => {
      const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
      const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
      return timeB - timeA;
    });

    setConversations(conversations);
  };

  const loadGroupChats = async () => {
    try {
      console.log('Loading group chats for user:', currentUser.id);
      
      // First, get all group_chat_members for this user
      const { data: memberData, error: memberError } = await (supabase as any)
        .from('group_chat_members')
        .select('group_id')
        .eq('user_id', currentUser.id);

      if (memberError) {
        console.error('Error fetching group memberships:', memberError);
        return;
      }

      console.log('User is member of groups:', memberData);

      if (!memberData || memberData.length === 0) {
        console.log('No group memberships found');
        setGroupChats([]);
        return;
      }

      // Get group details for each group
      const groupIds = memberData.map((m: any) => m.group_id);
      const { data: groupsData, error: groupsError } = await (supabase as any)
        .from('group_chats')
        .select('id, name, description, created_by')
        .in('id', groupIds);

      if (groupsError) {
        console.error('Error fetching group details:', groupsError);
        return;
      }

      console.log('Group details:', groupsData);

      // Enrich with member count and last message
      const groupsWithDetails = await Promise.all(groupsData.map(async (group: any) => {
        // Get member count
        const { count } = await (supabase as any)
          .from('group_chat_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        // Get last message
        const { data: lastMsg } = await (supabase as any)
          .from('group_chat_messages')
          .select('content, created_at')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle instead of single to avoid error if no messages

        console.log(`Group ${group.name} - Members: ${count}, Last message:`, lastMsg);

        // Get user's last_read_at for this group
        const { data: memberData } = await (supabase as any)
          .from('group_chat_members')
          .select('last_read_at')
          .eq('group_id', group.id)
          .eq('user_id', currentUser.id)
          .single();

        // Calculate unread count
        let unreadCount = 0;
        if (memberData) {
          const { count: unreadMsgCount } = await (supabase as any)
            .from('group_chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .gt('created_at', memberData.last_read_at || '1970-01-01')
            .neq('sender_id', currentUser.id);
          
          unreadCount = unreadMsgCount || 0;
        }

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          member_count: count || 0,
          unread_count: unreadCount,
          last_message: lastMsg?.content || 'No messages yet',
          last_message_time: lastMsg?.created_at
        };
      }));

      // Sort group chats by last message time (newest first)
      groupsWithDetails.sort((a, b) => {
        const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
        const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
        return timeB - timeA;
      });

      console.log('Setting group chats:', groupsWithDetails);
      setGroupChats(groupsWithDetails);
    } catch (error) {
      console.error('Unexpected error in loadGroupChats:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    console.log('Loading messages for conversation:', conversationId);
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    console.log('Loaded messages:', data?.length || 0);

    if (data && data.length > 0) {
      const messagesWithUsers = await Promise.all(data.map(async (m: any) => {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('user_id, email, first_name, last_name')
          .eq('user_id', m.sender_id)
          .single();

        return {
          ...m,
          sender: userProfile ? {
            id: userProfile.user_id,
            email: userProfile.email,
            full_name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
          } : {
            id: m.sender_id,
            email: 'Unknown',
            full_name: 'Unknown User'
          }
        };
      }));

      setMessages(messagesWithUsers);
    } else {
      setMessages([]);
    }

    // Mark conversation as read
    await (supabase as any)
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', currentUser.id);
  };

  const loadGroupMessages = async (groupId: string) => {
    const { data } = await supabase
      .from('group_chat_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (data) {
      const messagesWithUsers = await Promise.all(data.map(async (m: any) => {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('user_id, email, first_name, last_name')
          .eq('user_id', m.sender_id)
          .single();

        return {
          ...m,
          sender: userProfile ? {
            id: userProfile.user_id,
            email: userProfile.email,
            full_name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
          } : undefined
        };
      }));

      setMessages(messagesWithUsers);
    }

    // Mark group chat as read
    await (supabase as any)
      .from('group_chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('user_id', currentUser.id);
  };

  const startConversation = async (userId: string) => {
    try {
      console.log('Starting conversation with user:', userId);
      
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id);

      if (existingConv) {
        for (const conv of existingConv) {
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)
            .eq('user_id', userId)
            .single();

          if (otherParticipant) {
            console.log('Found existing conversation:', conv.conversation_id);
            setSelectedConversation(conv.conversation_id);
            setSelectedGroup(null);
            loadMessages(conv.conversation_id);
            setNewChatDialog(false);
            return;
          }
        }
      }

      console.log('Creating new conversation...');
      
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        toast({ 
          title: 'Error creating conversation', 
          description: convError.message,
          variant: 'destructive' 
        });
        return;
      }

      if (!newConv) {
        console.error('No conversation returned');
        toast({ title: 'Error: No conversation created', variant: 'destructive' });
        return;
      }

      console.log('Conversation created:', newConv.id);
      console.log('Adding current user as participant...');

      // Add current user first
      const { error: currentUserError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConv.id, user_id: currentUser.id });

      if (currentUserError) {
        console.error('Error adding current user:', currentUserError);
        toast({ 
          title: 'Error adding you to conversation', 
          description: currentUserError.message,
          variant: 'destructive' 
        });
        return;
      }

      console.log('Current user added. Adding other user...');

      // Add other user
      const { error: otherUserError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConv.id, user_id: userId });

      if (otherUserError) {
        console.error('Error adding other user:', otherUserError);
        toast({ 
          title: 'Error adding participant', 
          description: otherUserError.message,
          variant: 'destructive' 
        });
        return;
      }

      console.log('Both participants added successfully!');

      setSelectedConversation(newConv.id);
      setSelectedGroup(null);
      loadMessages(newConv.id);
      loadConversations();
      setNewChatDialog(false);
      
      toast({ 
        title: 'Chat created!', 
        description: 'You can now start messaging',
      });
    } catch (error: any) {
      console.error('Unexpected error in startConversation:', error);
      toast({ 
        title: 'Unexpected error', 
        description: error.message || 'Something went wrong',
        variant: 'destructive' 
      });
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      toast({ title: 'Group name and members required', variant: 'destructive' });
      return;
    }

    try {
      console.log('Creating group chat:', groupName);
      
      // Create group
      const { data: newGroup, error: groupError } = await (supabase as any)
        .from('group_chats')
        .insert({
          name: groupName,
          description: groupDescription,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (groupError) {
        console.error('Error creating group:', groupError);
        toast({ 
          title: 'Error creating group', 
          description: groupError.message,
          variant: 'destructive' 
        });
        return;
      }

      if (!newGroup) {
        toast({ title: 'Error creating group', variant: 'destructive' });
        return;
      }

      console.log('Group created:', newGroup.id);

      // Add members (including creator as admin)
      const members = [
        { group_id: newGroup.id, user_id: currentUser.id, role: 'admin' },
        ...selectedUsers.map(userId => ({
          group_id: newGroup.id,
          user_id: userId,
          role: 'member'
        }))
      ];

      console.log('Adding members:', members.length);

      const { error: membersError } = await (supabase as any)
        .from('group_chat_members')
        .insert(members);

      if (membersError) {
        console.error('Error adding members:', membersError);
        toast({ 
          title: 'Error adding members', 
          description: membersError.message,
          variant: 'destructive' 
        });
        return;
      }

      console.log('Group created successfully');

      // Reload group chats and select the new one
      await loadGroupChats();
      setSelectedGroup(newGroup.id);
      setSelectedConversation(null);
      await loadGroupMessages(newGroup.id);

      setGroupName('');
      setGroupDescription('');
      setSelectedUsers([]);
      setNewGroupDialog(false);
      
      toast({ title: 'Group created successfully' });
    } catch (error: any) {
      console.error('Error in createGroupChat:', error);
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({ title: 'Please select an image file', variant: 'destructive' });
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `message-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({ title: 'Error uploading image', description: uploadError.message, variant: 'destructive' });
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Unexpected upload error:', error);
      toast({ title: 'Error uploading image', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;

    console.log('Sending message...', { 
      conversation: selectedConversation, 
      group: selectedGroup,
      sender: currentUser.id,
      hasImage: !!selectedImage
    });

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    // Upload image if selected
    let imageUrl: string | null = null;
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) {
        setNewMessage(messageContent); // Restore message on error
        return;
      }
      removeImage(); // Clear image preview after successful upload
    }

    if (selectedConversation) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: currentUser.id,
          content: messageContent || (imageUrl ? '[Image]' : ''),
          image_url: imageUrl
        })
        .select();

      if (error) {
        console.error('Error sending message:', error);
        toast({ 
          title: 'Error sending message', 
          description: error.message,
          variant: 'destructive' 
        });
        setNewMessage(messageContent); // Restore message on error
        return;
      }

      console.log('Message sent successfully:', data);
      
      // Instantly add message to the list
      if (data && data[0]) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('user_id, email, first_name, last_name')
          .eq('user_id', currentUser.id)
          .single();

        const newMsg = {
          ...data[0],
          sender: userProfile ? {
            id: userProfile.user_id,
            email: userProfile.email,
            full_name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
          } : undefined
        };

        setMessages(prev => [...prev, newMsg]);
      }
      
      // Reload conversations to update sorting
      loadConversations();
    } else if (selectedGroup) {
      const { data, error } = await supabase
        .from('group_chat_messages')
        .insert({
          group_id: selectedGroup,
          sender_id: currentUser.id,
          content: messageContent || (imageUrl ? '[Image]' : ''),
          image_url: imageUrl
        })
        .select();

      if (error) {
        console.error('Error sending group message:', error);
        toast({ 
          title: 'Error sending message', 
          description: error.message,
          variant: 'destructive' 
        });
        setNewMessage(messageContent); // Restore message on error
        return;
      }

      console.log('Group message sent successfully:', data);
      
      // Instantly add message to the list
      if (data && data[0]) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('user_id, email, first_name, last_name')
          .eq('user_id', currentUser.id)
          .single();

        const newMsg = {
          ...data[0],
          sender: userProfile ? {
            id: userProfile.user_id,
            email: userProfile.email,
            full_name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
          } : undefined
        };

        setMessages(prev => [...prev, newMsg]);
      }
      
      // Reload group chats to update sorting
      loadGroupChats();
    }
  };

  const archiveConversation = async (conversationId: string) => {
    try {
      await (supabase as any)
        .from('conversations')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: currentUser.id
        })
        .eq('id', conversationId);
      
      toast({ title: 'Conversation archived' });
      await loadConversations();
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteGroupChat = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group chat? This cannot be undone.')) {
      return;
    }

    try {
      await (supabase as any)
        .from('group_chats')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser.id
        })
        .eq('id', groupId);
      
      toast({ title: 'Group chat deleted' });
      await loadGroupChats();
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
        setMessages([]);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentConversation = conversations.find(c => c.id === selectedConversation);
  const currentGroup = groupChats.find(g => g.id === selectedGroup);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-4 md:p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle - only show when chat is selected */}
            {(selectedConversation || selectedGroup) && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => {
                  setSelectedConversation(null);
                  setSelectedGroup(null);
                  setShowMobileSidebar(true);
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Messages</h1>
              <p className="text-muted-foreground text-sm hidden md:block">Chat with your team</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={newChatDialog} onOpenChange={setNewChatDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="md:size-default">
                  <MessageSquare className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">New Chat</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                  <DialogDescription>Select a user to start chatting</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {filteredUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => startConversation(user.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {user.full_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={newGroupDialog} onOpenChange={setNewGroupDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="md:size-default">
                  <Users className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">New Group</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Group Chat</DialogTitle>
                  <DialogDescription>Create a group and add members</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Group Name</label>
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Enter group name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Textarea
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      placeholder="Enter description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Add Members</label>
                    <ScrollArea className="h-[200px] border rounded-lg p-2">
                      {users.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                          onClick={() => {
                            setSelectedUsers(prev =>
                              prev.includes(user.id)
                                ? prev.filter(id => id !== user.id)
                                : [...prev, user.id]
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            readOnly
                            className="rounded"
                          />
                          <span className="text-sm">{user.full_name}</span>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewGroupDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createGroupChat}>Create Group</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - All Chats & Groups */}
        <div className={`
          w-full md:w-80 border-r flex flex-col
          ${(selectedConversation || selectedGroup) ? 'hidden md:flex' : 'flex'}
        `}>
          <div className="p-4 border-b">
            <h3 className="font-medium">All Conversations</h3>
          </div>
          
          <ScrollArea className="flex-1">
            {conversations.length === 0 && groupChats.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {/* Direct Chats */}
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`p-3 md:p-3 rounded-lg hover:bg-accent transition-colors touch-manipulation ${
                      selectedConversation === conv.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="cursor-pointer h-10 w-10 md:h-8 md:w-8"
                        onClick={() => {
                          setSelectedConversation(conv.id);
                          setSelectedGroup(null);
                          loadMessages(conv.id);
                          setShowMobileSidebar(false);
                        }}
                      >
                        <AvatarFallback>
                          {conv.other_user.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className="flex-1 min-w-0 cursor-pointer py-2"
                        onClick={() => {
                          setSelectedConversation(conv.id);
                          setSelectedGroup(null);
                          loadMessages(conv.id);
                          setShowMobileSidebar(false);
                        }}
                      >
                        <p className="font-medium truncate">{conv.other_user.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message || 'No messages yet'}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge className="bg-primary">{conv.unread_count}</Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => archiveConversation(conv.id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}

                {/* Group Chats - With Blue Highlight */}
                {groupChats.map(group => (
                  <div
                    key={group.id}
                    className={`p-3 md:p-3 rounded-lg transition-colors border-l-4 border-l-blue-500 touch-manipulation ${
                      selectedGroup === group.id 
                        ? 'bg-blue-50 dark:bg-blue-950/30' 
                        : 'bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-100 dark:hover:bg-blue-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="bg-blue-500 cursor-pointer h-10 w-10 md:h-8 md:w-8"
                        onClick={() => {
                          setSelectedGroup(group.id);
                          setSelectedConversation(null);
                          loadGroupMessages(group.id);
                          setShowMobileSidebar(false);
                        }}
                      >
                        <AvatarFallback className="bg-blue-500 text-white">
                          <Users className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className="flex-1 min-w-0 cursor-pointer py-2"
                        onClick={() => {
                          setSelectedGroup(group.id);
                          setSelectedConversation(null);
                          loadGroupMessages(group.id);
                          setShowMobileSidebar(false);
                        }}
                      >
                        <p className="font-medium truncate flex items-center gap-2">
                          {group.name}
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            Group
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {group.member_count} members
                        </p>
                      </div>
                      {group.unread_count > 0 && (
                        <Badge className="bg-blue-600">{group.unread_count}</Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => deleteGroupChat(group.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={`
          flex-1 flex flex-col
          ${(selectedConversation || selectedGroup) ? 'flex' : 'hidden md:flex'}
        `}>
          {selectedConversation || selectedGroup ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {selectedConversation
                        ? currentConversation?.other_user.full_name.substring(0, 2).toUpperCase()
                        : <Users className="h-4 w-4" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {selectedConversation ? currentConversation?.other_user.full_name : currentGroup?.name}
                    </h3>
                    {selectedGroup && (
                      <p className="text-sm text-muted-foreground">
                        {currentGroup?.member_count} members
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map(message => {
                    const isOwn = message.sender_id === currentUser.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                          {!isOwn && selectedGroup && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {message.sender?.full_name}
                            </p>
                          )}
                          <div
                            className={`rounded-lg p-3 ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {(message as any).image_url && (
                              <img 
                                src={(message as any).image_url} 
                                alt="Attachment" 
                                className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90"
                                onClick={() => window.open((message as any).image_url, '_blank')}
                              />
                            )}
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}
                            >
                              {new Date(message.created_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-3 md:p-4 border-t bg-background">
                {imagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 md:h-9 md:w-9 touch-manipulation"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    title="Attach image"
                  >
                    <ImageIcon className="h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    onPaste={async (e) => {
                      const items = e.clipboardData?.items;
                      if (!items) return;
                      
                      for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                          e.preventDefault();
                          const file = items[i].getAsFile();
                          if (file) {
                            handleImageSelect({ target: { files: [file] } } as any);
                            toast({ title: 'Image pasted', description: 'Image ready to send' });
                          }
                          break;
                        }
                      }
                    }}
                    placeholder="Type a message... (Ctrl+V to paste images)"
                    rows={1}
                    className="resize-none flex-1 text-base md:text-sm min-h-[40px] md:min-h-[36px]"
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim() && !selectedImage}
                    className="h-10 w-10 md:h-9 md:w-9 touch-manipulation"
                    size="icon"
                  >
                    <Send className="h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
                <p className="text-sm">Choose a chat or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

