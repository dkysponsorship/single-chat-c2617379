import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthScreen } from "@/components/AuthScreen";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = (user: any) => {
    setCurrentUser(user.username || user.displayName);
    // Store user in sessionStorage so other pages can access it
    sessionStorage.setItem("currentUser", JSON.stringify(user));
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
