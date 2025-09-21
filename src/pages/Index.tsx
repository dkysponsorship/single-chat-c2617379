import { useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { ChatApp } from "@/components/ChatApp";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const handleLogin = (username: string) => {
    setCurrentUser(username);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <ChatApp 
      currentUser={currentUser} 
      onLogout={handleLogout} 
    />
  );
};

export default Index;
