import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted: boolean;
}

export const useMessageReactions = (chatId: string, currentUserId: string | null) => {
  const [reactions, setReactions] = useState<{ [messageId: string]: Reaction[] }>({});

  // Fetch all reactions for the chat
  const fetchReactions = useCallback(async () => {
    if (!chatId || !currentUserId) return;

    // Get all message IDs in this chat first
    const { data: messages } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId);

    if (!messages || messages.length === 0) return;

    const messageIds = messages.map(m => m.id);

    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (error) {
      console.error('Error fetching reactions:', error);
      return;
    }

    // Group reactions by message_id
    const grouped: { [messageId: string]: Reaction[] } = {};
    data?.forEach(r => {
      const reaction: Reaction = {
        id: r.id,
        messageId: r.message_id,
        userId: r.user_id,
        emoji: r.emoji,
        createdAt: r.created_at,
      };
      if (!grouped[r.message_id]) {
        grouped[r.message_id] = [];
      }
      grouped[r.message_id].push(reaction);
    });

    setReactions(grouped);
  }, [chatId, currentUserId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!chatId || !currentUserId) return;

    fetchReactions();

    const channel = supabase
      .channel(`reactions-${chatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId, fetchReactions]);

  // Add a reaction
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserId) return false;

    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
      });

    if (error) {
      // Might be a duplicate, which is fine
      if (error.code !== '23505') {
        console.error('Error adding reaction:', error);
      }
      return false;
    }

    return true;
  }, [currentUserId]);

  // Remove a reaction
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserId) return false;

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', currentUserId)
      .eq('emoji', emoji);

    if (error) {
      console.error('Error removing reaction:', error);
      return false;
    }

    return true;
  }, [currentUserId]);

  // Toggle a reaction
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    const messageReactions = reactions[messageId] || [];
    const existingReaction = messageReactions.find(
      r => r.userId === currentUserId && r.emoji === emoji
    );

    if (existingReaction) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  }, [currentUserId, reactions, addReaction, removeReaction]);

  // Get grouped reactions for a message
  const getGroupedReactions = useCallback((messageId: string): GroupedReaction[] => {
    const messageReactions = reactions[messageId] || [];
    const grouped: { [emoji: string]: GroupedReaction } = {};

    messageReactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = {
          emoji: r.emoji,
          count: 0,
          userIds: [],
          hasReacted: false,
        };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].userIds.push(r.userId);
      if (r.userId === currentUserId) {
        grouped[r.emoji].hasReacted = true;
      }
    });

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }, [reactions, currentUserId]);

  return {
    reactions,
    addReaction,
    removeReaction,
    toggleReaction,
    getGroupedReactions,
    fetchReactions,
  };
};
