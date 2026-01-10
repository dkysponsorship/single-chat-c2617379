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
 * Median bridge (window.median.onesignal) kabhi-kabhi late inject hota hai.
 * Is helper se hum thoda wait karke reliably detect kar sakte hain.
 */
export const waitForMedianBridge = async (
  timeoutMs: number = 6000,
  intervalMs: number = 250
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isMedianApp()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return isMedianApp();
};

/**
 * Get OneSignal subscription info from Median app
 */
export const getMedianOneSignalInfo = async (): Promise<MedianOneSignalInfo | null> => {
  if (!isMedianApp()) return null;

  try {
    // Newer API
    return await window.median!.onesignal.info();
  } catch (error1) {
    try {
      // Some Median versions expose onesignalInfo()
      return await window.median!.onesignal.onesignalInfo();
    } catch (error2) {
      console.error('Error getting Median OneSignal info:', error2);
      return null;
    }
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
