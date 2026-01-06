import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePresence = (userId: string | null) => {
  const presenceRef = useRef<boolean>(false);

  useEffect(() => {
    if (!userId || presenceRef.current) return;
    presenceRef.current = true;

    // Set user online
    const setOnline = async () => {
      await supabase
        .from("profiles")
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq("id", userId);
    };

    // Set user offline
    const setOffline = async () => {
      await supabase
        .from("profiles")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("id", userId);
    };

    // Set online on mount
    setOnline();

    // Update presence periodically (heartbeat)
    const heartbeatInterval = setInterval(() => {
      setOnline();
    }, 60000); // Every minute

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setOnline();
      } else {
        setOffline();
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status update
      const data = JSON.stringify({
        is_online: false,
        last_seen: new Date().toISOString()
      });
      
      // Fallback: try to set offline synchronously
      setOffline();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      presenceRef.current = false;
      clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setOffline();
    };
  }, [userId]);
};
