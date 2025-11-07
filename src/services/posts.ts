import { supabase } from "@/integrations/supabase/client";

// Upload post image to posts bucket
const uploadPostImage = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('posts')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading post image:', error);
    return null;
  }
};

export interface Post {
  id: string;
  user_id: string;
  caption?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

// Create a new post
export const createPost = async (userId: string, caption: string, imageFile?: File): Promise<Post | null> => {
  try {
    let imageUrl: string | null = null;

    // Upload image if provided
    if (imageFile) {
      imageUrl = await uploadPostImage(userId, imageFile);
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        caption,
        image_url: imageUrl
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating post:", error);
    return null;
  }
};

// Get all posts for feed
export const getFeedPosts = async (currentUserId: string): Promise<Post[]> => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profile:profiles!posts_user_id_fkey(username, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get likes and comments count for each post
    const postsWithCounts = await Promise.all(
      (data || []).map(async (post) => {
        const [likesData, commentsData, userLike] = await Promise.all([
          supabase.from('likes').select('id', { count: 'exact' }).eq('post_id', post.id),
          supabase.from('comments').select('id', { count: 'exact' }).eq('post_id', post.id),
          supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', currentUserId).maybeSingle()
        ]);

        return {
          ...post,
          likes_count: likesData.count || 0,
          comments_count: commentsData.count || 0,
          is_liked: !!userLike.data
        };
      })
    );

    return postsWithCounts;
  } catch (error) {
    console.error("Error fetching feed posts:", error);
    return [];
  }
};

// Get posts by user
export const getUserPosts = async (userId: string, currentUserId: string): Promise<Post[]> => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profile:profiles!posts_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get likes and comments count for each post
    const postsWithCounts = await Promise.all(
      (data || []).map(async (post) => {
        const [likesData, commentsData, userLike] = await Promise.all([
          supabase.from('likes').select('id', { count: 'exact' }).eq('post_id', post.id),
          supabase.from('comments').select('id', { count: 'exact' }).eq('post_id', post.id),
          supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', currentUserId).maybeSingle()
        ]);

        return {
          ...post,
          likes_count: likesData.count || 0,
          comments_count: commentsData.count || 0,
          is_liked: !!userLike.data
        };
      })
    );

    return postsWithCounts;
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return [];
  }
};

// Like a post
export const likePost = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, post_id: postId });

    return !error;
  } catch (error) {
    console.error("Error liking post:", error);
    return false;
  }
};

// Unlike a post
export const unlikePost = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    return !error;
  } catch (error) {
    console.error("Error unliking post:", error);
    return false;
  }
};

// Add a comment
export const addComment = async (userId: string, postId: string, content: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('comments')
      .insert({ user_id: userId, post_id: postId, content });

    return !error;
  } catch (error) {
    console.error("Error adding comment:", error);
    return false;
  }
};

// Get comments for a post
export const getPostComments = async (postId: string): Promise<Comment[]> => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profile:profiles!comments_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
};

// Follow a user
export const followUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });

    return !error;
  } catch (error) {
    console.error("Error following user:", error);
    return false;
  }
};

// Unfollow a user
export const unfollowUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    return !error;
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return false;
  }
};

// Check if following a user
export const isFollowing = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.error("Error checking follow status:", error);
    return false;
  }
};

// Get follower/following counts
export const getFollowCounts = async (userId: string): Promise<{ followers: number; following: number }> => {
  try {
    const [followersData, followingData] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId)
    ]);

    return {
      followers: followersData.count || 0,
      following: followingData.count || 0
    };
  } catch (error) {
    console.error("Error fetching follow counts:", error);
    return { followers: 0, following: 0 };
  }
};

// Update a post
export const updatePost = async (postId: string, caption: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('posts')
      .update({ caption })
      .eq('id', postId);

    return !error;
  } catch (error) {
    console.error("Error updating post:", error);
    return false;
  }
};

// Delete a post
export const deletePost = async (postId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    return !error;
  } catch (error) {
    console.error("Error deleting post:", error);
    return false;
  }
};