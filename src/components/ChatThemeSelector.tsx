 import { Check } from 'lucide-react';
 import { ChatTheme, chatThemes } from '@/styles/chatThemes';
 import { cn } from '@/lib/utils';
 
 interface ChatThemeSelectorProps {
   currentTheme: ChatTheme;
   onSelectTheme: (themeKey: string) => void;
 }
 
 export const ChatThemeSelector = ({
   currentTheme,
   onSelectTheme,
 }: ChatThemeSelectorProps) => {
   return (
     <div className="grid grid-cols-3 gap-3 p-4">
       {chatThemes.map((theme) => (
         <button
           key={theme.key}
           onClick={() => onSelectTheme(theme.key)}
           className={cn(
             'relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200',
             'border-2',
             currentTheme.key === theme.key
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
             
             {/* Animated preview indicator */}
             {theme.hasAnimation && (
               <div className="absolute top-1 right-1 text-xs opacity-80">
                 {theme.objects?.[0]}
               </div>
             )}
           </div>
 
           {/* Theme Name + Emoji */}
           <div className="flex items-center gap-1.5">
             <span className="text-sm">{theme.emoji}</span>
             <span className="text-xs font-medium truncate">{theme.name}</span>
           </div>
 
           {/* Selected Checkmark */}
           {currentTheme.key === theme.key && (
             <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
               <Check className="w-3 h-3 text-primary-foreground" />
             </div>
           )}
         </button>
       ))}
     </div>
   );
 };