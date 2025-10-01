-- Add foreign key constraints from friend_requests to profiles
ALTER TABLE public.friend_requests 
  DROP CONSTRAINT IF EXISTS friend_requests_from_user_id_fkey,
  DROP CONSTRAINT IF EXISTS friend_requests_to_user_id_fkey;

ALTER TABLE public.friend_requests
  ADD CONSTRAINT friend_requests_from_user_id_fkey 
    FOREIGN KEY (from_user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT friend_requests_to_user_id_fkey 
    FOREIGN KEY (to_user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Add foreign key constraints from friendships to profiles
ALTER TABLE public.friendships
  DROP CONSTRAINT IF EXISTS friendships_user1_id_fkey,
  DROP CONSTRAINT IF EXISTS friendships_user2_id_fkey;

ALTER TABLE public.friendships
  ADD CONSTRAINT friendships_user1_id_fkey 
    FOREIGN KEY (user1_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT friendships_user2_id_fkey 
    FOREIGN KEY (user2_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- Add foreign key constraint from messages to profiles
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;