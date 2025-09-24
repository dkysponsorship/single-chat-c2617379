import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, Users } from "lucide-react";
import { getFriendRequests, respondToFriendRequest, getCurrentUser } from "@/services/supabase";
import { FriendRequest } from "@/types/user";
import { useToast } from "@/hooks/use-toast";

export const FriendRequests = () => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    if (currentUser) {
      unsubscribe = getFriendRequests(currentUser.id, (requests) => {
        setFriendRequests(requests);
      });
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  const loadFriendRequests = () => {
    if (currentUser) {
      getFriendRequests(currentUser.id, (requests) => {
        setFriendRequests(requests);
      });
    }
  };

  const handleRequest = async (requestId: string, accept: boolean) => {
    setLoading(true);
    const success = await respondToFriendRequest(requestId, accept);
    
    if (success) {
      toast({
        title: accept ? "Friend request accepted!" : "Friend request declined",
        description: accept ? "You are now friends!" : "Request has been declined.",
      });
      loadFriendRequests(); // Refresh the list
    } else {
      toast({
        title: "Error",
        description: "Failed to respond to friend request.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const receivedRequests = friendRequests.filter(req => 
    req.to_user_id === currentUser?.id && req.status === 'pending'
  );
  
  const sentRequests = friendRequests.filter(req => 
    req.from_user_id === currentUser?.id && req.status === 'pending'
  );

  if (receivedRequests.length === 0 && sentRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Friend Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No pending friend requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Friend Requests
          {(receivedRequests.length + sentRequests.length) > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {receivedRequests.length + sentRequests.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Received Requests */}
        {receivedRequests.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-sm text-muted-foreground">
              Received ({receivedRequests.length})
            </h4>
            <div className="space-y-2">
              {receivedRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.from_profile?.avatar_url} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {request.from_profile?.display_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.from_profile?.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{request.from_profile?.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequest(request.id, true)}
                      disabled={loading}
                      className="border-status-online text-status-online hover:bg-status-online hover:text-white"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequest(request.id, false)}
                      disabled={loading}
                      className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 text-sm text-muted-foreground">
              Sent ({sentRequests.length})
            </h4>
            <div className="space-y-2">
              {sentRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.to_profile?.avatar_url} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {request.to_profile?.display_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.to_profile?.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{request.to_profile?.username}</p>
                    </div>
                  </div>
                  
                  <Badge variant="secondary">Pending</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};