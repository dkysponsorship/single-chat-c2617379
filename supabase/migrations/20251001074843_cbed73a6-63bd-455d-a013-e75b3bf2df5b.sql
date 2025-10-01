-- Drop the overly permissive policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create a security definer function to check if two users are friends
-- Using SECURITY DEFINER prevents recursive RLS issues
CREATE OR REPLACE FUNCTION public.are_friends(_user1_id uuid, _user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE (user1_id = _user1_id AND user2_id = _user2_id)
       OR (user1_id = _user2_id AND user2_id = _user1_id)
  )
$$;

-- Create new RLS policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create new RLS policy: Users can view profiles of their friends
CREATE POLICY "Users can view friends profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.are_friends(auth.uid(), id));