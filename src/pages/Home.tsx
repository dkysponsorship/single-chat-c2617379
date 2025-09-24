import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, MessageCircle } from "lucide-react";
import { Friend } from "@/components/FriendList";
import { UserSearch } from "@/components/UserSearch";
import { FriendRequests } from "@/components/FriendRequests";
import { UserProfile } from "@/components/UserProfile";
import { getFriends } from "@/services/supabase";
import { getCurrentUser } from "@/data/mockData";
import { User } from "@/types/user";

const Home = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate("/");
    } else {
      setCurrentUser(user);
      // Load friends from Supabase
      getFriends(user.id, (userFriends) => {
        const friendsData: Friend[] = userFriends.map(friend => ({
          id: friend.id,
          name: friend.displayName,
          avatar: friend.avatar,
          isOnline: friend.isOnline,
          lastMessage: "Start a conversation!",
          unreadCount: 0
        }));
        setFriends(friendsData);
      });
    }
  }, [navigate]);
  const handleLogout = async () => {
    const { logoutUser } = await import("@/services/supabase");
    await logoutUser();
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
            Welcome, {currentUser?.displayName}
          </span>
          <UserSearch />
          <UserProfile />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* Welcome Section */}
        <div className="text-center py-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {currentUser?.displayName}!</h2>
          <p className="text-muted-foreground mb-8">
            Choose a friend to start chatting
          </p>
        </div>

        {/* Friend Requests Section */}
        <div className="mb-8">
          <FriendRequests />
        </div>

        {/* Friends Grid */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Your Friends</h3>
          {friends.length === 0 ? (
            <div className="text-center py-8 border border-border rounded-lg">
              <p className="text-muted-foreground mb-4">No friends yet!</p>
              <p className="text-sm text-muted-foreground">Search for users above to send friend requests</p>
            </div>
          ) : (
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
              </div>
            )}
            </div>
          )}
        </div>
        
      </div>
    </div>;
};
export default Home;