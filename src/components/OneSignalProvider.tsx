import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform, isMedianPlatform, getPlatformType, PlatformType } from '@/lib/capacitor';
import { 
  initOneSignalNative, 
  getPlayerId as getNativePlayerId, 
  isSubscribed as isNativeSubscribed,
  optIn as nativeOptIn,
  optOut as nativeOptOut
} from '@/lib/onesignal-native';
import {
  isMedianApp,
  getMedianOneSignalInfo,
  registerMedianPush,
  loginMedianOneSignal,
  logoutMedianOneSignal,
  getMedianPlayerId,
  setupMedianSubscriptionListener,
  MedianOneSignalInfo,
} from '@/lib/onesignal-median';

interface OneSignalContextType {
  isInitialized: boolean;
  playerId: string | null;
  pushEnabled: boolean;
  isNative: boolean;
  platformType: PlatformType;
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
    median_onesignal_push_opened?: (data: any) => void;
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
  const platformType = getPlatformType();

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

  // Setup Median.co notification tap handler
  useEffect(() => {
    // Median.co calls this when user taps a notification
    window.median_onesignal_push_opened = (data: any) => {
      console.log('Median push notification opened:', data);
      if (data?.senderId) {
        window.location.href = `/chat/${data.senderId}`;
      } else if (data?.additionalData?.senderId) {
        window.location.href = `/chat/${data.additionalData.senderId}`;
      }
    };

    return () => {
      delete window.median_onesignal_push_opened;
    };
  }, []);

  // Initialize OneSignal (Median > Capacitor > Web)
  useEffect(() => {
    if (!userId) return;

    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

    // Priority: Median.co > Capacitor Native > Web
    // Median.co handles OneSignal initialization itself - we just use its API
    if (isMedianApp()) {
      console.log('Initializing OneSignal for Median.co platform');
      initMedianOneSignal(userId);
      return;
    }

    // For Capacitor and Web, we need the App ID
    if (!appId) {
      console.warn('OneSignal App ID not configured (VITE_ONESIGNAL_APP_ID) - Push notifications disabled on web/capacitor');
      return;
    }

    if (isNative) {
      console.log('Initializing OneSignal for Capacitor Native platform');
      initNativeOneSignal(appId, userId);
      return;
    }

    console.log('Initializing OneSignal for Web platform');
    initWebOneSignal(appId, userId);
  }, [userId, isNative]);

  const initMedianOneSignal = async (uid: string) => {
    try {
      // Login with user ID for targeting
      await loginMedianOneSignal(uid);

      // Get current subscription info
      const info = await getMedianOneSignalInfo();
      if (info) {
        const currentPlayerId = getMedianPlayerId(info);
        const isSubscribed = info.oneSignalSubscribed;

        console.log('Median OneSignal info:', { playerId: currentPlayerId, subscribed: isSubscribed });

        setPlayerId(currentPlayerId);
        setPushEnabled(isSubscribed);

        if (currentPlayerId && isSubscribed) {
          await updatePlayerIdInDatabase(currentPlayerId, uid);
        }
      }

      // Setup subscription change listener
      setupMedianSubscriptionListener(async (newInfo: MedianOneSignalInfo) => {
        const newPlayerId = getMedianPlayerId(newInfo);
        const isSubscribed = newInfo.oneSignalSubscribed;

        console.log('Median subscription changed:', { playerId: newPlayerId, subscribed: isSubscribed });

        setPlayerId(newPlayerId);
        setPushEnabled(isSubscribed);

        if (newPlayerId && isSubscribed) {
          await updatePlayerIdInDatabase(newPlayerId, uid);
        } else {
          await disablePushInDatabase(uid);
        }
      });

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing Median OneSignal:', error);
    }
  };

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
        if (data.senderId) {
          window.location.href = `/chat/${data.senderId}`;
        }
      },
    });

    if (success) {
      setIsInitialized(true);
      
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
    if (window.OneSignal) {
      setIsInitialized(true);
      return;
    }

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

        const permission = await OneSignal.Notifications.permission;
        const subscriptionId = await OneSignal.User.PushSubscription.id;
        
        if (permission && subscriptionId) {
          setPlayerId(subscriptionId);
          setPushEnabled(true);
          await updatePlayerIdInDatabase(subscriptionId, uid);
        }

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
      let platform = 'web';
      if (isMedianApp()) {
        platform = /Android/i.test(navigator.userAgent) ? 'android' : 'ios';
      } else if (isNative) {
        platform = /Android/i.test(navigator.userAgent) ? 'android' : 'ios';
      }

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
      // Median.co
      if (isMedianApp()) {
        registerMedianPush();
        
        // Wait a bit for registration to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const info = await getMedianOneSignalInfo();
        if (info) {
          const newPlayerId = getMedianPlayerId(info);
          const isSubscribed = info.oneSignalSubscribed;
          
          if (newPlayerId && isSubscribed) {
            setPlayerId(newPlayerId);
            setPushEnabled(true);
            await updatePlayerIdInDatabase(newPlayerId, userId);
            return true;
          }
        }
        return false;
      }

      // Capacitor Native
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
      // Median.co - logout removes the external ID association
      if (isMedianApp()) {
        await logoutMedianOneSignal();
        setPushEnabled(false);
        await disablePushInDatabase(userId);
        return;
      }

      // Capacitor Native
      if (isNative) {
        await nativeOptOut();
      } else if (window.OneSignal) {
        // Web
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
      platformType,
      requestPermission, 
      disablePush,
      sendTestPush,
    }}>
      {children}
    </OneSignalContext.Provider>
  );
};
