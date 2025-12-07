import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTypingIndicator = (chatId: string, userId: string | null) => {
  const [isTyping, setIsTyping] = useState(false);
  const [friendTyping, setFriendTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!chatId || !userId) return;

    const channel = supabase.channel(`typing:${chatId}`);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Check if any other user is typing
        const otherTyping = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.user_id !== userId && p.is_typing)
        );
        setFriendTyping(otherTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            is_typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, userId]);

  const setTyping = useCallback(async (typing: boolean) => {
    if (!channelRef.current || !userId) return;

    setIsTyping(typing);
    
    await channelRef.current.track({
      user_id: userId,
      is_typing: typing,
      online_at: new Date().toISOString(),
    });

    // Auto-clear typing after 3 seconds of inactivity
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(async () => {
        setIsTyping(false);
        if (channelRef.current) {
          await channelRef.current.track({
            user_id: userId,
            is_typing: false,
            online_at: new Date().toISOString(),
          });
        }
      }, 3000);
    }
  }, [userId]);

  const handleInputChange = useCallback(() => {
    setTyping(true);
  }, [setTyping]);

  const stopTyping = useCallback(() => {
    setTyping(false);
  }, [setTyping]);

  return {
    isTyping,
    friendTyping,
    handleInputChange,
    stopTyping,
  };
};
