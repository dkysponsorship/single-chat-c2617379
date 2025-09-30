import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/user";

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      return {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        email: session.user.email || '',
        isOnline: profile.is_online || false,
        bio: profile.bio || '',
        avatar: profile.avatar_url,
        createdAt: profile.created_at
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export const registerUser = async (
  email: string, 
  password: string, 
  username: string, 
  displayName: string
): Promise<{ user: User | null; error?: string }> => {
  try {
    // Sign up with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      }
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username,
          display_name: displayName,
          bio: '',
          is_online: true
        });

      if (profileError) {
        return { user: null, error: profileError.message };
      }

      const userData: User = {
        id: data.user.id,
        username,
        displayName,
        email,
        isOnline: true,
        bio: '',
        createdAt: new Date().toISOString()
      };

      return { user: userData };
    }

    return { user: null, error: "Registration failed" };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const loginUser = async (email: string, password: string): Promise<{ user: User | null; error?: string }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      const user = await getCurrentUser();
      if (user) {
        // Update online status
        await supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', data.user.id);

        return { user };
      }
    }

    return { user: null, error: "Login failed" };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', session.user.id);
    }
    
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export const updateUserProfile = async (userId: string, profileData: Partial<User>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: profileData.username,
        display_name: profileData.displayName,
        bio: profileData.bio,
        avatar_url: profileData.avatar,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};

// Search users
export const searchUsers = async (query: string, currentUserId: string): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);

    if (error) return [];

    return data.map(profile => ({
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      email: '', // Email not exposed in profiles
      isOnline: profile.is_online || false,
      bio: profile.bio || '',
      avatar: profile.avatar_url,
      createdAt: profile.created_at
    }));
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

// Friend requests
export const sendFriendRequest = async (fromUserId: string, toUserId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: 'pending'
      });

    return !error;
  } catch (error) {
    console.error("Error sending friend request:", error);
    return false;
  }
};

export const getFriendRequests = (userId: string, callback: (requests: any[]) => void) => {
  // Initial fetch
  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        from_profile:from_user_id(id, username, display_name, avatar_url, is_online),
        to_profile:to_user_id(id, username, display_name, avatar_url, is_online)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .eq('status', 'pending');

    if (error) {
      console.error("Error fetching friend requests:", error);
      return;
    }
    if (data) callback(data);
  };

  fetchRequests();

  // Subscribe to changes
  const subscription = supabase
    .channel('friend_requests')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'friend_requests' },
      () => fetchRequests()
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

export const respondToFriendRequest = async (requestId: string, accept: boolean): Promise<boolean> => {
  try {
    if (accept) {
      // Get the request details first
      const { data: request } = await supabase
        .from('friend_requests')
        .select('from_user_id, to_user_id')
        .eq('id', requestId)
        .single();

      if (request) {
        // Create friendship
        await supabase
          .from('friendships')
          .insert({
            user1_id: request.from_user_id,
            user2_id: request.to_user_id
          });
      }
    }

    // Update request status
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', requestId);

    return !error;
  } catch (error) {
    console.error("Error responding to friend request:", error);
    return false;
  }
};

export const getFriends = (userId: string, callback: (friends: User[]) => void) => {
  const fetchFriends = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        user1_profile:user1_id(id, username, display_name, avatar_url, is_online, bio, created_at),
        user2_profile:user2_id(id, username, display_name, avatar_url, is_online, bio, created_at)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error) {
      console.error("Error fetching friends:", error);
      return;
    }

    if (data) {
      const friends = data.map(friendship => {
        const friendProfile = friendship.user1_id === userId ? 
          friendship.user2_profile : friendship.user1_profile;
        
        return {
          id: friendProfile.id,
          username: friendProfile.username,
          displayName: friendProfile.display_name,
          email: '',
          isOnline: friendProfile.is_online || false,
          bio: friendProfile.bio || '',
          avatar: friendProfile.avatar_url,
          createdAt: friendProfile.created_at
        };
      });
      callback(friends);
    }
  };

  fetchFriends();

  const subscription = supabase
    .channel('friendships')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'friendships' },
      () => fetchFriends()
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

// Messages
export const sendMessage = async (chatId: string, senderId: string, message: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        content: message
      });

    return !error;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
};

export const getMessages = (chatId: string, callback: (messages: any[]) => void) => {
  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender_profile:profiles!sender_id(username, display_name, avatar_url)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) callback(data);
  };

  fetchMessages();

  const subscription = supabase
    .channel('messages')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      () => fetchMessages()
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

export const createChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

export const deleteMessage = async (messageId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    return !error;
  } catch (error) {
    console.error("Error deleting message:", error);
    return false;
  }
};