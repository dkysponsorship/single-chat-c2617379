import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { ChatWindow, Message } from "@/components/ChatWindow";
import { getCurrentUser } from "@/data/mockData";
import { sendMessage, getMessages, createChatId, deleteMessage, logoutUser } from "@/services/supabase";
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
      // In a real app, you'd fetch friend data from Supabase
      // For now, we'll create a mock friend based on friendId
      const mockFriend: User = {
        id: friendId,
        username: `user_${friendId}`,
        displayName: `Friend ${friendId.slice(0, 8)}`,
        email: `friend${friendId}@example.com`,
        isOnline: Math.random() > 0.5,
        bio: "Supabase user"
      };
      setFriend(mockFriend);
      
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

  const handleDeleteMessage = async (messageId: string, deleteForEveryone?: boolean) => {
    const success = await deleteMessage(messageId);
    
    if (success) {
      toast({
        title: "Message deleted",
        description: "Message deleted successfully.",
      });
    } else {
      toast({
        title: "Failed to delete message",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChat = async () => {
    toast({
      title: "Feature not available",
      description: "Chat deletion is not available at the moment.",
      variant: "destructive",
    });
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
    text: msg.message,
    sender: msg.senderId === currentUser.id ? currentUser.displayName : friend.displayName,
    timestamp: new Date(msg.timestamp || Date.now()),
    isOwn: msg.senderId === currentUser.id
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
          isTyping={isTyping}
        />
      </div>
    </div>
  );
};

export default Chat;