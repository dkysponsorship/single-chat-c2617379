-- Create policy to allow message recipients to mark messages as read
-- This allows users to update read_at on messages where they are part of the chat and NOT the sender
CREATE POLICY "Recipients can mark messages as read" 
ON public.messages 
FOR UPDATE 
USING (
  -- User is part of this chat (chat_id contains their user ID)
  chat_id LIKE '%' || auth.uid()::text || '%'
  AND 
  -- User is NOT the sender (only recipient can mark as read)
  auth.uid() != sender_id
)
WITH CHECK (
  -- User is part of this chat
  chat_id LIKE '%' || auth.uid()::text || '%'
  AND 
  -- User is NOT the sender
  auth.uid() != sender_id
);