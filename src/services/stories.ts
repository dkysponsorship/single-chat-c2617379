import { supabase } from "@/integrations/supabase/client";

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
  profile?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface UserStories {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  stories: Story[];
  has_viewed: boolean;
}

// Upload story media
const uploadStoryMedia = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('stories')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('stories')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading story media:', error);
    return null;
  }
};

// Create a new story
export const createStory = async (userId: string, mediaFile: File, mediaType: 'image' | 'video'): Promise<Story | null> => {
  try {
    const mediaUrl = await uploadStoryMedia(userId, mediaFile);
    if (!mediaUrl) return null;

    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        media_type: mediaType
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating story:", error);
    return null;
  }
};

// Get all active stories grouped by user
export const getAllStories = async (currentUserId: string): Promise<UserStories[]> => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        profile:profiles!stories_user_id_fkey(username, display_name, avatar_url)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group stories by user
    const storiesByUser = (data || []).reduce((acc: Record<string, UserStories>, story) => {
      const userId = story.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user_id: userId,
          username: story.profile?.username || 'Unknown',
          display_name: story.profile?.display_name || 'Unknown',
          avatar_url: story.profile?.avatar_url,
          stories: [],
          has_viewed: false
        };
      }
      acc[userId].stories.push(story);
      return acc;
    }, {});

    return Object.values(storiesByUser);
  } catch (error) {
    console.error("Error fetching stories:", error);
    return [];
  }
};

// Get stories for a specific user
export const getUserStories = async (userId: string): Promise<Story[]> => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        profile:profiles!stories_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching user stories:", error);
    return [];
  }
};

// Delete a story
export const deleteStory = async (storyId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    return !error;
  } catch (error) {
    console.error("Error deleting story:", error);
    return false;
  }
};
