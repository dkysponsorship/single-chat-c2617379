export interface ChatTheme {
  key: string;
  name: string;
  emoji: string;
  background: string;
  hasAnimation: false;
}

export const chatThemes: ChatTheme[] = [
  {
    key: 'default',
    name: 'Default',
    emoji: '⚪',
    background: 'transparent',
    hasAnimation: false,
  },
  {
    key: 'minimal-light',
    name: 'Minimal Light',
    emoji: '🤍',
    background: 'linear-gradient(180deg, hsl(0 0% 98%) 0%, hsl(0 0% 94%) 100%)',
    hasAnimation: false,
  },
  {
    key: 'minimal-dark',
    name: 'Minimal Dark',
    emoji: '🖤',
    background: 'linear-gradient(180deg, hsl(240 10% 12%) 0%, hsl(240 10% 8%) 100%)',
    hasAnimation: false,
  },
  {
    key: 'lavender',
    name: 'Lavender',
    emoji: '💜',
    background: 'linear-gradient(180deg, hsl(270 50% 95%) 0%, hsl(280 60% 90%) 100%)',
    hasAnimation: false,
  },
];

export const getThemeByKey = (key: string): ChatTheme => {
  return chatThemes.find(t => t.key === key) || chatThemes[0];
};
