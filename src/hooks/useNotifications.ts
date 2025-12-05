import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UnreadCounts {
  [friendId: string]: number;
}

export const useNotifications = (userId: string | null, currentChatId?: string) => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [permissionGranted, setPermissionGranted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
      return permission === 'granted';
    }
    return false;
  }, []);

  // Check permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  }, []);

  // Show browser notification
  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permissionGranted && 'Notification' in window) {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }, [permissionGranted]);

  // Fetch unread counts for all chats
  const fetchUnreadCounts = useCallback(async () => {
    if (!userId) return;

    try {
      // Get all friendships to know what chats to check
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (!friendships) return;

      const counts: UnreadCounts = {};

      for (const friendship of friendships) {
        const friendId = friendship.user1_id === userId ? friendship.user2_id : friendship.user1_id;
        const chatId = [userId, friendId].sort().join('_');

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chatId)
          .neq('sender_id', userId)
          .is('read_at', null);

        if (count && count > 0) {
          counts[friendId] = count;
        }
      }

      // Add AI assistant unread count
      const aiChatId = [userId, 'ai-assistant'].sort().join('_');
      const { count: aiCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', aiChatId)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (aiCount && aiCount > 0) {
        counts['ai-assistant'] = aiCount;
      }

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [userId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!userId) return;

    fetchUnreadCounts();

    const channelName = `notifications-${userId}-${Date.now()}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Check if this message is for the current user
          const chatId = newMessage.chat_id;
          if (!chatId.includes(userId)) return;

          // Don't notify for own messages
          if (newMessage.sender_id === userId) return;

          // Don't notify if currently viewing this chat
          if (currentChatId && chatId === currentChatId) return;

          // Get sender info
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .maybeSingle();

          const senderName = senderProfile?.display_name || 'Someone';
          const messagePreview = newMessage.content?.slice(0, 50) || 
            (newMessage.audio_url ? '🎤 Voice message' : 
            (newMessage.image_url ? '📷 Image' : 'New message'));

          // Play sound
          playSound();

          // Show browser notification
          showNotification(
            senderName,
            messagePreview,
            senderProfile?.avatar_url
          );

          // Show toast notification
          toast({
            title: senderName,
            description: messagePreview,
          });

          // Update unread counts
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, currentChatId, fetchUnreadCounts, playSound, showNotification, toast]);

  // Mark messages as read
  const markAsRead = useCallback(async (chatId: string) => {
    if (!userId) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .neq('sender_id', userId)
        .is('read_at', null);

      // Update local state
      const friendId = chatId.split('_').find(id => id !== userId);
      if (friendId) {
        setUnreadCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[friendId];
          return newCounts;
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [userId]);

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return {
    unreadCounts,
    totalUnread,
    requestPermission,
    permissionGranted,
    markAsRead,
    fetchUnreadCounts,
  };
};
