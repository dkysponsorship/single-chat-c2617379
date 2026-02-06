import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Palette } from 'lucide-react';
import { Friend } from './FriendList';
import { ChatThemeSelector } from './ChatThemeSelector';
import { ChatTheme } from '@/styles/chatThemes';
import { cn } from '@/lib/utils';

interface ChatProfileDrawerProps {
  friend: Friend;
  currentTheme: ChatTheme;
  customImageUrl?: string | null;
  onSelectTheme: (themeKey: string) => void;
  onSelectCustomImage: (file: File) => void;
  children: React.ReactNode;
}

export const ChatProfileDrawer = ({
  friend,
  currentTheme,
  customImageUrl,
  onSelectTheme,
  onSelectCustomImage,
  children,
}: ChatProfileDrawerProps) => {
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  const handleThemeSelect = (themeKey: string) => {
    onSelectTheme(themeKey);
    setShowThemeSelector(false);
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="pb-safe">
        <DrawerHeader className="text-center pb-0">
          <DrawerTitle className="sr-only">Profile</DrawerTitle>
        </DrawerHeader>

        {!showThemeSelector ? (
          <div className="flex flex-col items-center px-4 pb-6">
            {/* Friend Avatar */}
            <div className="relative mb-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={friend.avatar} alt={friend.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                  {friend.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-background',
                 friend.isOnline ? 'bg-[hsl(var(--online-status))]' : 'bg-muted'
                )}
              />
            </div>

            {/* Friend Name */}
            <h2 className="text-xl font-semibold mb-1">{friend.name}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {friend.isOnline ? 'Active now' : 'Offline'}
            </p>

            {/* Theme Button */}
            <Button
              variant="outline"
              className="w-full max-w-xs gap-2"
              onClick={() => setShowThemeSelector(true)}
            >
              <Palette className="w-4 h-4" />
              <span>Change Theme</span>
              <span className="ml-auto">
                {customImageUrl ? '🖼️' : currentTheme.emoji}
              </span>
            </Button>
          </div>
        ) : (
          <div className="pb-4">
            <div className="flex items-center justify-between px-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowThemeSelector(false)}
              >
                ← Back
              </Button>
              <h3 className="font-semibold">Choose Theme</h3>
              <div className="w-16" />
            </div>
            <ChatThemeSelector
              currentTheme={currentTheme}
              customImageUrl={customImageUrl}
              onSelectTheme={handleThemeSelect}
              onSelectCustomImage={onSelectCustomImage}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
