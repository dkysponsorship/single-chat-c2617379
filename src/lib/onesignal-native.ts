// OneSignal Native (Capacitor/Cordova) integration
// This module handles OneSignal for native Android/iOS builds

declare global {
  interface Window {
    plugins?: {
      OneSignal?: any;
    };
  }
}

export interface OneSignalNativeCallbacks {
  onSubscriptionChange?: (playerId: string | null, isSubscribed: boolean) => void;
  onNotificationOpened?: (data: { senderId?: string; chatId?: string }) => void;
}

let isInitialized = false;

export const initOneSignalNative = (
  appId: string,
  callbacks: OneSignalNativeCallbacks
): boolean => {
  if (isInitialized) return true;
  
  const OneSignal = window.plugins?.OneSignal;
  if (!OneSignal) {
    console.warn('OneSignal native plugin not available');
    return false;
  }

  try {
    // Initialize OneSignal
    OneSignal.initialize(appId);
    
    // Request notification permission (required for Android 13+)
    OneSignal.Notifications.requestPermission(true);

    // Listen for subscription changes
    OneSignal.User.pushSubscription.addEventListener('change', (event: any) => {
      const playerId = event.current?.id || null;
      const isSubscribed = event.current?.optedIn || false;
      callbacks.onSubscriptionChange?.(playerId, isSubscribed);
    });

    // Handle notification opened (user tapped on notification)
    OneSignal.Notifications.addEventListener('click', (event: any) => {
      const data = event.notification?.additionalData || {};
      callbacks.onNotificationOpened?.({
        senderId: data.senderId,
        chatId: data.chatId,
      });
    });

    isInitialized = true;
    console.log('OneSignal native initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing OneSignal native:', error);
    return false;
  }
};

export const getPlayerId = async (): Promise<string | null> => {
  const OneSignal = window.plugins?.OneSignal;
  if (!OneSignal) return null;
  
  try {
    const id = await OneSignal.User.pushSubscription.id;
    return id || null;
  } catch {
    return null;
  }
};

export const isSubscribed = async (): Promise<boolean> => {
  const OneSignal = window.plugins?.OneSignal;
  if (!OneSignal) return false;
  
  try {
    return await OneSignal.User.pushSubscription.optedIn || false;
  } catch {
    return false;
  }
};

export const optIn = async (): Promise<void> => {
  const OneSignal = window.plugins?.OneSignal;
  if (!OneSignal) return;
  
  try {
    await OneSignal.User.pushSubscription.optIn();
  } catch (error) {
    console.error('Error opting in:', error);
  }
};

export const optOut = async (): Promise<void> => {
  const OneSignal = window.plugins?.OneSignal;
  if (!OneSignal) return;
  
  try {
    await OneSignal.User.pushSubscription.optOut();
  } catch (error) {
    console.error('Error opting out:', error);
  }
};
