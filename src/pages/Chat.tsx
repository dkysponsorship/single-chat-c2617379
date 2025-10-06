import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { ChatWindow, Message } from "@/components/ChatWindow";
import { getCurrentUser } from "@/data/mockData";
import { sendMessage, getMessages, createChatId, deleteMessage, logoutUser, getUserProfile, sendAIMessage, AI_FRIEND_ID, editMessage, deleteChat } from "@/services/supabase";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";

const Chat = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friend, setFriend] = useState<User | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const user = getCurrentUser();
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
  }, [friendId, navigate]);

  const handleSendMessage = async (messageText: string) => {
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
      
      // Show typing indicator
      setIsTyping(true);
      
      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.sender_id === currentUser.id ? 'user' : 'assistant',
        content: msg.content
      }));
      conversationHistory.push({ role: 'user', content: messageText.trim() });
      
      // Get AI response
      const aiResponse = await sendAIMessage(currentUser.id, messageText.trim(), conversationHistory);
      setIsTyping(false);
      
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
    const success = await sendMessage(chatId, currentUser.id, messageText.trim());
    
    if (!success) {
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
  const formattedMessages: Message[] = messages.map(msg => ({
    id: msg.id,
    text: msg.content,
    sender: msg.sender_id === currentUser.id ? currentUser.displayName : friend.displayName,
    timestamp: new Date(msg.created_at || Date.now()),
    isOwn: msg.sender_id === currentUser.id,
    audioUrl: msg.audio_url,
    isEdited: msg.is_edited
  }));

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card sidebar-shadow">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            Chat with {friend.displayName}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {currentUser.displayName}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1">
        <ChatWindow
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
          onSendMessage={handleSendMessage}
          onDeleteChat={handleDeleteChat}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          isTyping={isTyping}
          onSendVoice={handleSendVoice}
        />
      </div>
    </div>
  );
};

export default Chat;