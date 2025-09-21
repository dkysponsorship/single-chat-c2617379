import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";
import { getUserByUsername } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

interface AuthScreenProps {
  onLogin: (username: string, userId: string) => void;
}

export const AuthScreen = ({ onLogin }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login flow - more flexible for testing
      const user = getUserByUsername(username.trim());
      if (user) {
        onLogin(user.username, user.id);
      } else {
        // For testing mode, allow any username to login as a demo user
        if (username.trim()) {
          toast({
            title: "Demo Login",
            description: `Logging in as demo user: ${username.trim()}`,
          });
          onLogin(username.trim(), `demo_${Date.now()}`);
        } else {
          toast({
            title: "Login failed",
            description: "Please enter a username or select from test users above.",
            variant: "destructive",
          });
        }
      }
    } else {
      // Register flow - for demo, we'll just simulate registration
      if (username.trim() && displayName.trim()) {
        const existingUser = getUserByUsername(username.trim());
        if (existingUser) {
          toast({
            title: "Registration failed",
            description: "Username already exists. Please choose another.",
            variant: "destructive",
          });
        } else {
          // For demo purposes, we'll create a temporary user and login
          onLogin(username.trim(), `user_${Date.now()}`);
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full message-sent mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
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
            {isLogin && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Test usernames:</p>
                <div className="flex flex-wrap gap-1">
                  {["alice_j", "bob_smith", "carol_d", "david_w", "emma_brown", "john_doe"].map(username => (
                    <span 
                      key={username} 
                      className="text-xs px-2 py-1 bg-primary/20 text-primary rounded cursor-pointer hover:bg-primary/30"
                      onClick={() => setUsername(username)}
                    >
                      {username}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={isLogin ? "Enter your username" : "Choose a username"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                className="w-full h-12 text-base font-semibold message-sent border-0"
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