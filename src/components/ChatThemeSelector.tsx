import { useRef } from 'react';
import { Check, ImagePlus } from 'lucide-react';
import { ChatTheme, chatThemes } from '@/styles/chatThemes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatThemeSelectorProps {
  currentTheme: ChatTheme;
  customImageUrl?: string | null;
  onSelectTheme: (themeKey: string) => void;
  onSelectCustomImage: (file: File) => void;
}

export const ChatThemeSelector = ({
  currentTheme,
  customImageUrl,
  onSelectTheme,
  onSelectCustomImage,
}: ChatThemeSelectorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectCustomImage(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isCustomActive = !!customImageUrl;

  return (
    <div className="p-4 space-y-4">
      {/* Custom Image Upload Button */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          variant="outline"
          className="w-full h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          {customImageUrl ? (
            <div className="relative w-full">
              <img
                src={customImageUrl}
                alt="Current wallpaper"
                className="w-full h-24 object-cover rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                <div className="flex items-center gap-2 text-white">
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-sm font-medium">Change Wallpaper</span>
                </div>
              </div>
              {isCustomActive && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ) : (
            <>
              <ImagePlus className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium">Choose from Gallery</span>
            </>
          )}
        </Button>
      </div>

      {/* Preset Themes Grid */}
      <div className="grid grid-cols-3 gap-3">
        {chatThemes.map((theme) => {
          const isActive = currentTheme.key === theme.key && !customImageUrl;
          
          return (
            <button
              key={theme.key}
              onClick={() => onSelectTheme(theme.key)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200',
                'border-2',
                isActive
                  ? 'border-primary bg-primary/10 scale-105'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-accent'
              )}
            >
              {/* Theme Preview */}
              <div
                className="w-full h-16 rounded-lg overflow-hidden relative"
                style={{
                  background: theme.background === 'transparent' 
                    ? 'hsl(var(--background))' 
                    : theme.background,
                }}
              >
                {/* Mini message bubbles preview */}
                <div className="absolute inset-0 flex flex-col justify-center items-center gap-1 p-2">
                  <div className="w-8 h-2 rounded-full bg-primary/80 self-end" />
                  <div className="w-10 h-2 rounded-full bg-muted self-start" />
                </div>
              </div>

              {/* Theme Name + Emoji */}
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{theme.emoji}</span>
                <span className="text-xs font-medium truncate">{theme.name}</span>
              </div>

              {/* Selected Checkmark */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
