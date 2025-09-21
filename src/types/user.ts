export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  bio?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUser: User;
  toUser: User;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
}