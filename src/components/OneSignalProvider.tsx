import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform, getPlatform } from '@/lib/capacitor';
import { 
  initOneSignalNative, 
  getPlayerId as getNativePlayerId, 
  isSubscribed as isNativeSubscribed,
  optIn as nativeOptIn,
  optOut as nativeOptOut
} from '@/lib/onesignal-native';

interface OneSignalContextType {
  isInitialized: boolean;
  playerId: string | null;
  pushEnabled: boolean;
  isNative: boolean;
  requestPermission: () => Promise<boolean>;
  disablePush: () => Promise<void>;
  sendTestPush: () => Promise<boolean>;
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
  const isNative = isNativePlatform();

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

  // Initialize OneSignal (Web or Native)
  useEffect(() => {
    if (!userId) return;

    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn('OneSignal App ID not configured (VITE_ONESIGNAL_APP_ID)');
      return;
    }

    // Native platform (Android/iOS via Capacitor)
    if (isNative) {
      initNativeOneSignal(appId, userId);
      return;
    }

    // Web platform
    initWebOneSignal(appId, userId);
  }, [userId, isNative]);

  const initNativeOneSignal = async (appId: string, uid: string) => {
    // Wait for device ready
    const waitForPlugin = () => new Promise<boolean>((resolve) => {
      let attempts = 0;
      const check = () => {
        if (window.plugins?.OneSignal) {
          resolve(true);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(check, 250);
        } else {
          resolve(false);
        }
      };
      check();
    });

    const pluginReady = await waitForPlugin();
    if (!pluginReady) {
      console.warn('OneSignal native plugin not found');
      return;
    }

    const success = initOneSignalNative(appId, {
      onSubscriptionChange: async (newPlayerId, isSubscribed) => {
        setPlayerId(newPlayerId);
        setPushEnabled(isSubscribed);
        
        if (newPlayerId && isSubscribed) {
          await updatePlayerIdInDatabase(newPlayerId, uid);
        } else {
          await disablePushInDatabase(uid);
        }
      },
      onNotificationOpened: (data) => {
        // Navigate to chat when notification is tapped
        if (data.senderId) {
          window.location.href = `/chat/${data.senderId}`;
        }
      },
    });

    if (success) {
      setIsInitialized(true);
      
      // Check current subscription state
      const currentPlayerId = await getNativePlayerId();
      const currentSubscribed = await isNativeSubscribed();
      
      if (currentPlayerId) {
        setPlayerId(currentPlayerId);
        setPushEnabled(currentSubscribed);
        if (currentSubscribed) {
          await updatePlayerIdInDatabase(currentPlayerId, uid);
        }
      }
    }
  };

  const initWebOneSignal = (appId: string, uid: string) => {
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
        console.log('OneSignal Web initialized successfully');

        // Check if already subscribed
        const permission = await OneSignal.Notifications.permission;
        const subscriptionId = await OneSignal.User.PushSubscription.id;
        
        if (permission && subscriptionId) {
          setPlayerId(subscriptionId);
          setPushEnabled(true);
          await updatePlayerIdInDatabase(subscriptionId, uid);
        }

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
          const newPlayerId = event.current.id;
          const optedIn = event.current.optedIn;
          
          setPlayerId(newPlayerId);
          setPushEnabled(optedIn);
          
          if (newPlayerId && optedIn) {
            await updatePlayerIdInDatabase(newPlayerId, uid);
          } else {
            await disablePushInDatabase(uid);
          }
        });

      } catch (error) {
        console.error('Error initializing OneSignal Web:', error);
      }
    });
  };

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
    if (!userId) {
      console.warn('User not logged in');
      return false;
    }

    try {
      if (isNative) {
        await nativeOptIn();
        const newPlayerId = await getNativePlayerId();
        const subscribed = await isNativeSubscribed();
        
        if (newPlayerId && subscribed) {
          setPlayerId(newPlayerId);
          setPushEnabled(true);
          await updatePlayerIdInDatabase(newPlayerId, userId);
          return true;
        }
        return false;
      }

      // Web
      if (!window.OneSignal) {
        console.warn('OneSignal Web SDK not loaded');
        return false;
      }

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
    if (!userId) return;

    try {
      if (isNative) {
        await nativeOptOut();
      } else if (window.OneSignal) {
        await window.OneSignal.User.PushSubscription.optOut();
      }
      
      setPushEnabled(false);
      await disablePushInDatabase(userId);
    } catch (error) {
      console.error('Error disabling push:', error);
    }
  };

  const sendTestPush = async (): Promise<boolean> => {
    if (!playerId || !userId) {
      console.warn('No player ID or user ID for test push');
      return false;
    }

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          playerId,
          title: '🎉 Test Notification',
          message: 'Push notifications are working!',
          data: { test: true },
        },
      });

      if (error) {
        console.error('Test push failed:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error sending test push:', error);
      return false;
    }
  };

  return (
    <OneSignalContext.Provider value={{ 
      isInitialized, 
      playerId, 
      pushEnabled,
      isNative,
      requestPermission, 
      disablePush,
      sendTestPush,
    }}>
      {children}
    </OneSignalContext.Provider>
  );
};
