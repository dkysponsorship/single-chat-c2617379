import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/user";

// Re-export supabase for use in other files
export { supabase };

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

export const deleteAccount = async (userId: string): Promise<boolean> => {
  try {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session");
      return false;
    }

    // Call edge function to delete account
    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error("Delete account error:", error);
      return false;
    }

    if (data?.success) {
      await supabase.auth.signOut();
      return true;
    }

    return false;
  } catch (error) {
    console.error("Delete account error:", error);
    return false;
  }
};

export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return null;
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

// Get user profile by ID
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      email: '', // Email not exposed in profiles
      isOnline: data.is_online || false,
      bio: data.bio || '',
      avatar: data.avatar_url,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
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
        from_profile:profiles!friend_requests_from_user_id_fkey(id, username, display_name, avatar_url, is_online),
        to_profile:profiles!friend_requests_to_user_id_fkey(id, username, display_name, avatar_url, is_online)
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
    // Add AI friend manually
    const aiFriend: User = {
      id: 'ai-assistant',
      username: 'ai_assistant',
      displayName: 'AI Assistant',
      email: '',
      isOnline: true,
      bio: 'I am your friendly AI assistant, always here to chat! 🤖',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AIAssistant',
      createdAt: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        user1_profile:profiles!friendships_user1_id_fkey(id, username, display_name, avatar_url, is_online, bio, created_at),
        user2_profile:profiles!friendships_user2_id_fkey(id, username, display_name, avatar_url, is_online, bio, created_at)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error) {
      console.error("Error fetching friends:", error);
      callback([aiFriend]); // Return at least AI friend on error
      return;
    }

    if (data) {
      // Use a Set to track unique friend IDs
      const uniqueFriendIds = new Set<string>();
      const friends = data
        .map(friendship => {
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
        })
        .filter(friend => {
          // Filter out duplicates
          if (uniqueFriendIds.has(friend.id)) {
            return false;
          }
          uniqueFriendIds.add(friend.id);
          return true;
        });
      
      // Add AI friend at the beginning
      callback([aiFriend, ...friends]);
    } else {
      callback([aiFriend]);
    }
  };

  fetchFriends();

  const subscription = supabase
    .channel(`friendships-${userId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'friendships' },
      () => fetchFriends()
    )
    .subscribe();

  return () => subscription.unsubscribe();
};

// AI Assistant ID
export const AI_ASSISTANT_ID = 'ai-assistant';

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

// Send message to AI and get response
export const sendMessageToAI = async (chatId: string, userId: string, message: string, conversationHistory: any[]): Promise<boolean> => {
  try {
    // Save user message first
    await sendMessage(chatId, userId, message);

    // Call AI edge function
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { 
        messages: conversationHistory,
        chatId,
        userId
      }
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error sending message to AI:", error);
    return false;
  }
};

export const getMessages = (chatId: string, callback: (messages: any[]) => void) => {
  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender_profile:profiles!messages_sender_id_fkey(username, display_name, avatar_url)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) callback(data);
  };

  fetchMessages();

  // Use unique channel name for each chat
  const subscription = supabase
    .channel(`messages-${chatId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      () => fetchMessages()
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      () => fetchMessages()
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      () => fetchMessages()
    )
    .subscribe();

  return () => supabase.removeChannel(subscription);
};

export const createChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

export const deleteMessage = async (messageId: string, userId: string, deleteForEveryone: boolean = false): Promise<boolean> => {
  try {
    if (deleteForEveryone) {
      // Delete message completely (only sender can do this)
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      return !error;
    } else {
      // Add user to deleted_for array (delete for me only)
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('deleted_for')
        .eq('id', messageId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching message:', fetchError);
        return false;
      }

      const deletedFor = message?.deleted_for || [];
      if (!deletedFor.includes(userId)) {
        deletedFor.push(userId);
      }

      const { error: updateError } = await supabase
        .from('messages')
        .update({ deleted_for: deletedFor })
        .eq('id', messageId);

      return !updateError;
    }
  } catch (error) {
    console.error("Error deleting message:", error);
    return false;
  }
};

export const editMessage = async (messageId: string, newContent: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ 
        content: newContent,
        edited_at: new Date().toISOString(),
        is_edited: true
      })
      .eq('id', messageId);

    return !error;
  } catch (error) {
    console.error('Error editing message:', error);
    return false;
  }
};

export const deleteChat = async (chatId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId);

    return !error;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
};

// AI Chat - Special constant for AI friend
export const AI_FRIEND_ID = 'ai-assistant';

export const sendAIMessage = async (userId: string, message: string, conversationHistory: Array<{role: string, content: string}>): Promise<string | null> => {
  try {
    const chatId = createChatId(userId, AI_FRIEND_ID);
    
    // Call AI edge function
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: { 
        messages: conversationHistory,
        chatId,
        userId
      }
    });

    if (error) throw error;
    
    return data?.message || null;
  } catch (error) {
    console.error("Error sending AI message:", error);
    return null;
  }
};