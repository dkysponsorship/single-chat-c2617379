import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { ChatWindow, Message } from "@/components/ChatWindow";
import { 
  getCurrentUser,
  sendMessage, 
  getMessages, 
  createChatId, 
  deleteMessage, 
  logoutUser, 
  getUserProfile, 
  sendAIMessage, 
  AI_FRIEND_ID, 
  editMessage, 
  deleteChat 
} from "@/services/supabase";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { useNotificationContext } from "@/components/NotificationProvider";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { sendPushNotification } from "@/services/pushNotifications";

const Chat = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friend, setFriend] = useState<User | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const { toast } = useToast();
  const { markAsRead } = useNotificationContext();
  
  const chatId = currentUser && friendId ? createChatId(currentUser.id, friendId) : '';
  const { friendTyping, handleInputChange, stopTyping } = useTypingIndicator(chatId, currentUser?.id || null);

  useEffect(() => {
    const initChat = async () => {
      const user = await getCurrentUser();
      if (!user) {
        navigate("/");
        return;
      }
      
      setCurrentUser(user);
      
      if (friendId) {
        // Check if this is AI chat
        if (friendId === AI_FRIEND_ID) {
          setFriend({
            id: AI_FRIEND_ID,
            username: 'ai_assistant',
            displayName: 'AI Assistant',
            email: '',
            isOnline: true,
            bio: 'I am your friendly AI assistant, always here to chat! 🤖',
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AIAssistant',
            createdAt: new Date().toISOString()
          });
          // Load AI chat messages
          const chatId = createChatId(user.id, AI_FRIEND_ID);
          const unsubscribe = getMessages(chatId, (newMessages) => {
            setMessages(newMessages);
          });
          
          return () => {
            if (unsubscribe) unsubscribe();
          };
        }
        
        // Fetch friend profile from Supabase
        const fetchFriend = async () => {
          const friendProfile = await getUserProfile(friendId);
          if (friendProfile) {
            setFriend(friendProfile);
          }
        };
        fetchFriend();
        
        // Setup real-time message listening
        const chatId = createChatId(user.id, friendId);
        const unsubscribe = getMessages(chatId, (newMessages) => {
          setMessages(newMessages);
        });
      
        return () => {
          if (unsubscribe) unsubscribe();
        };
      }
    };
    initChat();
  }, [friendId, navigate]);

  // Mark messages as read when chat is opened or new messages arrive
  useEffect(() => {
    if (!currentUser || !friendId || friendId === AI_FRIEND_ID) return;
    
    const chatId = createChatId(currentUser.id, friendId);
    
    // Check if there are unread messages from friend
    const hasUnreadFromFriend = messages.some(
      msg => msg.sender_id !== currentUser.id && !msg.read_at
    );
    
    if (hasUnreadFromFriend) {
      // Update notification context - this will also mark in DB
      markAsRead(chatId);
    }
  }, [messages, currentUser, friendId, markAsRead]);

  const handleSendMessage = async (messageText: string, replyToId?: string) => {
    if (!currentUser || !friendId || !messageText.trim()) return;
    
    // Handle AI chat differently
    if (friendId === AI_FRIEND_ID) {
      // Add user message to UI immediately
      const userMessage = {
        id: Date.now().toString(),
        content: messageText.trim(),
        sender_id: currentUser.id,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Show typing indicator for AI
      setIsAITyping(true);
      
      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.sender_id === currentUser.id ? 'user' : 'assistant',
        content: msg.content
      }));
      conversationHistory.push({ role: 'user', content: messageText.trim() });
      
      // Get AI response
      const aiResponse = await sendAIMessage(currentUser.id, messageText.trim(), conversationHistory);
      setIsAITyping(false);
      
      if (aiResponse) {
        // Add AI message to UI
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender_id: AI_FRIEND_ID,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        toast({
          title: "AI Error",
          description: "Failed to get AI response. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }
    
    // Regular chat
    const chatId = createChatId(currentUser.id, friendId);
    
    // Optimistic UI update - add message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUser.id,
      content: messageText.trim(),
      created_at: new Date().toISOString(),
      reply_to: replyToId || null,
      read_at: null,
      is_edited: false,
      sender_profile: {
        username: currentUser.username,
        display_name: currentUser.displayName,
        avatar_url: currentUser.avatar
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Insert message in background
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          content: messageText.trim(),
          reply_to: replyToId || null,
        });

      if (error) throw error;

      // Send push notification to friend (sender-side trigger)
      const messagePreview = messageText.trim().slice(0, 50);
      sendPushNotification({
        recipientUserId: friendId,
        title: currentUser.displayName,
        body: messagePreview,
        data: {
          chatId,
          senderId: currentUser.id,
        },
      }).catch(err => console.error('Push notification error:', err));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean = false) => {
    if (!currentUser) return;
    
    const success = await deleteMessage(messageId, currentUser.id, deleteForEveryone);
    
    if (success) {
      toast({
        title: "Message deleted",
        description: deleteForEveryone ? "Message deleted for everyone." : "Message deleted for you.",
      });
    } else {
      toast({
        title: "Failed to delete message",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    const success = await editMessage(messageId, newContent);
    
    if (success) {
      toast({
        title: "Message edited",
        description: "Your message has been updated.",
      });
    } else {
      toast({
        title: "Failed to edit message",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChat = async () => {
    if (!currentUser || !friendId) return;
    
    const chatId = createChatId(currentUser.id, friendId);
    const success = await deleteChat(chatId);
    
    if (success) {
      toast({
        title: "Chat deleted",
        description: "All messages have been deleted.",
      });
      navigate("/home");
    } else {
      toast({
        title: "Failed to delete chat",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendVoice = async (audioBlob: Blob) => {
    if (!currentUser || !friendId) return;
    
    try {
      // Upload audio to storage
      const fileName = `${currentUser.id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(fileName);

      // Send message with audio URL
      const chatId = createChatId(currentUser.id, friendId);
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          content: '🎤 Voice message',
          audio_url: publicUrl,
        });

      if (messageError) throw messageError;

      // Send push notification for voice message
      sendPushNotification({
        recipientUserId: friendId,
        title: currentUser.displayName,
        body: '🎤 Voice message',
        data: {
          chatId,
          senderId: currentUser.id,
        },
      }).catch(err => console.error('Push notification error:', err));

      toast({
        title: "Voice note sent",
        description: "Your voice message has been sent successfully.",
      });
    } catch (error) {
      console.error('Error sending voice note:', error);
      toast({
        title: "Failed to send voice note",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendImage = async (imageFile: File, caption?: string) => {
    if (!currentUser || !friendId) return;
    
    try {
      // Upload image to storage
      const fileName = `${currentUser.id}/${Date.now()}_${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, imageFile, {
          contentType: imageFile.type,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      // Send message with image URL and caption
      const chatId = createChatId(currentUser.id, friendId);
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          content: caption || '📷 Photo',
          image_url: publicUrl,
        });

      if (messageError) throw messageError;

      // Send push notification for image message
      sendPushNotification({
        recipientUserId: friendId,
        title: currentUser.displayName,
        body: caption ? caption.slice(0, 50) : '📷 Photo',
        data: {
          chatId,
          senderId: currentUser.id,
        },
      }).catch(err => console.error('Push notification error:', err));

      toast({
        title: "Photo sent",
        description: "Your image has been sent successfully.",
      });
    } catch (error) {
      console.error('Error sending image:', error);
      toast({
        title: "Failed to send image",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate("/home");
  };

  const handleLogout = async () => {
    await logoutUser();
    sessionStorage.removeItem("currentUser");
    navigate("/");
  };

  if (!currentUser) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>;
  }

  if (!friend) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Friend not found</h2>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Convert Supabase messages to ChatWindow format
  const formattedMessages: Message[] = messages.map(msg => {
    const repliedMessage = msg.reply_to 
      ? messages.find((m: any) => m.id === msg.reply_to)
      : null;

    return {
      id: msg.id,
      text: msg.content,
      sender: msg.sender_id === currentUser.id ? currentUser.displayName : friend.displayName,
      timestamp: new Date(msg.created_at || Date.now()),
      isOwn: msg.sender_id === currentUser.id,
      audioUrl: msg.audio_url,
      imageUrl: msg.image_url,
      isEdited: msg.is_edited,
      replyTo: msg.reply_to,
      readAt: msg.read_at ? new Date(msg.read_at) : null,
      repliedMessage: repliedMessage ? {
        id: repliedMessage.id,
        text: repliedMessage.content,
        sender: repliedMessage.sender_id === currentUser.id ? currentUser.displayName : friend.displayName,
        timestamp: new Date(repliedMessage.created_at || Date.now()),
        isOwn: repliedMessage.sender_id === currentUser.id,
        imageUrl: repliedMessage.image_url,
        audioUrl: repliedMessage.audio_url,
      } : undefined
    };
  });

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Chat Window */}
      <div className="flex-1 h-full">
        <ChatWindow
          onBack={handleBack}
          onLogout={handleLogout}
          currentUserName={currentUser.displayName}
          friend={{
            id: friend.id,
            name: friend.displayName,
            avatar: friend.avatar,
            isOnline: friend.isOnline,
            lastMessage: "",
            unreadCount: 0
          }}
          messages={formattedMessages}
          currentUser={currentUser.displayName}
          chatId={chatId}
          onSendMessage={(msg, replyToId) => {
            stopTyping();
            handleSendMessage(msg, replyToId);
          }}
          onDeleteChat={handleDeleteChat}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          isTyping={friendId === AI_FRIEND_ID ? isAITyping : friendTyping}
          onSendVoice={handleSendVoice}
          onSendImage={handleSendImage}
          onInputChange={handleInputChange}
        />
      </div>
    </div>
  );
};

export default Chat;