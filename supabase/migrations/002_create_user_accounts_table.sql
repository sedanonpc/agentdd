-- Migration: Create user_accounts table
-- This creates a user accounts table that stores wallet addresses and point balances

-- Create function to generate unique usernames with collision handling
CREATE OR REPLACE FUNCTION generate_unique_username()
RETURNS TEXT AS $$
DECLARE
  adjectives TEXT[] := ARRAY['Quick', 'Silent', 'Bold', 'Swift', 'Bright', 'Sharp', 'Cool', 'Smart'];
  nouns TEXT[] := ARRAY['Tiger', 'Eagle', 'Wolf', 'Shark', 'Hawk', 'Lion', 'Bear', 'Fox'];
  colors TEXT[] := ARRAY['Red', 'Blue', 'Green', 'Gold', 'Silver', 'Black', 'White', 'Purple'];
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Generate base username
  base_username := adjectives[1 + floor(random() * array_length(adjectives, 1))] || 
                   colors[1 + floor(random() * array_length(colors, 1))] || 
                   nouns[1 + floor(random() * array_length(nouns, 1))];
  
  final_username := base_username;
  
  -- Handle collisions with counter suffix
  WHILE EXISTS (SELECT 1 FROM public.user_accounts WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  
  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    wallet_address TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL DEFAULT generate_unique_username(),
    image_url TEXT,
    reserved_points DECIMAL(18,8) DEFAULT 0,
    free_points DECIMAL(18,8) DEFAULT 0,
    total_points DECIMAL(18,8) GENERATED ALWAYS AS (free_points + reserved_points) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_accounts_free_points
ON public.user_accounts(free_points);

CREATE INDEX IF NOT EXISTS idx_user_accounts_reserved_points
ON public.user_accounts(reserved_points);

CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id
ON public.user_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_accounts_wallet_address
ON public.user_accounts(wallet_address);

CREATE INDEX IF NOT EXISTS idx_user_accounts_email
ON public.user_accounts(email);

CREATE INDEX IF NOT EXISTS idx_user_accounts_username
ON public.user_accounts(username);

CREATE INDEX IF NOT EXISTS idx_user_accounts_total_points
ON public.user_accounts(total_points);

-- Enable Row Level Security
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own account with full details
CREATE POLICY "Users can view own account" ON public.user_accounts
FOR SELECT USING (
  auth.uid() = user_id OR 
  auth.uid()::text = wallet_address
);


-- RLS Policy: Users can update their own account
CREATE POLICY "Users can update own account" ON public.user_accounts
FOR UPDATE USING (
  auth.uid() = user_id OR 
  auth.uid()::text = wallet_address
);

-- RLS Policy: Allow account creation during signup
-- This is the critical policy for signup to work
CREATE POLICY "Allow account creation during signup" ON public.user_accounts
FOR INSERT WITH CHECK (
  -- Allow if the user_id matches the authenticated user
  auth.uid() = user_id OR
  -- Allow if inserting wallet-only account (for wallet-first users)
  (user_id IS NULL AND wallet_address IS NOT NULL) OR
  -- Allow service role (for server-side operations)
  auth.role() = 'service_role'
);

-- Add comments for documentation
COMMENT ON TABLE public.user_accounts IS 'User accounts with points information';
COMMENT ON COLUMN public.user_accounts.reserved_points IS 'Points that are reserved (e.g., held in escrow) and can no longer be spent';
COMMENT ON COLUMN public.user_accounts.free_points IS 'Points that are not yet reserved and can still be spent';
COMMENT ON COLUMN public.user_accounts.username IS 'Unique username for the user, auto-generated on account creation';
COMMENT ON COLUMN public.user_accounts.image_url IS 'URL to user profile image stored in Supabase Storage';
COMMENT ON COLUMN public.user_accounts.total_points IS 'Computed column: sum of free_points and reserved_points';

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.user_accounts TO authenticated; 