import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getThemeByKey, ChatTheme, chatThemes } from '@/styles/chatThemes';

export const useChatTheme = (chatId: string, userId: string) => {
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>(chatThemes[0]);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch theme from database
  useEffect(() => {
    const fetchTheme = async () => {
      if (!chatId || !userId) return;
      
      try {
        const { data, error } = await supabase
          .from('chat_themes')
          .select('theme_key, custom_image_url')
          .eq('chat_id', chatId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          setCurrentTheme(getThemeByKey(data.theme_key));
          setCustomImageUrl(data.custom_image_url || null);
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
    
    // Clear custom image when selecting a preset theme
    if (themeKey !== 'custom') {
      setCustomImageUrl(null);
    }

    try {
      const { error } = await supabase
        .from('chat_themes')
        .upsert(
          {
            chat_id: chatId,
            user_id: userId,
            theme_key: themeKey,
            custom_image_url: themeKey === 'custom' ? customImageUrl : null,
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
  }, [chatId, userId, customImageUrl]);

  // Upload and set custom image
  const setCustomImage = useCallback(async (file: File) => {
    if (!chatId || !userId) return;

    try {
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${chatId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-wallpapers')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Error uploading wallpaper:', uploadError);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-wallpapers')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      setCustomImageUrl(imageUrl);

      // Save to database with 'custom' theme key
      const { error: dbError } = await supabase
        .from('chat_themes')
        .upsert(
          {
            chat_id: chatId,
            user_id: userId,
            theme_key: 'custom',
            custom_image_url: imageUrl,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'chat_id,user_id',
          }
        );

      if (dbError) {
        console.error('Error saving custom theme:', dbError);
      }
    } catch (err) {
      console.error('Error setting custom image:', err);
    }
  }, [chatId, userId]);

  return {
    currentTheme,
    customImageUrl,
    setTheme,
    setCustomImage,
    isLoading,
    allThemes: chatThemes,
  };
};
