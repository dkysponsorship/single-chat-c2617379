import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, User, MessageCircle } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { CreateStoryDialog } from "@/components/CreateStoryDialog";
import { StoriesRing } from "@/components/StoriesRing";
import { StoryViewer } from "@/components/StoryViewer";
import { getFeedPosts, type Post } from "@/services/posts";
import { getAllStories, getUserStories, type UserStories, type Story } from "@/services/stories";
import { getCurrentUser, logoutUser } from "@/services/supabase";
import { User as UserType } from "@/types/user";
import { ScrollArea } from "@/components/ui/scroll-area";
const Feed = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allStories, setAllStories] = useState<UserStories[]>([]);
  const [viewerStories, setViewerStories] = useState<Story[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
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
      await Promise.all([loadPosts(user.id), loadStories(user.id)]);
    };
    initPage();
  }, [navigate]);
  const loadPosts = async (userId: string) => {
    setIsLoading(true);
    const feedPosts = await getFeedPosts(userId);
    setPosts(feedPosts);
    setIsLoading(false);
  };
  const loadStories = async (userId: string) => {
    const stories = await getAllStories(userId);
    setAllStories(stories);
  };
  const handleStoryClick = async (userStories: UserStories) => {
    setViewerStories(userStories.stories);
    setShowStoryViewer(true);
  };
  const handleCurrentUserStoryClick = async () => {
    if (!currentUser) return;
    const myStories = await getUserStories(currentUser.id);
    if (myStories.length > 0) {
      setViewerStories(myStories);
      setShowStoryViewer(true);
    }
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
        <h1 className="text-2xl font-bold text-foreground">
          Feed
        </h1>
        
        <div className="flex items-center gap-2">
          <CreateStoryDialog userId={currentUser.id} onStoryCreated={() => loadStories(currentUser.id)} />
          <CreatePostDialog userId={currentUser.id} onPostCreated={() => loadPosts(currentUser.id)} />
        </div>
      </div>

      {/* Stories Section */}
      {allStories.length > 0 && <div className="border-b border-border bg-card">
          <ScrollArea className="w-full">
            <div className="flex gap-4 p-4 overflow-x-auto">
              {/* Current user's story */}
              {allStories.find(s => s.user_id === currentUser.id) && <StoriesRing userStories={allStories.find(s => s.user_id === currentUser.id)!} onClick={handleCurrentUserStoryClick} isCurrentUser />}
              {/* Other users' stories */}
              {allStories.filter(s => s.user_id !== currentUser.id).map(userStories => <StoriesRing key={userStories.user_id} userStories={userStories} onClick={() => handleStoryClick(userStories)} />)}
            </div>
          </ScrollArea>
        </div>}

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

      {/* Story Viewer */}
      <StoryViewer open={showStoryViewer} onOpenChange={setShowStoryViewer} stories={viewerStories} currentUserId={currentUser.id} onStoryDeleted={() => {
      loadStories(currentUser.id);
      setShowStoryViewer(false);
    }} />

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