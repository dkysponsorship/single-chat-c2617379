import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OneSignalContextType {
  isInitialized: boolean;
  playerId: string | null;
  pushEnabled: boolean;
  requestPermission: () => Promise<boolean>;
  disablePush: () => Promise<void>;
}

const OneSignalContext = createContext<OneSignalContextType | null>(null);

export const useOneSignalContext = () => {
  const context = useContext(OneSignalContext);
  return context;
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: any) => void>;
    OneSignal?: any;
  }
}

interface OneSignalProviderProps {
  children: ReactNode;
}

export const OneSignalProvider: React.FC<OneSignalProviderProps> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Get user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setPlayerId(null);
        setPushEnabled(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize OneSignal
  useEffect(() => {
    if (!userId) return;

    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn('OneSignal App ID not configured (VITE_ONESIGNAL_APP_ID)');
      return;
    }

    // Check if already loaded
    if (window.OneSignal) {
      setIsInitialized(true);
      return;
    }

    // Load OneSignal SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/push/onesignal/' },
          serviceWorkerPath: '/push/onesignal/OneSignalSDKWorker.js',
        });

        setIsInitialized(true);
        console.log('OneSignal initialized successfully');

        // Check if already subscribed
        const permission = await OneSignal.Notifications.permission;
        const subscriptionId = await OneSignal.User.PushSubscription.id;
        
        if (permission && subscriptionId) {
          setPlayerId(subscriptionId);
          setPushEnabled(true);
          await updatePlayerIdInDatabase(subscriptionId, userId);
        }

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
          const newPlayerId = event.current.id;
          const optedIn = event.current.optedIn;
          
          setPlayerId(newPlayerId);
          setPushEnabled(optedIn);
          
          if (newPlayerId && optedIn) {
            await updatePlayerIdInDatabase(newPlayerId, userId);
          } else {
            await disablePushInDatabase(userId);
          }
        });

      } catch (error) {
        console.error('Error initializing OneSignal:', error);
      }
    });
  }, [userId]);

  const updatePlayerIdInDatabase = async (newPlayerId: string, uid: string) => {
    try {
      const platform = /Android/i.test(navigator.userAgent) 
        ? 'android' 
        : /iPhone|iPad|iPod/i.test(navigator.userAgent) 
          ? 'ios' 
          : 'web';

      const { error } = await supabase
        .from('profiles')
        .update({
          onesignal_player_id: newPlayerId,
          push_enabled: true,
          device_platform: platform,
        })
        .eq('id', uid);

      if (error) {
        console.error('Error updating player ID:', error);
      } else {
        console.log('Player ID updated in database:', newPlayerId);
      }
    } catch (error) {
      console.error('Error updating player ID:', error);
    }
  };

  const disablePushInDatabase = async (uid: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          push_enabled: false,
        })
        .eq('id', uid);

      if (error) {
        console.error('Error disabling push:', error);
      }
    } catch (error) {
      console.error('Error disabling push:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isInitialized || !window.OneSignal || !userId) {
      console.warn('OneSignal not initialized or user not logged in');
      return false;
    }

    try {
      await window.OneSignal.Notifications.requestPermission();
      const permission = await window.OneSignal.Notifications.permission;
      const subscriptionId = await window.OneSignal.User.PushSubscription.id;
      
      if (permission && subscriptionId) {
        setPlayerId(subscriptionId);
        setPushEnabled(true);
        await updatePlayerIdInDatabase(subscriptionId, userId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  };

  const disablePush = async () => {
    if (!window.OneSignal || !userId) return;

    try {
      await window.OneSignal.User.PushSubscription.optOut();
      setPushEnabled(false);
      await disablePushInDatabase(userId);
    } catch (error) {
      console.error('Error disabling push:', error);
    }
  };

  return (
    <OneSignalContext.Provider value={{ 
      isInitialized, 
      playerId, 
      pushEnabled, 
      requestPermission, 
      disablePush 
    }}>
      {children}
    </OneSignalContext.Provider>
  );
};
