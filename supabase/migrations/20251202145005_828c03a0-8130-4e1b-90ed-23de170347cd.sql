-- Add read_at column to messages table for read receipts
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);
