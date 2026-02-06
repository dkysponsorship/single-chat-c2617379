import { ChatTheme } from '@/styles/chatThemes';

interface ChatThemeBackgroundProps {
  theme: ChatTheme;
  customImageUrl?: string | null;
}

export const ChatThemeBackground = ({ theme, customImageUrl }: ChatThemeBackgroundProps) => {
  // If custom image is set, show that
  if (customImageUrl) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <img
          src={customImageUrl}
          alt="Chat background"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Default theme - no background
  if (theme.key === 'default') {
    return null;
  }

  // Gradient themes
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      style={{ background: theme.background }}
    />
  );
};
