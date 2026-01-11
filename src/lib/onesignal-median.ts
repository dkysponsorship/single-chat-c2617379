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
  oneSignalSubscribed?: boolean;       // Legacy subscribed flag
  oneSignalId?: string;                // Sometimes used instead of oneSignalUserId
  subscription?: {
    id: string;                         // Subscription ID (new format)
    optedIn?: boolean;                  // New subscription opted-in status
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
 * Check if user is subscribed/opted-in from Median OneSignal info.
 * Supports multiple Median API versions.
 */
export const isMedianSubscribed = (info: MedianOneSignalInfo | null): boolean => {
  if (!info) return false;
  
  // Priority 1: New subscription.optedIn (most reliable for newer Median)
  if (info.subscription?.optedIn === true) return true;
  
  // Priority 2: Legacy oneSignalSubscribed flag
  if (info.oneSignalSubscribed === true) return true;
  
  // Priority 3: If we have a subscription ID, consider it opted-in
  // (some Median versions don't set optedIn explicitly)
  if (info.subscription?.id) return true;
  
  return false;
};

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
 * Get OneSignal subscription info from Median app.
 * Tries multiple API methods for compatibility with different Median versions.
 */
export const getMedianOneSignalInfo = async (): Promise<MedianOneSignalInfo | null> => {
  if (!isMedianApp()) return null;

  try {
    // Method 1: Newer API - info()
    const info = await window.median!.onesignal.info();
    if (info) {
      console.log('[Median] Got info from .info():', JSON.stringify(info));
      return info;
    }
  } catch (e1) {
    console.log('[Median] .info() failed:', e1);
  }

  try {
    // Method 2: Some versions use onesignalInfo()
    const info = await window.median!.onesignal.onesignalInfo();
    if (info) {
      console.log('[Median] Got info from .onesignalInfo():', JSON.stringify(info));
      return info;
    }
  } catch (e2) {
    console.log('[Median] .onesignalInfo() failed:', e2);
  }

  try {
    // Method 3: Use status() as fallback and construct info
    const status = await window.median!.onesignal.status();
    if (status) {
      console.log('[Median] Got status from .status():', JSON.stringify(status));
      return {
        oneSignalUserId: status.userId,
        oneSignalSubscribed: status.subscribed,
        subscription: status.userId ? { id: status.userId, optedIn: status.subscribed } : undefined,
      };
    }
  } catch (e3) {
    console.log('[Median] .status() failed:', e3);
  }

  console.warn('[Median] All OneSignal info methods failed');
  return null;
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
 * Get the player ID (subscription ID) from Median OneSignal info.
 * Tries multiple fields for compatibility.
 */
export const getMedianPlayerId = (info: MedianOneSignalInfo): string | null => {
  // Priority: subscription.id (new) > oneSignalUserId (legacy) > oneSignalId (alternate legacy)
  const playerId = info.subscription?.id || info.oneSignalUserId || info.oneSignalId || null;
  console.log('[Median] Extracted playerId:', playerId, 'from info keys:', Object.keys(info));
  return playerId;
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
