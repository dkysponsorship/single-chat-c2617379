import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastMessage?: string;
  unreadCount?: number;
}

interface FriendListProps {
  friends: Friend[];
  selectedFriend: string | null;
  onSelectFriend: (friendId: string) => void;
  className?: string;
}

export const FriendList = ({ 
  friends, 
  selectedFriend, 
  onSelectFriend, 
  className 
}: FriendListProps) => {
  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Friends</h2>
        <p className="text-sm text-muted-foreground">
          {friends.filter(f => f.isOnline).length} online
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {friends.map((friend) => (
            <div
              key={friend.id}
              onClick={() => onSelectFriend(friend.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer smooth-transition hover:bg-accent/50",
                selectedFriend === friend.id && "bg-accent"
              )}
            >
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={friend.avatar} alt={friend.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {friend.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                    friend.isOnline ? "bg-status-online online-pulse" : "bg-status-offline"
                  )}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{friend.name}</p>
                  {friend.unreadCount && friend.unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="text-xs px-1.5 py-0.5 h-5 min-w-[1.25rem] rounded-full"
                    >
                      {friend.unreadCount > 99 ? "99+" : friend.unreadCount}
                    </Badge>
                  )}
                </div>
                {friend.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate">
                    {friend.lastMessage}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};