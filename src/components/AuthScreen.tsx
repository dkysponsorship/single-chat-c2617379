import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";
import { registerUser, loginUser } from "@/services/supabase";
import { useToast } from "@/hooks/use-toast";

interface AuthScreenProps {
  onLogin: (user: any) => void;
}

export const AuthScreen = ({ onLogin }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login flow
      if (!email.trim() || !password.trim()) {
        toast({
          title: "Login failed",
          description: "Please enter email and password.",
          variant: "destructive",
        });
        return;
      }

      const { user, error } = await loginUser(email.trim(), password);
      if (user) {
        onLogin(user);
      } else {
        toast({
          title: "Login failed",
          description: error || "Invalid email or password.",
          variant: "destructive",
        });
      }
    } else {
      // Register flow
      if (!username.trim() || !displayName.trim() || !email.trim() || !password.trim()) {
        toast({
          title: "Registration failed",
          description: "Please fill all fields.",
          variant: "destructive",
        });
        return;
      }

      const { user, error } = await registerUser(email.trim(), password, username.trim(), displayName.trim());
      if (user) {
        toast({
          title: "Account created!",
          description: "Welcome to ChatApp!",
        });
        onLogin(user);
      } else {
        toast({
          title: "Registration failed",
          description: error || "Failed to create account.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <MessageCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            ChatApp
          </h1>
          <p className="text-muted-foreground mt-2">Connect with friends instantly</p>
        </div>

        <Card className="backdrop-blur-sm border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isLogin ? "Welcome Back" : "Join ChatApp"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Sign in to continue chatting with your friends" 
                : "Create an account to start chatting"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your full name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLogin}
                    className="h-12 text-base"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                    className="h-12 text-base"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold message-sent border-0 transition-all duration-150 active:scale-95 active:opacity-80"
              >
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};