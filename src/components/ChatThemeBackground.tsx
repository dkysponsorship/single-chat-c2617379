 import { useMemo } from 'react';
 import { ChatTheme } from '@/styles/chatThemes';
 
 interface ChatThemeBackgroundProps {
   theme: ChatTheme;
 }
 
 export const ChatThemeBackground = ({ theme }: ChatThemeBackgroundProps) => {
   const animatedObjects = useMemo(() => {
     if (!theme.hasAnimation || !theme.objects || !theme.objectCount) {
       return null;
     }
 
     return Array.from({ length: theme.objectCount }, (_, i) => {
       const object = theme.objects![i % theme.objects!.length];
       const left = Math.random() * 100;
       const delay = Math.random() * 8;
       const duration = 6 + Math.random() * 6;
       const size = 0.6 + Math.random() * 0.8;
 
       return (
         <div
           key={i}
           className={`chat-theme-object ${theme.animation}`}
           style={{
             left: `${left}%`,
             animationDelay: `${delay}s`,
             animationDuration: `${duration}s`,
             fontSize: `${size}rem`,
             opacity: 0.6 + Math.random() * 0.4,
           }}
         >
           {object}
         </div>
       );
     });
   }, [theme]);
 
   if (theme.key === 'default') {
     return null;
   }
 
   return (
     <div
       className="absolute inset-0 overflow-hidden pointer-events-none z-0"
       style={{ background: theme.background }}
     >
       {animatedObjects}
     </div>
   );
 };