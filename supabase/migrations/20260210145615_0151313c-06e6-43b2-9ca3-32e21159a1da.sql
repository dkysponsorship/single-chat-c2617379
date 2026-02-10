
-- Create call_signals table for WebRTC signaling
CREATE TABLE public.call_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id text NOT NULL,
  caller_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  signal_type text NOT NULL,
  signal_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'calling',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- RLS: caller and receiver can view
CREATE POLICY "Users can view their own calls"
ON public.call_signals FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- RLS: caller can insert
CREATE POLICY "Users can create calls"
ON public.call_signals FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- RLS: both can update (for answer/end)
CREATE POLICY "Call participants can update"
ON public.call_signals FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- RLS: both can delete
CREATE POLICY "Call participants can delete"
ON public.call_signals FOR DELETE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for call_signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Add location columns to messages table
ALTER TABLE public.messages ADD COLUMN location_lat double precision;
ALTER TABLE public.messages ADD COLUMN location_lng double precision;
ALTER TABLE public.messages ADD COLUMN location_address text;
