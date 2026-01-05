import { useState, useEffect, useCallback } from 'react';

export interface NotificationSettings {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  toastNotificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  browserNotificationsEnabled: true,
  toastNotificationsEnabled: true,
};

const STORAGE_KEY = 'notification_settings';

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Error parsing notification settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleSound = useCallback(() => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
  }, [settings.soundEnabled, updateSettings]);

  const toggleBrowserNotifications = useCallback(() => {
    updateSettings({ browserNotificationsEnabled: !settings.browserNotificationsEnabled });
  }, [settings.browserNotificationsEnabled, updateSettings]);

  const toggleToastNotifications = useCallback(() => {
    updateSettings({ toastNotificationsEnabled: !settings.toastNotificationsEnabled });
  }, [settings.toastNotificationsEnabled, updateSettings]);

  return {
    settings,
    updateSettings,
    toggleSound,
    toggleBrowserNotifications,
    toggleToastNotifications,
  };
};

// Helper to get settings synchronously (for use in other hooks)
export const getNotificationSettings = (): NotificationSettings => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
};
