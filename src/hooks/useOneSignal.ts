import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: any) => void>;
    OneSignal?: any;
  }
}

export const useOneSignal = (userId: string | null) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Initialize OneSignal
  useEffect(() => {
    if (!userId) return;

    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn('OneSignal App ID not configured');
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

    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
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

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isInitialized || !window.OneSignal) {
      console.warn('OneSignal not initialized');
      return false;
    }

    try {
      await window.OneSignal.Notifications.requestPermission();
      const permission = await window.OneSignal.Notifications.permission;
      const subscriptionId = await window.OneSignal.User.PushSubscription.id;
      
      if (permission && subscriptionId && userId) {
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
  }, [isInitialized, userId]);

  const disablePush = useCallback(async () => {
    if (!window.OneSignal || !userId) return;

    try {
      await window.OneSignal.User.PushSubscription.optOut();
      setPushEnabled(false);
      await disablePushInDatabase(userId);
    } catch (error) {
      console.error('Error disabling push:', error);
    }
  }, [userId]);

  return {
    isInitialized,
    playerId,
    pushEnabled,
    requestPermission,
    disablePush,
  };
};
