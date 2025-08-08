-- Fix RLS policies for wallet authentication
-- This allows anonymous users to access wallet functions and tables

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can access their account data" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can access their transaction data" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.point_transactions;

-- Create permissive policies for wallet authentication
CREATE POLICY "Allow wallet user access" ON public.user_accounts
FOR ALL USING (
  -- Allow access to wallet users
  wallet_address IS NOT NULL OR
  -- Allow authenticated users
  (auth.uid() IS NOT NULL AND auth.role() = 'authenticated') OR
  -- Allow service role
  auth.role() = 'service_role'
);

CREATE POLICY "Allow wallet transaction access" ON public.point_transactions
FOR ALL USING (
  -- Allow access to wallet transactions
  affected_user_id IS NOT NULL OR
  -- Allow authenticated users
  (auth.uid() IS NOT NULL AND auth.role() = 'authenticated') OR
  -- Allow service role
  auth.role() = 'service_role'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_accounts TO anon;
GRANT ALL ON public.user_accounts TO authenticated;
GRANT ALL ON public.point_transactions TO anon;
GRANT ALL ON public.point_transactions TO authenticated;

-- Also grant to service role
GRANT ALL ON public.user_accounts TO service_role;
GRANT ALL ON public.point_transactions TO service_role; 