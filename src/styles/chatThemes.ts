 export interface ChatTheme {
   key: string;
   name: string;
   emoji: string;
   background: string;
   animation?: string;
   hasAnimation: boolean;
   objectCount?: number;
   objects?: string[];
 }
 
 export const chatThemes: ChatTheme[] = [
   // Simple Gradient Themes
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
   
   // Animated Object Themes
   {
     key: 'love',
     name: 'Love',
     emoji: '❤️',
     background: 'linear-gradient(180deg, hsl(350 100% 95%) 0%, hsl(340 80% 88%) 100%)',
     animation: 'floating-hearts',
     hasAnimation: true,
     objectCount: 15,
     objects: ['❤️', '💕', '💗', '💖', '💘'],
   },
   {
     key: 'galaxy',
     name: 'Galaxy',
     emoji: '🌌',
     background: 'linear-gradient(180deg, hsl(260 60% 15%) 0%, hsl(280 70% 8%) 100%)',
     animation: 'twinkling-stars',
     hasAnimation: true,
     objectCount: 30,
     objects: ['✨', '⭐', '💫'],
   },
   {
     key: 'ocean',
     name: 'Ocean',
     emoji: '🌊',
     background: 'linear-gradient(180deg, hsl(200 80% 70%) 0%, hsl(210 90% 50%) 100%)',
     animation: 'rising-bubbles',
     hasAnimation: true,
     objectCount: 20,
     objects: ['🫧', '💧', '🔵'],
   },
   {
     key: 'sky',
     name: 'Sky',
     emoji: '☁️',
     background: 'linear-gradient(180deg, hsl(200 80% 85%) 0%, hsl(210 70% 75%) 100%)',
     animation: 'drifting-clouds',
     hasAnimation: true,
     objectCount: 8,
     objects: ['☁️', '🌤️', '⛅'],
   },
   {
     key: 'neon',
     name: 'Neon',
     emoji: '💡',
     background: 'linear-gradient(135deg, hsl(280 100% 25%) 0%, hsl(320 100% 35%) 50%, hsl(260 100% 30%) 100%)',
     animation: 'glowing-particles',
     hasAnimation: true,
     objectCount: 25,
     objects: ['✦', '◆', '●'],
   },
   {
     key: 'sunset',
     name: 'Sunset',
     emoji: '🌅',
     background: 'linear-gradient(180deg, hsl(35 100% 70%) 0%, hsl(15 90% 60%) 50%, hsl(280 60% 45%) 100%)',
     animation: 'floating-rays',
     hasAnimation: true,
     objectCount: 12,
     objects: ['☀️', '🌤️', '✨'],
   },
   {
     key: 'forest',
     name: 'Forest',
     emoji: '🌲',
     background: 'linear-gradient(180deg, hsl(120 40% 75%) 0%, hsl(140 50% 35%) 100%)',
     animation: 'falling-leaves',
     hasAnimation: true,
     objectCount: 18,
     objects: ['🍃', '🌿', '🍀', '🌱'],
   },
   {
     key: 'celebration',
     name: 'Celebration',
     emoji: '🎉',
     background: 'linear-gradient(135deg, hsl(280 80% 60%) 0%, hsl(320 90% 55%) 50%, hsl(40 100% 60%) 100%)',
     animation: 'confetti',
     hasAnimation: true,
     objectCount: 30,
     objects: ['🎉', '🎊', '✨', '🎈', '⭐'],
   },
 ];
 
 export const getThemeByKey = (key: string): ChatTheme => {
   return chatThemes.find(t => t.key === key) || chatThemes[0];
 };