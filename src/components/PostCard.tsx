import { useState } from "react";
import { Heart, MessageCircle, Trash2, MoreVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { likePost, unlikePost, addComment, getPostComments, deletePost, type Post, type Comment } from "@/services/posts";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditPostDialog } from "./EditPostDialog";

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onPostUpdate?: () => void;
  onUserClick?: (userId: string) => void;
}

export const PostCard = ({ post, currentUserId, onPostUpdate, onUserClick }: PostCardProps) => {
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  const handleLike = async () => {
    const success = isLiked 
      ? await unlikePost(currentUserId, post.id)
      : await likePost(currentUserId, post.id);

    if (success) {
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    }
  };

  const handleCommentToggle = async () => {
    if (!showComments) {
      const fetchedComments = await getPostComments(post.id);
      setComments(fetchedComments);
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const success = await addComment(currentUserId, post.id, newComment);
    if (success) {
      const fetchedComments = await getPostComments(post.id);
      setComments(fetchedComments);
      setCommentsCount(prev => prev + 1);
      setNewComment("");
      toast({ title: "Comment added!" });
    }
  };

  const handleDeletePost = async () => {
    if (confirm("Are you sure you want to delete this post?")) {
      const success = await deletePost(post.id);
      if (success) {
        toast({ title: "Post deleted successfully" });
        onPostUpdate?.();
      } else {
        toast({ title: "Failed to delete post", variant: "destructive" });
      }
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onUserClick?.(post.user_id)}
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.profile?.avatar_url} />
            <AvatarFallback>{post.profile?.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{post.profile?.display_name}</p>
            <p className="text-xs text-muted-foreground">@{post.profile?.username}</p>
          </div>
        </div>
        
        {post.user_id === currentUserId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Post Image */}
      {post.image_url && (
        <div className="w-full aspect-square bg-muted">
          <img 
            src={post.image_url} 
            alt="Post" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Post Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLike}
            className={isLiked ? "text-destructive" : ""}
          >
            <Heart className={`w-5 h-5 mr-1 ${isLiked ? "fill-current" : ""}`} />
            {likesCount}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCommentToggle}>
            <MessageCircle className="w-5 h-5 mr-1" />
            {commentsCount}
          </Button>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            <span className="font-semibold mr-2">{post.profile?.username}</span>
            {post.caption}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </p>

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-3 pt-3 border-t">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.profile?.avatar_url} />
                  <AvatarFallback>{comment.profile?.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold mr-2">{comment.profile?.username}</span>
                    {comment.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}

            {/* Add Comment */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                className="flex-1"
              />
              <Button onClick={handleAddComment} size="sm">Post</Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Post Dialog */}
      <EditPostDialog
        postId={post.id}
        currentCaption={post.caption || ""}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onPostUpdated={onPostUpdate}
      />
    </div>
  );
};