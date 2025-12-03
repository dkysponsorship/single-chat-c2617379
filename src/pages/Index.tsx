import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthScreen } from "@/components/AuthScreen";
import { getCurrentUser } from "@/services/supabase";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      const user = await getCurrentUser();
      if (user) {
        // User already logged in, redirect to feed
        localStorage.setItem("currentUser", JSON.stringify(user));
        navigate("/feed");
      } else {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (user: any) => {
    // Fetch latest profile data from Supabase
    const latestProfile = await getCurrentUser();
    const profileToStore = latestProfile || user;
    
    // Store user in localStorage for persistence
    localStorage.setItem("currentUser", JSON.stringify(profileToStore));
    navigate("/feed");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <AuthScreen onLogin={handleLogin} />;
};

export default Index;
