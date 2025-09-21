import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, Users } from "lucide-react";
import { getFriendRequests, respondToFriendRequest, getCurrentUser } from "@/data/mockData";
import { FriendRequest } from "@/types/user";
import { useToast } from "@/hooks/use-toast";

export const FriendRequests = () => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const currentUser = getCurrentUser();

  const loadFriendRequests = () => {
    if (currentUser) {
      const requests = getFriendRequests(currentUser.id);
      setFriendRequests(requests);
    }
  };

  useEffect(() => {
    loadFriendRequests();
  }, [currentUser]);

  const handleRequest = async (requestId: string, accept: boolean) => {
    setLoading(true);
    const success = respondToFriendRequest(requestId, accept);
    
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
    req.toUserId === currentUser?.id && req.status === 'pending'
  );
  
  const sentRequests = friendRequests.filter(req => 
    req.fromUserId === currentUser?.id && req.status === 'pending'
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
                      <AvatarImage src={request.fromUser.avatar} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {request.fromUser.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.fromUser.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{request.fromUser.username}</p>
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
                      <AvatarImage src={request.toUser.avatar} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {request.toUser.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.toUser.displayName}</p>
                      <p className="text-sm text-muted-foreground">@{request.toUser.username}</p>
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