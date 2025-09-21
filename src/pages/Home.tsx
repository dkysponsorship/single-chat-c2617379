import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, MessageCircle } from "lucide-react";
import { Friend } from "@/components/FriendList";

// Mock data for friends - same as before
const initialFriends: Friend[] = [{
  id: "1",
  name: "Alice Johnson",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
  isOnline: true,
  lastMessage: "Hey! How are you doing?",
  unreadCount: 2
}, {
  id: "2",
  name: "Bob Smith",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
  isOnline: true,
  lastMessage: "Let's meet tomorrow!",
  unreadCount: 1
}, {
  id: "3",
  name: "Carol Davis",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol",
  isOnline: false,
  lastMessage: "Thanks for the help 😊"
}, {
  id: "4",
  name: "David Wilson",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  isOnline: true,
  lastMessage: "Great job on the project!"
}, {
  id: "5",
  name: "Emma Brown",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
  isOnline: false,
  lastMessage: "See you later!"
}];
const Home = () => {
  const [currentUser, setCurrentUser] = useState<string>("");
  const [friends] = useState<Friend[]>(initialFriends);
  const navigate = useNavigate();
  useEffect(() => {
    const user = sessionStorage.getItem("currentUser");
    if (!user) {
      navigate("/");
    } else {
      setCurrentUser(user);
    }
  }, [navigate]);
  const handleLogout = () => {
    sessionStorage.removeItem("currentUser");
    navigate("/");
  };
  const handleSelectFriend = (friendId: string) => {
    navigate(`/chat/${friendId}`);
  };
  if (!currentUser) {
    return null; // Loading or redirecting
  }
  return <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card sidebar-shadow">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full message-sent">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            ChatApp
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">
            Welcome, {currentUser}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* Welcome Section */}
        <div className="text-center py-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {currentUser}!</h2>
          <p className="text-muted-foreground mb-8">
            Choose a friend to start chatting
          </p>
        </div>

        {/* Friends Grid - Better for home page */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map(friend => <div key={friend.id} onClick={() => handleSelectFriend(friend.id)} className="bg-card border border-border rounded-lg p-4 cursor-pointer smooth-transition hover:bg-accent/50 hover:scale-105 hover:shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {friend.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${friend.isOnline ? "bg-status-online online-pulse" : "bg-status-offline"}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{friend.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {friend.isOnline ? "Online" : "Offline"}
                  </p>
                </div>

                {friend.unreadCount && friend.unreadCount > 0 && <div className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full font-medium">
                    {friend.unreadCount > 99 ? "99+" : friend.unreadCount}
                  </div>}
              </div>
              
              {friend.lastMessage && <p className="text-sm text-muted-foreground line-clamp-2">
                  {friend.lastMessage}
                </p>}
            </div>)}
        </div>

        {/* Stats Section */}
        
      </div>
    </div>;
};
export default Home;