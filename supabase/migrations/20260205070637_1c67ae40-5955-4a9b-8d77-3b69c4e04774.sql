-- Create chat_themes table to store per-chat theme preferences
CREATE TABLE public.chat_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  theme_key TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_chat_user_theme UNIQUE (chat_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_themes ENABLE ROW LEVEL SECURITY;

-- Users can view their own theme preferences
CREATE POLICY "Users can view their own themes"
ON public.chat_themes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own theme preferences
CREATE POLICY "Users can create their own themes"
ON public.chat_themes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own theme preferences
CREATE POLICY "Users can update their own themes"
ON public.chat_themes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own theme preferences
CREATE POLICY "Users can delete their own themes"
ON public.chat_themes
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updating updated_at
CREATE TRIGGER update_chat_themes_updated_at
BEFORE UPDATE ON public.chat_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();