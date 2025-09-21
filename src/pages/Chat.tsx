import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { ChatWindow, Message } from "@/components/ChatWindow";
import { Friend } from "@/components/FriendList";
import { useToast } from "@/hooks/use-toast";

// Same friends data - in real app this would come from a context or API
const friends: Friend[] = [
  {
    id: "1",
    name: "Alice Johnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    isOnline: true,
    lastMessage: "Hey! How are you doing?",
    unreadCount: 2
  },
  {
    id: "2",
    name: "Bob Smith", 
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    isOnline: true,
    lastMessage: "Let's meet tomorrow!",
    unreadCount: 1
  },
  {
    id: "3",
    name: "Carol Davis",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol",
    isOnline: false,
    lastMessage: "Thanks for the help 😊"
  },
  {
    id: "4",
    name: "David Wilson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    isOnline: true,
    lastMessage: "Great job on the project!"
  },
  {
    id: "5",
    name: "Emma Brown",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
    isOnline: false,
    lastMessage: "See you later!"
  }
];

// Sample auto-replies for simulation
const autoReplies = [
  "That's awesome! 😊",
  "Thanks for letting me know!",
  "Sounds good to me!",
  "I'll get back to you soon.",
  "Great idea!",
  "Let me think about it.",
  "Absolutely!",
  "I'm on it! 💪",
  "That works for me.",
  "Looking forward to it!"
];

const Chat = () => {
  const [currentUser, setCurrentUser] = useState<string>("");
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  const friend = friends.find(f => f.id === friendId);

  useEffect(() => {
    const user = sessionStorage.getItem("currentUser");
    if (!user) {
      navigate("/");
    } else {
      setCurrentUser(user);
    }
  }, [navigate]);

  // Initialize with some sample messages
  useEffect(() => {
    if (!currentUser) return;
    
    const sampleMessages: Record<string, Message[]> = {
      "1": [
        {
          id: "1",
          text: "Hey! How are you doing?",
          sender: "Alice Johnson",
          timestamp: new Date(Date.now() - 300000),
          isOwn: false
        },
        {
          id: "2",
          text: "I'm doing great, thanks for asking!",
          sender: currentUser,
          timestamp: new Date(Date.now() - 240000),
          isOwn: true
        }
      ],
      "2": [
        {
          id: "1",
          text: "Let's meet tomorrow!",
          sender: "Bob Smith",
          timestamp: new Date(Date.now() - 600000),
          isOwn: false
        }
      ]
    };
    setMessages(sampleMessages);
  }, [currentUser]);

  const handleSendMessage = (messageText: string) => {
    if (!friendId || !friend || !currentUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: currentUser,
      timestamp: new Date(),
      isOwn: true
    };

    setMessages(prev => ({
      ...prev,
      [friendId]: [...(prev[friendId] || []), newMessage]
    }));

    // Simulate auto-reply with typing indicator
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const autoReply: Message = {
        id: (Date.now() + 1).toString(),
        text: autoReplies[Math.floor(Math.random() * autoReplies.length)],
        sender: friend.name,
        timestamp: new Date(),
        isOwn: false
      };

      setMessages(prev => ({
        ...prev,
        [friendId]: [...(prev[friendId] || []), autoReply]
      }));
    }, 1500 + Math.random() * 2000);
  };

  const handleBack = () => {
    navigate("/home");
  };

  const handleDeleteChat = () => {
    if (!friendId) return;
    
    setMessages(prev => ({
      ...prev,
      [friendId]: []
    }));
    
    toast({
      title: "Chat deleted",
      description: "All messages have been deleted.",
    });
  };

  const handleDeleteMessage = (messageId: string, deleteForEveryone?: boolean) => {
    if (!friendId) return;
    
    setMessages(prev => ({
      ...prev,
      [friendId]: prev[friendId]?.filter(msg => msg.id !== messageId) || []
    }));
    
    toast({
      title: "Message deleted",
      description: deleteForEveryone ? "Message deleted for everyone." : "Message deleted for you.",
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem("currentUser");
    navigate("/");
  };

  if (!currentUser) {
    return null; // Loading or redirecting
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card sidebar-shadow">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            Chat with {friend.name}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {currentUser}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1">
        <ChatWindow
          friend={friend}
          messages={messages[friendId!] || []}
          currentUser={currentUser}
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