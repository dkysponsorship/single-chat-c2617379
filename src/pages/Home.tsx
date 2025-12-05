import { useState, useEffect } from "react";
import { useAIFriendSetup } from "./AIFriendSetup";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, MessageCircle, Home as HomeIcon, User as UserIcon, Bell, BellOff } from "lucide-react";
import { Friend } from "@/components/FriendList";
import { UserSearch } from "@/components/UserSearch";
import { FriendRequests } from "@/components/FriendRequests";
import { UserProfile } from "@/components/UserProfile";
import { getFriends } from "@/services/supabase";
import { getCurrentUser } from "@/services/supabase";
import { User } from "@/types/user";
import { useNotificationContext } from "@/components/NotificationProvider";
const Home = () => {
  useAIFriendSetup(); // Setup AI friend for user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const navigate = useNavigate();
  const {
    unreadCounts,
    totalUnread,
    requestPermission,
    permissionGranted
  } = useNotificationContext();
  useEffect(() => {
    const initPage = async () => {
      const user = await getCurrentUser();
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUser(user);
      // Load friends from Supabase
      const unsubscribe = getFriends(user.id, userFriends => {
        const friendsData: Friend[] = userFriends.map(friend => ({
          id: friend.id,
          name: friend.displayName,
          avatar: friend.avatar,
          isOnline: friend.isOnline,
          lastMessage: "Start a conversation!",
          unreadCount: unreadCounts[friend.id] || 0
        }));
        setFriends(friendsData);
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    };
    initPage();
  }, [navigate, unreadCounts]);
  const handleLogout = async () => {
    const {
      logoutUser
    } = await import("@/services/supabase");
    await logoutUser();
    localStorage.removeItem("currentUser");
    navigate("/");
  };
  const handleSelectFriend = (friendId: string) => {
    navigate(`/chat/${friendId}`);
  };
  const handleEnableNotifications = async () => {
    await requestPermission();
  };
  if (!currentUser) {
    return null; // Loading or redirecting
  }
  return <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card sidebar-shadow pt-safe py-[2px]">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary relative">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
            {totalUnread > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>}
          </div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {!permissionGranted && <Button variant="ghost" size="sm" onClick={handleEnableNotifications} title="Enable notifications">
              <BellOff className="w-4 h-4" />
            </Button>}
          {permissionGranted && <Button variant="ghost" size="sm" className="text-primary" title="Notifications enabled">
              <Bell className="w-4 h-4" />
            </Button>}
          <UserSearch />
          <UserProfile />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-destructive/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 pb-20">
        {/* Welcome Section */}
        <div className="text-center py-0">
          
          
        </div>

        {/* Friend Requests Section */}
        <div className="mb-8">
          <FriendRequests />
        </div>

        {/* Friends Grid */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Your Friends</h3>
          {friends.length === 0 ? <div className="text-center py-8 border border-border rounded-lg">
              <p className="text-muted-foreground mb-4">No friends yet!</p>
              <p className="text-sm text-muted-foreground">Search for users above to send friend requests</p>
            </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map(friend => {
            const unreadCount = unreadCounts[friend.id] || 0;
            return <div key={friend.id} onClick={() => handleSelectFriend(friend.id)} className="bg-card border border-border rounded-lg p-4 cursor-pointer smooth-transition hover:bg-accent/50 hover:scale-105 hover:shadow-lg px-[18px] py-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        {friend.avatar ? <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary px-0 py-px">
                              {friend.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${friend.isOnline ? "bg-status-online online-pulse" : "bg-status-offline"}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{friend.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {friend.isOnline ? "Online" : "Offline"}
                        </p>
                      </div>

                      {unreadCount > 0 && <div className="text-destructive-foreground text-xs rounded-full font- animate-pulse bg-[#f50b0b] py-[2px] px-[4px]">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </div>}
                    </div>
                    
                    {friend.lastMessage}
                  </div>;
          })}
            </div>}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-4 pb-safe py-px">
        <Button variant="ghost" size="sm" onClick={() => navigate("/feed")}>
          <HomeIcon className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/home")} className="relative">
          <MessageCircle className="w-5 h-5" />
          {totalUnread > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/profile/${currentUser.id}`)}>
          <UserIcon className="w-5 h-5" />
        </Button>
      </div>
    </div>;
};
export default Home;