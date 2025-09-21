import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthScreen } from "@/components/AuthScreen";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    // Store user in sessionStorage so other pages can access it
    sessionStorage.setItem("currentUser", username);
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
