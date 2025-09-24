export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  bio?: string;
  createdAt?: any;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_profile?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
  };
  to_profile?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
  };
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at?: string;
};

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
}