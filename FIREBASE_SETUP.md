# Firebase Setup Instructions

## Firebase Database Rules Setup

To fix the "permission denied" error during registration, you need to update your Firebase Realtime Database rules.

### Steps:

1. Go to Firebase Console (https://console.firebase.google.com)
2. Select your project: "learnwithdiagram"
3. Go to "Realtime Database" from the left sidebar
4. Click on "Rules" tab
5. Replace the existing rules with the following:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "friendRequests": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "friendships": {
      ".read": "auth != null", 
      ".write": "auth != null"
    },
    "chats": {
      "$chatId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

6. Click "Publish" to save the rules

### What these rules do:
- Users can only read/write their own user data when authenticated
- Friend requests and friendships can be read/written by any authenticated user
- Chat data can be read/written by any authenticated user
- Unauthenticated users have no access to the database

After updating these rules, registration should work properly.