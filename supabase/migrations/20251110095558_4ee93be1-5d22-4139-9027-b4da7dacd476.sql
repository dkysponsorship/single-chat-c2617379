-- Drop the existing public policy for stories
DROP POLICY IF EXISTS "Anyone can view non-expired stories" ON public.stories;

-- Create new policy: Users can only view their own stories and stories from friends
CREATE POLICY "Users can view friends stories"
ON public.stories
FOR SELECT
USING (
  expires_at > now() AND (
    auth.uid() = user_id OR 
    are_friends(auth.uid(), user_id)
  )
);