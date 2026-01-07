import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceProviderProps {
  children: ReactNode;
}

export const PresenceProvider: React.FC<PresenceProviderProps> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const presenceRef = useRef<boolean>(false);

  // Get user ID on mount and auth changes
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Manage presence
  useEffect(() => {
    if (!userId || presenceRef.current) return;
    presenceRef.current = true;

    // Set user online
    const setOnline = async () => {
      try {
        await supabase
          .from("profiles")
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq("id", userId);
      } catch (error) {
        console.error('Error setting online:', error);
      }
    };

    // Set user offline
    const setOffline = async () => {
      try {
        await supabase
          .from("profiles")
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq("id", userId);
      } catch (error) {
        console.error('Error setting offline:', error);
      }
    };

    // Set online on mount
    setOnline();

    // Update presence periodically (heartbeat every 30 seconds)
    const heartbeatInterval = setInterval(() => {
      setOnline();
    }, 30000);

    // Handle visibility change with debounce
    let visibilityTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      
      if (document.visibilityState === "visible") {
        setOnline();
      } else {
        // Delay offline status by 5 seconds to avoid flicker on quick tab switches
        visibilityTimeout = setTimeout(() => {
          setOffline();
        }, 5000);
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      // Attempt to set offline synchronously
      navigator.sendBeacon && navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        JSON.stringify({ is_online: false, last_seen: new Date().toISOString() })
      );
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      presenceRef.current = false;
      clearInterval(heartbeatInterval);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setOffline();
    };
  }, [userId]);

  return <>{children}</>;
};
