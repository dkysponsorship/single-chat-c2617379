import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, Check } from "lucide-react";
import { searchUsers, sendFriendRequest, getCurrentUser } from "@/services/supabase";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";

export const UserSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() && currentUser) {
      const results = await searchUsers(query.trim(), currentUser.id);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSendRequest = async (userId: string) => {
    if (!currentUser) return;
    
    const success = await sendFriendRequest(currentUser.id, userId);
    if (success) {
      setSentRequests(prev => new Set([...prev, userId]));
      toast({
        title: "Friend request sent!",
        description: "Your friend request has been sent successfully.",
      });
    } else {
      toast({
        title: "Request failed",
        description: "Unable to send friend request. It may already exist.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Search className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search Users</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Search by username or name..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {searchResults.length === 0 && searchQuery ? (
              <p className="text-muted-foreground text-center py-4">
                No users found
              </p>
            ) : (
              searchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {user.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground mt-1">{user.bio}</p>
                      )}
                    </div>
                  </div>
                  
                  {sentRequests.has(user.id) ? (
                    <Button variant="ghost" size="sm" disabled>
                      <Check className="w-4 h-4 mr-1" />
                      Sent
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSendRequest(user.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};