-- Create voice-notes storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for voice-notes bucket
CREATE POLICY "Anyone can view voice notes"
ON storage.objects
FOR SELECT
USING (bucket_id = 'voice-notes');

CREATE POLICY "Users can upload their own voice notes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'voice-notes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own voice notes"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'voice-notes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add audio_url column to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS audio_url text;