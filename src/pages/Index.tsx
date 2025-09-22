import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthScreen } from "@/components/AuthScreen";
import { getUserProfile } from "@/services/firebase";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (user: any) => {
    setCurrentUser(user.username || user.displayName);
    
    // Fetch latest profile data from Firebase
    const latestProfile = await getUserProfile(user.id);
    const profileToStore = latestProfile || user;
    
    // Store user in sessionStorage so other pages can access it
    sessionStorage.setItem("currentUser", JSON.stringify(profileToStore));
    navigate("/home");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("currentUser");
    navigate("/");
  };

  return <AuthScreen onLogin={handleLogin} />;
};

export default Index;
