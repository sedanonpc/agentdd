-- Fix foreign key constraint for wallet users
-- The point_transactions table expects affected_user_id to reference auth.users.id
-- But wallet users don't have auth.users entries, so we need to make this nullable

-- First, let's check if we can make the foreign key nullable
-- If not, we'll need to create a different approach

-- Option 1: Make the foreign key nullable (if possible)
ALTER TABLE public.point_transactions 
ALTER COLUMN affected_user_id DROP NOT NULL;

-- Option 2: If the above doesn't work, we'll need to modify the constraint
-- Let's also create a function that handles wallet users properly

-- Create a new function that doesn't create point_transactions for wallet users
-- (since they don't have auth.users entries)
CREATE OR REPLACE FUNCTION public.register_wallet_user_simple(input_wallet_address TEXT)
RETURNS TABLE(
  id UUID,
  wallet_address TEXT,
  username TEXT,
  free_points DECIMAL(18,8),
  reserved_points DECIMAL(18,8),
  total_points DECIMAL(18,8)
) AS $$
DECLARE
  signup_bonus DECIMAL(18,8) := 500;
  new_account_id UUID;
  new_username TEXT;
BEGIN
  -- Check if account already exists
  IF EXISTS (SELECT 1 FROM public.user_accounts WHERE public.user_accounts.wallet_address = input_wallet_address) THEN
    RAISE EXCEPTION 'Wallet account already exists: %', input_wallet_address;
  END IF;

  -- Generate username
  new_username := 'user_' || substr(md5(random()::text), 1, 8);

  -- Insert user account only (no point_transactions for now)
  INSERT INTO public.user_accounts (
    wallet_address,
    username,
    free_points,
    reserved_points,
    created_at,
    updated_at
  ) VALUES (
    input_wallet_address,
    new_username,
    signup_bonus,
    0,
    NOW(),
    NOW()
  ) RETURNING public.user_accounts.id INTO new_account_id;

  -- Return the created account
  RETURN QUERY
  SELECT 
    public.user_accounts.id,
    public.user_accounts.wallet_address,
    public.user_accounts.username,
    public.user_accounts.free_points,
    public.user_accounts.reserved_points,
    public.user_accounts.total_points
  FROM public.user_accounts
  WHERE public.user_accounts.id = new_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.register_wallet_user_simple(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_wallet_user_simple(TEXT) TO service_role; 