 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { getThemeByKey, ChatTheme, chatThemes } from '@/styles/chatThemes';
 
 export const useChatTheme = (chatId: string, userId: string) => {
   const [currentTheme, setCurrentTheme] = useState<ChatTheme>(chatThemes[0]);
   const [isLoading, setIsLoading] = useState(true);
 
   // Fetch theme from database
   useEffect(() => {
     const fetchTheme = async () => {
       if (!chatId || !userId) return;
       
       try {
         const { data, error } = await supabase
           .from('chat_themes')
           .select('theme_key')
           .eq('chat_id', chatId)
           .eq('user_id', userId)
           .maybeSingle();
 
         if (!error && data) {
           setCurrentTheme(getThemeByKey(data.theme_key));
         }
       } catch (err) {
         console.error('Error fetching chat theme:', err);
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchTheme();
   }, [chatId, userId]);
 
   // Save theme to database
   const setTheme = useCallback(async (themeKey: string) => {
     if (!chatId || !userId) return;
 
     const newTheme = getThemeByKey(themeKey);
     setCurrentTheme(newTheme);
 
     try {
       const { error } = await supabase
         .from('chat_themes')
         .upsert(
           {
             chat_id: chatId,
             user_id: userId,
             theme_key: themeKey,
             updated_at: new Date().toISOString(),
           },
           {
             onConflict: 'chat_id,user_id',
           }
         );
 
       if (error) {
         console.error('Error saving chat theme:', error);
       }
     } catch (err) {
       console.error('Error saving chat theme:', err);
     }
   }, [chatId, userId]);
 
   return {
     currentTheme,
     setTheme,
     isLoading,
     allThemes: chatThemes,
   };
 };