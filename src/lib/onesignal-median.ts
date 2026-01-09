// Median.co OneSignal JavaScript Bridge
// This file handles OneSignal integration for apps built with Median.co

declare global {
  interface Window {
    median?: {
      onesignal: {
        info: () => Promise<MedianOneSignalInfo>;
        onesignalInfo: () => Promise<MedianOneSignalInfo>;
        register: () => void;
        login: (externalId: string) => Promise<void>;
        logout: () => Promise<void>;
        status: () => Promise<MedianOneSignalStatus>;
      };
    };
    median_onesignal_info?: (info: MedianOneSignalInfo) => void;
    median_onesignal_subscription_changed?: (info: MedianOneSignalInfo) => void;
  }
}

export interface MedianOneSignalInfo {
  oneSignalUserId: string | null;      // Legacy player ID
  oneSignalSubscribed: boolean;
  subscription?: {
    id: string;                         // Subscription ID (new format)
  };
  externalId?: string;
  oneSignalRequiresPrivacyConsent?: boolean;
  oneSignalConsentGiven?: boolean;
}

interface MedianOneSignalStatus {
  subscribed: boolean;
  userId: string | null;
}

/**
 * Check if running inside Median.co app
 */
export const isMedianApp = (): boolean => {
  return typeof window.median?.onesignal !== 'undefined';
};

/**
 * Get OneSignal subscription info from Median app
 */
export const getMedianOneSignalInfo = async (): Promise<MedianOneSignalInfo | null> => {
  if (!isMedianApp()) return null;
  
  try {
    // Try the info() method first (newer API)
    const info = await window.median!.onesignal.info();
    return info;
  } catch (error) {
    console.error('Error getting Median OneSignal info:', error);
    return null;
  }
};

/**
 * Register for push notifications (prompts user)
 */
export const registerMedianPush = (): void => {
  if (!isMedianApp()) return;
  window.median!.onesignal.register();
};

/**
 * Login with external user ID (for targeting specific users)
 */
export const loginMedianOneSignal = async (userId: string): Promise<void> => {
  if (!isMedianApp()) return;
  
  try {
    await window.median!.onesignal.login(userId);
    console.log('Median OneSignal login successful for user:', userId);
  } catch (error) {
    console.error('Error logging in to Median OneSignal:', error);
  }
};

/**
 * Logout from OneSignal (removes external user ID)
 */
export const logoutMedianOneSignal = async (): Promise<void> => {
  if (!isMedianApp()) return;
  
  try {
    await window.median!.onesignal.logout();
    console.log('Median OneSignal logout successful');
  } catch (error) {
    console.error('Error logging out from Median OneSignal:', error);
  }
};

/**
 * Get the player ID (subscription ID) from Median OneSignal info
 */
export const getMedianPlayerId = (info: MedianOneSignalInfo): string | null => {
  // Prefer the subscription.id (newer format), fallback to oneSignalUserId (legacy)
  return info.subscription?.id || info.oneSignalUserId || null;
};

/**
 * Setup callback for subscription changes
 */
export const setupMedianSubscriptionListener = (
  callback: (info: MedianOneSignalInfo) => void
): void => {
  // Median.co calls this global function when subscription changes
  window.median_onesignal_subscription_changed = callback;
};

/**
 * Setup callback for when OneSignal info is ready
 */
export const setupMedianInfoListener = (
  callback: (info: MedianOneSignalInfo) => void
): void => {
  window.median_onesignal_info = callback;
};
