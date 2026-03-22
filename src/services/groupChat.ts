import { supabase } from "@/integrations/supabase/client";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  last_message?: string;
  last_message_at?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_online: boolean;
  };
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  reply_to: string | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  sender_profile?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// Create a new group
export const createGroup = async (
  name: string,
  description: string,
  creatorId: string,
  memberIds: string[]
): Promise<Group | null> => {
  try {
    // Create the group
    console.log('Creating group with:', { name, description, creatorId, memberIds });
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name,
        description: description || null,
        created_by: creatorId,
      })
      .select()
      .single();

    if (groupError || !group) {
      console.error('Error creating group:', groupError);
      return null;
    }

    console.log('Group created:', group);

    // Add creator as admin
    const membersToInsert = [
      { group_id: group.id, user_id: creatorId, role: 'admin' },
      ...memberIds.map(id => ({ group_id: group.id, user_id: id, role: 'member' }))
    ];

    console.log('Inserting members:', membersToInsert);
    const { error: membersError } = await supabase
      .from('group_members')
      .insert(membersToInsert);

    if (membersError) {
      console.error('Error adding members:', membersError);
    }

    return group as any;
  } catch (error) {
    console.error('Error creating group:', error);
    return null;
  }
};

// Get user's groups
export const getUserGroups = (userId: string, callback: (groups: Group[]) => void) => {
  const fetchGroups = async () => {
    // Get group IDs where user is a member
    const { data: memberships, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (memberError || !memberships?.length) {
      callback([]);
      return;
    }

    const groupIds = memberships.map(m => (m as any).group_id);

    const { data: groups, error } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching groups:', error);
      callback([]);
      return;
    }

    callback((groups || []) as any);
  };

  fetchGroups();

  // Subscribe to changes
  const channel = supabase
    .channel(`user-groups-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => fetchGroups())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => fetchGroups())
    .subscribe();

  return () => { channel.unsubscribe(); };
};

// Get group members with profiles
export const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      profile:profiles!group_members_user_id_fkey1(id, username, display_name, avatar_url, is_online)
    `)
    .eq('group_id', groupId);

  if (error) {
    // Fallback: fetch members then profiles separately
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);

    if (membersError || !members) return [];

    const memberIds = members.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_online')
      .in('id', memberIds);

    return members.map((m: any) => ({
      ...m,
      profile: profiles?.find((p: any) => p.id === m.user_id) || null,
    }));
  }

  return (data || []) as any;
};

// Get group messages with realtime
export const getGroupMessages = (groupId: string, callback: (messages: GroupMessage[]) => void) => {
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('Error fetching group messages:', error);
      return;
    }

    // Fetch sender profiles
    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', senderIds);

      const messagesWithProfiles = data.map((msg: any) => ({
        ...msg,
        sender_profile: profiles?.find((p: any) => p.id === msg.sender_id) || null,
      }));

      callback(messagesWithProfiles);
    } else {
      callback([]);
    }
  };

  fetchMessages();

  const channel = supabase
    .channel(`group-messages-${groupId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
      () => fetchMessages()
    )
    .subscribe();

  return () => { channel.unsubscribe(); };
};

// Send group message
export const sendGroupMessage = async (
  groupId: string,
  senderId: string,
  content: string,
  replyTo?: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('group_messages')
    .insert({
      group_id: groupId,
      sender_id: senderId,
      content,
      reply_to: replyTo || null,
    } as any);

  if (error) {
    console.error('Error sending group message:', error);
    return false;
  }

  // Update group's updated_at
  await supabase
    .from('groups')
    .update({ updated_at: new Date().toISOString() } as any)
    .eq('id', groupId);

  return true;
};

// Delete group message
export const deleteGroupMessage = async (messageId: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('group_messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', userId);

  return !error;
};

// Edit group message
export const editGroupMessage = async (messageId: string, newContent: string): Promise<boolean> => {
  const { error } = await supabase
    .from('group_messages')
    .update({
      content: newContent,
      is_edited: true,
      edited_at: new Date().toISOString(),
    } as any)
    .eq('id', messageId);

  return !error;
};

// Add member to group
export const addGroupMember = async (groupId: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'member' } as any);

  return !error;
};

// Remove member from group
export const removeGroupMember = async (groupId: string, userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  return !error;
};

// Leave group
export const leaveGroup = async (groupId: string, userId: string): Promise<boolean> => {
  return removeGroupMember(groupId, userId);
};

// Delete group (creator only)
export const deleteGroup = async (groupId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  return !error;
};
