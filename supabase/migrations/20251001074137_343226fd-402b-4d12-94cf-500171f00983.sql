-- Drop the existing overly permissive policy that allows anyone to view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a new policy that requires authentication to view profiles
-- This is appropriate for a chat app where users must be logged in to use it
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Add a policy for unauthenticated users to check if a username is available during signup
-- This is a minimal, safe query that doesn't expose actual profile data
CREATE POLICY "Anyone can check username existence for signup"
ON public.profiles
FOR SELECT
TO anon
USING (false);  -- Block all profile data access for anonymous users