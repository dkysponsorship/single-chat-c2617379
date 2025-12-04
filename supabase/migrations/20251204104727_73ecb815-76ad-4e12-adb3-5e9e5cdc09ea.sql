-- Set replica identity to full to capture complete row data during updates (including read_at)
ALTER TABLE public.messages REPLICA IDENTITY FULL;