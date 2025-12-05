import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { getCurrentUser } from '@/services/supabase';
import { useLocation } from 'react-router-dom';

interface NotificationContextType {
  unreadCounts: { [friendId: string]: number };
  totalUnread: number;
  requestPermission: () => Promise<boolean>;
  permissionGranted: boolean;
  markAsRead: (chatId: string) => Promise<void>;
  fetchUnreadCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();
  
  // Extract current chat ID from URL if on chat page
  const currentChatId = React.useMemo(() => {
    const match = location.pathname.match(/\/chat\/(.+)/);
    if (match && userId) {
      const friendId = match[1];
      return [userId, friendId].sort().join('_');
    }
    return undefined;
  }, [location.pathname, userId]);

  const notifications = useNotifications(userId, currentChatId);

  useEffect(() => {
    const initUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        // Request notification permission when user logs in
        notifications.requestPermission();
      }
    };
    initUser();
  }, []);

  // Re-fetch unread counts when route changes
  useEffect(() => {
    if (userId) {
      notifications.fetchUnreadCounts();
    }
  }, [location.pathname, userId]);

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
};
