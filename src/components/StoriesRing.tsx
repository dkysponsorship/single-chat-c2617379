import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserStories } from "@/services/stories";
import { Plus } from "lucide-react";

interface StoriesRingProps {
  userStories: UserStories;
  onClick: () => void;
  isCurrentUser?: boolean;
}

export const StoriesRing = ({ userStories, onClick, isCurrentUser }: StoriesRingProps) => {
  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={onClick}>
      <div className="relative">
        {isCurrentUser ? (
          <div className="relative">
            <Avatar className="w-16 h-16 ring-2 ring-primary">
              <AvatarImage src={userStories.avatar_url} />
              <AvatarFallback>{userStories.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center ring-2 ring-background">
              <Plus className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        ) : (
          <Avatar
            className={`w-16 h-16 ring-2 ${
              userStories.has_viewed ? 'ring-muted' : 'ring-primary'
            }`}
          >
            <AvatarImage src={userStories.avatar_url} />
            <AvatarFallback>{userStories.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <p className="text-xs text-center max-w-[70px] truncate">
        {isCurrentUser ? 'Your story' : userStories.username}
      </p>
    </div>
  );
};
