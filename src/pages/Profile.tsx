import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, MessageCircle, ArrowLeft, UserPlus, UserMinus, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/PostCard";
import { UserProfile } from "@/components/UserProfile";
import { getUserPosts, followUser, unfollowUser, isFollowing, getFollowCounts, type Post } from "@/services/posts";
import { getCurrentUser, getUserProfile } from "@/services/supabase";
import { User as UserType } from "@/types/user";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [profileUser, setProfileUser] = useState<UserType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    const initPage = async () => {
      const user = await getCurrentUser();
      if (!user) {
        navigate("/");
        return;
      }
      setCurrentUser(user);

      if (userId) {
        await loadProfile(userId, user.id);
      }
    };

    initPage();
  }, [navigate, userId]);

  const loadProfile = async (profileUserId: string, currentUserId: string) => {
    setIsLoading(true);
    
    const [profile, userPosts, isFollowingUser, counts] = await Promise.all([
      getUserProfile(profileUserId),
      getUserPosts(profileUserId, currentUserId),
      isFollowing(currentUserId, profileUserId),
      getFollowCounts(profileUserId)
    ]);

    setProfileUser(profile);
    setPosts(userPosts);
    setFollowing(isFollowingUser);
    setFollowCounts(counts);
    setIsLoading(false);
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !userId) return;

    const success = following
      ? await unfollowUser(currentUser.id, userId)
      : await followUser(currentUser.id, userId);

    if (success) {
      setFollowing(!following);
      setFollowCounts(prev => ({
        ...prev,
        followers: following ? prev.followers - 1 : prev.followers + 1
      }));
      toast({
        title: following ? "Unfollowed" : "Following",
        description: following 
          ? `You unfollowed ${profileUser?.displayName}` 
          : `You are now following ${profileUser?.displayName}`
      });
    }
  };

  if (!currentUser || !profileUser) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 h-14 flex items-center justify-between px-4 border-b border-border bg-card/95 backdrop-blur pt-safe">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">@{profileUser.username}</h1>
        <div className="w-9" />
      </div>

      {/* Profile Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start gap-6 mb-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profileUser.avatar} />
            <AvatarFallback className="text-2xl">
              {profileUser.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{profileUser.displayName}</h2>
            <p className="text-muted-foreground mb-3">@{profileUser.username}</p>
            
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <p className="font-bold text-lg">{posts.length}</p>
                <p className="text-sm text-muted-foreground">Posts</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{followCounts.followers}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{followCounts.following}</p>
                <p className="text-sm text-muted-foreground">Following</p>
              </div>
            </div>

            {profileUser.bio && (
              <p className="text-sm mb-4">{profileUser.bio}</p>
            )}

            {isOwnProfile ? (
              <UserProfile />
            ) : (
              <Button 
                onClick={handleFollowToggle}
                variant={following ? "outline" : "default"}
                className="gap-2"
              >
                {following ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg">
            <p className="text-muted-foreground">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="aspect-square bg-muted cursor-pointer hover:opacity-75 transition-opacity"
                onClick={() => {
                  // Could open a modal with full post here
                }}
              >
                {post.image_url ? (
                  <img 
                    src={post.image_url} 
                    alt="Post" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <p className="text-xs text-center line-clamp-3">{post.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-4 pb-safe">
        <Button variant="ghost" size="sm" onClick={() => navigate("/feed")}>
          <Home className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/home")}>
          <MessageCircle className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/profile/${currentUser.id}`)}>
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Profile;