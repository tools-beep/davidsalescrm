import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender_name: string;
}

export function SimpleMessaging() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeMessaging();
  }, []);

  const initializeMessaging = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      // Find or create conversation with admin
      const { data: adminProfile, error: adminError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (adminError || !adminProfile) {
        console.error('No admin found:', adminError);
        toast({
          title: 'No admin available',
          description: 'Cannot find an admin to message',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      console.log('Found admin:', adminProfile.user_id);

      // Check if conversation exists
      const { data: existingConv, error: convError } = await (supabase as any)
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (convError) {
        console.error('Error fetching conversations:', convError);
      }

      let convId = null;

      if (existingConv && existingConv.length > 0) {
        console.log('Found existing conversations:', existingConv.length);
        // Find conversation with admin
        for (const conv of existingConv) {
          const { data: otherParticipants, error: participantError } = await (supabase as any)
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.conversation_id)
            .eq('user_id', adminProfile.user_id);

          if (participantError) {
            console.error('Error checking participant:', participantError);
            continue;
          }

          if (otherParticipants && otherParticipants.length > 0) {
            convId = conv.conversation_id;
            console.log('Found existing conversation with admin:', convId);
            break;
          }
        }
      }

      // Create conversation if doesn't exist
      if (!convId) {
        console.log('Creating new conversation with admin');
        const { data: newConv, error: createError } = await (supabase as any)
          .from('conversations')
          .insert({})
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          toast({
            title: 'Error creating conversation',
            description: createError.message,
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        if (newConv) {
          console.log('Created conversation:', newConv.id);
          
          // Insert participants one at a time
          const { error: userError } = await (supabase as any)
            .from('conversation_participants')
            .insert({ conversation_id: newConv.id, user_id: user.id });

          if (userError) {
            console.error('Error adding user to conversation:', userError);
          }

          const { error: adminError2 } = await (supabase as any)
            .from('conversation_participants')
            .insert({ conversation_id: newConv.id, user_id: adminProfile.user_id });

          if (adminError2) {
            console.error('Error adding admin to conversation:', adminError2);
          }

          convId = newConv.id;
          console.log('Conversation setup complete');
        }
      }

      setConversationId(convId);
      if (convId) {
        await loadMessages(convId);
        subscribeToMessages(convId);
      }
    } catch (error) {
      console.error('Error initializing messaging:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    const { data } = await (supabase as any)
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      // Get sender names
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

      setMessages(messagesWithNames);
    }
  };

  const subscribeToMessages = (convId: string) => {
    const subscription = supabase
      .channel(`messages:${convId}`)
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

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

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
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading messages...</div>
        </CardContent>
      </Card>
    );
  }

  if (!conversationId) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Unable to load messages</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle>Messages with Admin</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
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
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              rows={2}
              className="resize-none"
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

