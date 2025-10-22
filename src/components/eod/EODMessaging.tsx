import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name: string;
}

interface Conversation {
  id: string;
  name?: string;
  is_group?: boolean;
}

export function EODMessaging() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [directMessages, setDirectMessages] = useState<Message[]>([]);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newGroupMessage, setNewGroupMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [groupChatId, setGroupChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeMessaging();
  }, []);

  const initializeMessaging = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      // Load direct messages with admin
      await loadDirectConversation(user.id);

      // Load group chats
      await loadGroupChats(user.id);

    } catch (error) {
      console.error('Error initializing messaging:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDirectConversation = async (userId: string) => {
    try {
      // Get all conversations this user is part of
      const { data: userConvs, error: convError } = await (supabase as any)
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (convError) {
        console.error('Error fetching user conversations:', convError);
        return;
      }

      console.log('User conversations:', userConvs);

      if (userConvs && userConvs.length > 0) {
        // For each conversation, check if it's a 2-person conversation (direct message)
        for (const conv of userConvs) {
          const { data: participants, error: partError } = await (supabase as any)
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id);

          if (partError) {
            console.error('Error fetching participants:', partError);
            continue;
          }

          // If it's a 2-person conversation, use it
          if (participants && participants.length === 2) {
            console.log('Found direct conversation:', conv.conversation_id);
            setConversationId(conv.conversation_id);
            await loadDirectMessages(conv.conversation_id);
            subscribeToDirectMessages(conv.conversation_id);
            return;
          }
        }
      }

      // If no conversation found, we'll create one when user sends first message
      console.log('No existing direct conversation found');
    } catch (error) {
      console.error('Error loading direct conversation:', error);
    }
  };

  const loadGroupChats = async (userId: string) => {
    try {
      // Get all group chats this user is a member of
      const { data: memberOf, error: memberError } = await (supabase as any)
        .from('group_chat_members')
        .select('group_chat_id')
        .eq('user_id', userId);

      if (memberError) {
        console.error('Error fetching group memberships:', memberError);
        return;
      }

      console.log('User is member of groups:', memberOf);

      if (memberOf && memberOf.length > 0) {
        // Use the first group chat
        const groupId = memberOf[0].group_chat_id;
        setGroupChatId(groupId);
        await loadGroupMessages(groupId);
        subscribeToGroupMessages(groupId);
      } else {
        console.log('No group chats found');
      }
    } catch (error) {
      console.error('Error loading group chats:', error);
    }
  };

  const loadDirectMessages = async (convId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      console.log('Loaded direct messages:', data?.length || 0);

      if (data) {
        const messagesWithNames = await Promise.all(
          data.map(async (msg: any) => {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, email')
              .eq('user_id', msg.sender_id)
              .single();

            return {
              ...msg,
              sender_name: profile?.first_name
                ? `${profile.first_name} ${profile.last_name || ''}`.trim()
                : profile?.email || 'Unknown'
            };
          })
        );

        setDirectMessages(messagesWithNames);
      }
    } catch (error) {
      console.error('Error loading direct messages:', error);
    }
  };

  const loadGroupMessages = async (groupId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('group_chat_messages')
        .select('*')
        .eq('group_chat_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading group messages:', error);
        return;
      }

      console.log('Loaded group messages:', data?.length || 0);

      if (data) {
        const messagesWithNames = await Promise.all(
          data.map(async (msg: any) => {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, email')
              .eq('user_id', msg.sender_id)
              .single();

            return {
              id: msg.id,
              content: msg.content,
              sender_id: msg.sender_id,
              created_at: msg.created_at,
              sender_name: profile?.first_name
                ? `${profile.first_name} ${profile.last_name || ''}`.trim()
                : profile?.email || 'Unknown'
            };
          })
        );

        setGroupMessages(messagesWithNames);
      }
    } catch (error) {
      console.error('Error loading group messages:', error);
    }
  };

  const subscribeToDirectMessages = (convId: string) => {
    const subscription = supabase
      .channel(`direct-messages:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('user_id', payload.new.sender_id)
            .single();

          const newMsg: Message = {
            id: payload.new.id,
            content: payload.new.content,
            sender_id: payload.new.sender_id,
            created_at: payload.new.created_at,
            sender_name: profile?.first_name
              ? `${profile.first_name} ${profile.last_name || ''}`.trim()
              : profile?.email || 'Unknown'
          };

          setDirectMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const subscribeToGroupMessages = (groupId: string) => {
    const subscription = supabase
      .channel(`group-messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_chat_messages',
          filter: `group_chat_id=eq.${groupId}`
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('user_id', payload.new.sender_id)
            .single();

          const newMsg: Message = {
            id: payload.new.id,
            content: payload.new.content,
            sender_id: payload.new.sender_id,
            created_at: payload.new.created_at,
            sender_name: profile?.first_name
              ? `${profile.first_name} ${profile.last_name || ''}`.trim()
              : profile?.email || 'Unknown'
          };

          setGroupMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendDirectMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // If no conversation exists, create one first
      if (!conversationId) {
        const { data: adminProfile } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (!adminProfile) {
          toast({
            title: 'No admin found',
            description: 'Cannot create conversation',
            variant: 'destructive'
          });
          return;
        }

        // Create conversation
        const { data: newConv, error: convError } = await (supabase as any)
          .from('conversations')
          .insert({})
          .select()
          .single();

        if (convError || !newConv) {
          toast({
            title: 'Error creating conversation',
            description: convError?.message,
            variant: 'destructive'
          });
          return;
        }

        // Add participants
        await (supabase as any)
          .from('conversation_participants')
          .insert([
            { conversation_id: newConv.id, user_id: currentUser.id },
            { conversation_id: newConv.id, user_id: adminProfile.user_id }
          ]);

        setConversationId(newConv.id);
        subscribeToDirectMessages(newConv.id);
      }

      // Send message
      const { error } = await (supabase as any)
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: newMessage.trim()
        });

      if (error) {
        toast({
          title: 'Error sending message',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending direct message:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const sendGroupMessage = async () => {
    if (!newGroupMessage.trim() || !groupChatId) return;

    try {
      const { error } = await (supabase as any)
        .from('group_chat_messages')
        .insert({
          group_chat_id: groupChatId,
          sender_id: currentUser.id,
          content: newGroupMessage.trim()
        });

      if (error) {
        toast({
          title: 'Error sending message',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      setNewGroupMessage('');
    } catch (error: any) {
      console.error('Error sending group message:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const renderMessages = (messages: Message[]) => (
    <ScrollArea className="flex-1 p-4">
      {messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No messages yet. Start a conversation!
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex gap-2 max-w-[70%] ${
                  msg.sender_id === currentUser?.id ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {msg.sender_name[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      msg.sender_id === currentUser?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">{msg.sender_name}</p>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading messages...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <Tabs defaultValue="direct" className="flex-1 flex flex-col">
          <TabsList className="mx-4">
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Direct Messages
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="flex-1 flex flex-col m-0">
            {renderMessages(directMessages)}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendDirectMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={2}
                  className="resize-none"
                />
                <Button onClick={sendDirectMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="group" className="flex-1 flex flex-col m-0">
            {groupChatId ? (
              <>
                {renderMessages(groupMessages)}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      value={newGroupMessage}
                      onChange={(e) => setNewGroupMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendGroupMessage();
                        }
                      }}
                      placeholder="Type a message to the group..."
                      rows={2}
                      className="resize-none"
                    />
                    <Button onClick={sendGroupMessage} disabled={!newGroupMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No group chats available</p>
                  <p className="text-sm">Ask an admin to add you to a group</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

