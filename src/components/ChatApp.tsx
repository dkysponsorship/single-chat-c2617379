import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut } from "lucide-react";
import { FriendList, Friend } from "./FriendList";
import { ChatWindow, Message } from "./ChatWindow";
import { cn } from "@/lib/utils";

interface ChatAppProps {
  currentUser: string;
  onLogout: () => void;
}

// Mock data for friends
const initialFriends: Friend[] = [
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

export const ChatApp = ({ currentUser, onLogout }: ChatAppProps) => {
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [selectedFriend, setSelectedFriend] = useState<string | null>("1");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize with some sample messages
  useEffect(() => {
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
    if (!selectedFriend) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: currentUser,
      timestamp: new Date(),
      isOwn: true
    };

    setMessages(prev => ({
      ...prev,
      [selectedFriend]: [...(prev[selectedFriend] || []), newMessage]
    }));

    // Update friend's last message and clear unread count
    setFriends(prev => prev.map(friend => 
      friend.id === selectedFriend 
        ? { ...friend, lastMessage: messageText, unreadCount: 0 }
        : friend
    ));

    // Simulate auto-reply with typing indicator
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const autoReply: Message = {
        id: (Date.now() + 1).toString(),
        text: autoReplies[Math.floor(Math.random() * autoReplies.length)],
        sender: friends.find(f => f.id === selectedFriend)?.name || "Friend",
        timestamp: new Date(),
        isOwn: false
      };

      setMessages(prev => ({
        ...prev,
        [selectedFriend]: [...(prev[selectedFriend] || []), autoReply]
      }));

      // Update friend's last message
      setFriends(prev => prev.map(friend => 
        friend.id === selectedFriend 
          ? { ...friend, lastMessage: autoReply.text }
          : friend
      ));
    }, 1500 + Math.random() * 2000); // Random delay between 1.5-3.5 seconds
  };

  const handleSelectFriend = (friendId: string) => {
    setSelectedFriend(friendId);
    setMobileMenuOpen(false);
    
    // Clear unread count when selecting friend
    setFriends(prev => prev.map(friend => 
      friend.id === friendId 
        ? { ...friend, unreadCount: 0 }
        : friend
    ));
  };

  const selectedFriendData = friends.find(f => f.id === selectedFriend);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card sidebar-shadow z-10">
        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <FriendList
                friends={friends}
                selectedFriend={selectedFriend}
                onSelectFriend={handleSelectFriend}
              />
            </SheetContent>
          </Sheet>
          
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            ChatApp
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">
            Welcome, {currentUser}
          </span>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex min-h-0">
        {/* Friend List - Hidden on mobile */}
        <div className="hidden md:block w-80 border-r border-border bg-card sidebar-shadow">
          <FriendList
            friends={friends}
            selectedFriend={selectedFriend}
            onSelectFriend={handleSelectFriend}
          />
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          {selectedFriendData ? (
            <ChatWindow
              friend={selectedFriendData}
              messages={messages[selectedFriend!] || []}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              isTyping={isTyping}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Menu className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No chat selected</h3>
                <p className="text-muted-foreground">
                  Choose a friend from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};