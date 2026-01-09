import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = () => {
  return Capacitor.getPlatform();
};

/**
 * Check if running inside Median.co app
 */
export const isMedianPlatform = (): boolean => {
  return typeof (window as any).median !== 'undefined';
};

/**
 * Get the platform type with priority:
 * 1. Median.co app (window.median exists)
 * 2. Capacitor native (Android/iOS)
 * 3. Web browser
 */
export type PlatformType = 'median' | 'capacitor' | 'web';

export const getPlatformType = (): PlatformType => {
  if (isMedianPlatform()) return 'median';
  if (isNativePlatform()) return 'capacitor';
  return 'web';
};
