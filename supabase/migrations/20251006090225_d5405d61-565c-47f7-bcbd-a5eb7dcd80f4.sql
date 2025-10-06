-- Add columns to support edit and selective deletion
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS deleted_for uuid[],
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_deleted_for ON public.messages USING gin(deleted_for);

-- Update the messages view policy to exclude messages deleted by current user
DROP POLICY IF EXISTS "Users can view messages in chats they're part of" ON public.messages;

CREATE POLICY "Users can view messages in chats they're part of"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM friendships
    WHERE (
      (friendships.user1_id = auth.uid() OR friendships.user2_id = auth.uid())
      AND (
        messages.chat_id = (friendships.user1_id::text || '_' || friendships.user2_id::text)
        OR messages.chat_id = (friendships.user2_id::text || '_' || friendships.user1_id::text)
      )
    )
  )
  AND (deleted_for IS NULL OR NOT (auth.uid() = ANY(deleted_for)))
);

-- Add policy to allow users to update their own messages (for editing)
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);