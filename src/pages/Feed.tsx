import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, User, MessageCircle, LogOut } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { getFeedPosts, type Post } from "@/services/posts";
import { getCurrentUser, logoutUser } from "@/services/supabase";
import { User as UserType } from "@/types/user";
const Feed = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    const initPage = async () => {
      const user = await getCurrentUser();
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUser(user);
      await loadPosts(user.id);
    };
    initPage();
  }, [navigate]);
  const loadPosts = async (userId: string) => {
    setIsLoading(true);
    const feedPosts = await getFeedPosts(userId);
    setPosts(feedPosts);
    setIsLoading(false);
  };
  const handleLogout = async () => {
    await logoutUser();
    sessionStorage.removeItem("currentUser");
    navigate("/");
  };
  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };
  if (!currentUser) return null;
  return <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 h-14 flex items-center justify-between px-4 border-b border-border bg-card/95 backdrop-blur">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Feed
        </h1>
        
        <div className="flex items-center gap-2">
          <CreatePostDialog userId={currentUser.id} onPostCreated={() => loadPosts(currentUser.id)} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 pb-20">
        {isLoading ? <div className="text-center py-12">
            <p className="text-muted-foreground">Loading posts...</p>
          </div> : posts.length === 0 ? <div className="text-center py-12 border border-border rounded-lg">
            <p className="text-muted-foreground mb-4">No posts yet!</p>
            <p className="text-sm text-muted-foreground">Be the first to share something</p>
          </div> : <div className="space-y-6">
            {posts.map(post => <PostCard key={post.id} post={post} currentUserId={currentUser.id} onPostUpdate={() => loadPosts(currentUser.id)} onUserClick={handleUserClick} />)}
          </div>}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/feed")}>
          <Home className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/home")}>
          <MessageCircle className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/profile/${currentUser.id}`)}>
          <User className="w-5 h-5" />
        </Button>
        
      </div>
    </div>;
};
export default Feed;