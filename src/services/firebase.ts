import { auth, database } from "@/config/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  ref, 
  set, 
  get, 
  push,
  onValue,
  off,
  serverTimestamp,
  query,
  orderByChild,
  equalTo
} from "firebase/database";
import { User, FriendRequest } from "@/types/user";

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();
      if (firebaseUser) {
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          resolve(snapshot.val());
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
};

export const registerUser = async (
  email: string, 
  password: string, 
  username: string, 
  displayName: string
): Promise<{ user: User; error?: string }> => {
  try {
    // Check if username already exists
    const usernameQuery = query(
      ref(database, 'users'), 
      orderByChild('username'), 
      equalTo(username)
    );
    const usernameSnapshot = await get(usernameQuery);
    
    if (usernameSnapshot.exists()) {
      return { user: null as any, error: "Username already exists" };
    }

    // Create user with email and password
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in database
    const userData: User = {
      id: credential.user.uid,
      username,
      displayName,
      email,
      isOnline: true,
      bio: "",
      createdAt: serverTimestamp() as any
    };

    await set(ref(database, `users/${credential.user.uid}`), userData);
    
    return { user: userData };
  } catch (error: any) {
    return { user: null as any, error: error.message };
  }
};

export const loginUser = async (email: string, password: string): Promise<{ user: User; error?: string }> => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update user online status
    await set(ref(database, `users/${credential.user.uid}/isOnline`), true);
    
    // Get user data
    const userRef = ref(database, `users/${credential.user.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return { user: snapshot.val() };
    } else {
      return { user: null as any, error: "User data not found" };
    }
  } catch (error: any) {
    return { user: null as any, error: error.message };
  }
};

export const logoutUser = async (): Promise<void> => {
  if (auth.currentUser) {
    await set(ref(database, `users/${auth.currentUser.uid}/isOnline`), false);
    await signOut(auth);
  }
};

export const searchUsers = async (query: string, currentUserId: string): Promise<User[]> => {
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) return [];
    
    const users: User[] = [];
    const lowercaseQuery = query.toLowerCase();
    
    snapshot.forEach((child) => {
      const userData = child.val();
      if (
        userData.id !== currentUserId &&
        (userData.username.toLowerCase().includes(lowercaseQuery) ||
         userData.displayName.toLowerCase().includes(lowercaseQuery))
      ) {
        users.push(userData);
      }
    });
    
    return users;
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

export const sendFriendRequest = async (fromUserId: string, toUserId: string): Promise<boolean> => {
  try {
    // Check if request already exists
    const requestsRef = ref(database, 'friendRequests');
    const snapshot = await get(requestsRef);
    
    if (snapshot.exists()) {
      let requestExists = false;
      snapshot.forEach((child) => {
        const request = child.val();
        if (
          (request.fromUserId === fromUserId && request.toUserId === toUserId) ||
          (request.fromUserId === toUserId && request.toUserId === fromUserId)
        ) {
          requestExists = true;
        }
      });
      
      if (requestExists) return false;
    }

    // Get user data for the request
    const fromUserSnapshot = await get(ref(database, `users/${fromUserId}`));
    const toUserSnapshot = await get(ref(database, `users/${toUserId}`));
    
    if (!fromUserSnapshot.exists() || !toUserSnapshot.exists()) return false;
    
    const requestData: FriendRequest = {
      id: '', // Will be set by push
      fromUserId,
      toUserId,
      fromUser: fromUserSnapshot.val(),
      toUser: toUserSnapshot.val(),
      status: 'pending',
      createdAt: serverTimestamp() as any
    };

    const newRequestRef = push(ref(database, 'friendRequests'));
    requestData.id = newRequestRef.key!;
    await set(newRequestRef, requestData);
    
    return true;
  } catch (error) {
    console.error("Error sending friend request:", error);
    return false;
  }
};

export const getFriendRequests = (userId: string, callback: (requests: FriendRequest[]) => void) => {
  const requestsRef = ref(database, 'friendRequests');
  
  const handleData = (snapshot: any) => {
    const requests: FriendRequest[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child: any) => {
        const request = child.val();
        if (
          (request.toUserId === userId || request.fromUserId === userId) &&
          request.status === 'pending'
        ) {
          requests.push(request);
        }
      });
    }
    callback(requests);
  };
  
  onValue(requestsRef, handleData);
  
  // Return cleanup function
  return () => off(requestsRef, 'value', handleData);
};

export const respondToFriendRequest = async (requestId: string, accept: boolean): Promise<boolean> => {
  try {
    const requestRef = ref(database, `friendRequests/${requestId}`);
    const snapshot = await get(requestRef);
    
    if (!snapshot.exists()) return false;
    
    const request = snapshot.val();
    
    // Update request status
    await set(ref(database, `friendRequests/${requestId}/status`), accept ? 'accepted' : 'declined');
    
    if (accept) {
      // Add to friends list
      const friendshipId = push(ref(database, 'friendships')).key!;
      const friendshipData = {
        id: friendshipId,
        user1Id: request.fromUserId,
        user2Id: request.toUserId,
        createdAt: serverTimestamp()
      };
      
      await set(ref(database, `friendships/${friendshipId}`), friendshipData);
    }
    
    return true;
  } catch (error) {
    console.error("Error responding to friend request:", error);
    return false;
  }
};

export const getFriends = (userId: string, callback: (friends: User[]) => void) => {
  const friendshipsRef = ref(database, 'friendships');
  
  const handleData = async (snapshot: any) => {
    const friends: User[] = [];
    const friendIds: string[] = [];
    
    if (snapshot.exists()) {
      snapshot.forEach((child: any) => {
        const friendship = child.val();
        if (friendship.user1Id === userId) {
          friendIds.push(friendship.user2Id);
        } else if (friendship.user2Id === userId) {
          friendIds.push(friendship.user1Id);
        }
      });
    }
    
    // Get friend data
    for (const friendId of friendIds) {
      const userSnapshot = await get(ref(database, `users/${friendId}`));
      if (userSnapshot.exists()) {
        friends.push(userSnapshot.val());
      }
    }
    
    callback(friends);
  };
  
  onValue(friendshipsRef, handleData);
  
  // Return cleanup function
  return () => off(friendshipsRef, 'value', handleData);
};

// Messages functions
export const sendMessage = async (chatId: string, senderId: string, message: string): Promise<boolean> => {
  try {
    const messageData = {
      id: '', // Will be set by push
      senderId,
      message,
      timestamp: serverTimestamp(),
      type: 'text'
    };

    const newMessageRef = push(ref(database, `chats/${chatId}/messages`));
    messageData.id = newMessageRef.key!;
    await set(newMessageRef, messageData);
    
    // Update last message in chat
    await set(ref(database, `chats/${chatId}/lastMessage`), {
      message,
      timestamp: serverTimestamp(),
      senderId
    });
    
    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
};

export const getMessages = (chatId: string, callback: (messages: any[]) => void) => {
  const messagesRef = ref(database, `chats/${chatId}/messages`);
  
  const handleData = (snapshot: any) => {
    const messages: any[] = [];
    if (snapshot.exists()) {
      snapshot.forEach((child: any) => {
        messages.push(child.val());
      });
    }
    // Sort by timestamp
    messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    callback(messages);
  };
  
  onValue(messagesRef, handleData);
  
  // Return cleanup function
  return () => off(messagesRef, 'value', handleData);
};

export const createChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

export const deleteMessage = async (chatId: string, messageId: string): Promise<boolean> => {
  try {
    await set(ref(database, `chats/${chatId}/messages/${messageId}`), null);
    return true;
  } catch (error) {
    console.error("Error deleting message:", error);
    return false;
  }
};

export const deleteChat = async (chatId: string): Promise<boolean> => {
  try {
    await set(ref(database, `chats/${chatId}`), null);
    return true;
  } catch (error) {
    console.error("Error deleting chat:", error);
    return false;
  }
};

// Profile management functions
export const updateUserProfile = async (userId: string, profileData: Partial<User>): Promise<boolean> => {
  try {
    const userRef = ref(database, `users/${userId}`);
    // Get current user data and merge with new data
    const currentSnapshot = await get(userRef);
    const currentData = currentSnapshot.exists() ? currentSnapshot.val() : {};
    const updatedData = { ...currentData, ...profileData };
    
    await set(userRef, updatedData);
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};