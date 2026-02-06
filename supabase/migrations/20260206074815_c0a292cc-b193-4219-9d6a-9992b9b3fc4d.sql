-- Add custom_image_url column to chat_themes
ALTER TABLE chat_themes 
ADD COLUMN custom_image_url TEXT;

-- Create chat-wallpapers bucket for storing user uploaded wallpapers
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-wallpapers', 'chat-wallpapers', true);

-- Allow authenticated users to upload their own wallpapers
CREATE POLICY "Users can upload their own wallpapers"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-wallpapers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own wallpapers
CREATE POLICY "Users can update their own wallpapers"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'chat-wallpapers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own wallpapers
CREATE POLICY "Users can delete their own wallpapers"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'chat-wallpapers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to wallpapers
CREATE POLICY "Public wallpaper access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-wallpapers');