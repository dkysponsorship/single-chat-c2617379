-- Add reply_to column to messages table to support reply/quote functionality
ALTER TABLE public.messages ADD COLUMN reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL;