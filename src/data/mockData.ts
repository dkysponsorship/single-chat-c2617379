import { User, FriendRequest } from "@/types/user";

// Mock users database
export const mockUsers: User[] = [
  {
    id: "user1",
    username: "alice_j",
    displayName: "Alice Johnson",
    email: "alice@example.com",
    isOnline: true,
    bio: "Love to chat and connect!"
  },
  {
    id: "user2", 
    username: "bob_smith",
    displayName: "Bob Smith",
    email: "bob@example.com",
    isOnline: true,
    bio: "Always up for a good conversation"
  },
  {
    id: "user3",
    username: "carol_d",
    displayName: "Carol Davis", 
    email: "carol@example.com",
    isOnline: false,
    lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
    bio: "Tech enthusiast and coffee lover"
  },
  {
    id: "user4",
    username: "david_w",
    displayName: "David Wilson",
    email: "david@example.com", 
    isOnline: true,
    bio: "Designer and creative thinker"
  },
  {
    id: "user5",
    username: "emma_brown",
    displayName: "Emma Brown",
    email: "emma@example.com",
    isOnline: false,
    lastSeen: new Date(Date.now() - 7200000), // 2 hours ago
    bio: "Music lover and artist"
  },
  {
    id: "user6",
    username: "john_doe",
    displayName: "John Doe",
    email: "john@example.com",
    isOnline: true,
    bio: "Software developer"
  }
];

// Helper functions for localStorage management
export const getCurrentUser = (): User | null => {
  const userStr = sessionStorage.getItem("currentUser");
  if (!userStr) return null;
  
  try {
    // Try to parse as JSON (new format)
    const savedUser = JSON.parse(userStr);
    if (savedUser && typeof savedUser === 'object' && savedUser.username) {
      return mockUsers.find(u => u.username === savedUser.username || u.id === savedUser.id) || null;
    } else {
      // Handle old format (plain string username)
      return mockUsers.find(u => u.username === userStr) || null;
    }
  } catch (error) {
    // If JSON.parse fails, treat it as old format (plain string username)
    return mockUsers.find(u => u.username === userStr) || null;
  }
};

export const getUserByUsername = (username: string): User | null => {
  return mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
};

export const getUserById = (id: string): User | null => {
  return mockUsers.find(u => u.id === id) || null;
};

export const searchUsers = (query: string, currentUserId: string): User[] => {
  const lowercaseQuery = query.toLowerCase();
  return mockUsers.filter(user => 
    user.id !== currentUserId &&
    (user.username.toLowerCase().includes(lowercaseQuery) ||
     user.displayName.toLowerCase().includes(lowercaseQuery))
  );
};

export const getFriendRequests = (userId: string): FriendRequest[] => {
  const requests = localStorage.getItem('friendRequests');
  if (!requests) return [];
  
  const allRequests: FriendRequest[] = JSON.parse(requests);
  return allRequests.filter(req => 
    (req.toUserId === userId || req.fromUserId === userId) && 
    req.status === 'pending'
  );
};

export const sendFriendRequest = (fromUserId: string, toUserId: string): boolean => {
  const existingRequests = localStorage.getItem('friendRequests');
  const requests: FriendRequest[] = existingRequests ? JSON.parse(existingRequests) : [];
  
  // Check if request already exists
  const existingRequest = requests.find(req => 
    (req.fromUserId === fromUserId && req.toUserId === toUserId) ||
    (req.fromUserId === toUserId && req.toUserId === fromUserId)
  );
  
  if (existingRequest) return false;
  
  const fromUser = getUserById(fromUserId);
  const toUser = getUserById(toUserId);
  
  if (!fromUser || !toUser) return false;
  
  const newRequest: FriendRequest = {
    id: `req_${Date.now()}`,
    fromUserId,
    toUserId,
    fromUser,
    toUser,
    status: 'pending',
    createdAt: new Date()
  };
  
  requests.push(newRequest);
  localStorage.setItem('friendRequests', JSON.stringify(requests));
  return true;
};

export const respondToFriendRequest = (requestId: string, accept: boolean): boolean => {
  const requests = localStorage.getItem('friendRequests');
  if (!requests) return false;
  
  const allRequests: FriendRequest[] = JSON.parse(requests);
  const requestIndex = allRequests.findIndex(req => req.id === requestId);
  
  if (requestIndex === -1) return false;
  
  allRequests[requestIndex].status = accept ? 'accepted' : 'declined';
  localStorage.setItem('friendRequests', JSON.stringify(allRequests));
  
  if (accept) {
    // Add to friends list
    const friends = localStorage.getItem('friendships') || '[]';
    const friendships = JSON.parse(friends);
    const request = allRequests[requestIndex];
    
    friendships.push({
      id: `friendship_${Date.now()}`,
      user1Id: request.fromUserId,
      user2Id: request.toUserId,
      createdAt: new Date()
    });
    
    localStorage.setItem('friendships', JSON.stringify(friendships));
  }
  
  return true;
};

export const getFriends = (userId: string): User[] => {
  const friendships = localStorage.getItem('friendships') || '[]';
  const allFriendships = JSON.parse(friendships);
  
  const friendIds = allFriendships
    .filter((f: any) => f.user1Id === userId || f.user2Id === userId)
    .map((f: any) => f.user1Id === userId ? f.user2Id : f.user1Id);
  
  return mockUsers.filter(user => friendIds.includes(user.id));
};