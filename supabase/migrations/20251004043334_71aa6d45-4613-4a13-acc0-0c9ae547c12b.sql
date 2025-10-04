-- Fix profile visibility for authenticated users to enable user search
-- Drop the existing policies that might be interfering
DROP POLICY IF EXISTS "Anyone can view basic profile info" ON profiles;

-- Create policy that allows authenticated users to search and view all profiles  
CREATE POLICY "Authenticated users can view all profiles" ON profiles
  FOR SELECT 
  TO authenticated
  USING (true);