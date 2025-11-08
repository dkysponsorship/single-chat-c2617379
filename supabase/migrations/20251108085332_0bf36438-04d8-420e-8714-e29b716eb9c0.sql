-- Add image_url column to messages table for photo sharing
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;