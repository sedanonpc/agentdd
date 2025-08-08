-- Simple wallet user registration
-- This creates a basic function to register wallet users with signup bonus

-- Create a simple function to register wallet users
CREATE OR REPLACE FUNCTION public.register_wallet_user(input_wallet_address TEXT)
RETURNS TABLE(
  id UUID,
  wallet_address TEXT,
  username TEXT,
  free_points DECIMAL(18,8),
  reserved_points DECIMAL(18,8),
  total_points DECIMAL(18,8)
) AS $$
DECLARE
  signup_bonus DECIMAL(18,8) := 500; -- Default signup bonus
  new_account public.user_accounts;
BEGIN
  -- Check if account already exists
  IF EXISTS (SELECT 1 FROM public.user_accounts WHERE wallet_address = input_wallet_address) THEN
    RAISE EXCEPTION 'Wallet account already exists: %', input_wallet_address;
  END IF;

  -- Generate a unique username
  INSERT INTO public.user_accounts (
    wallet_address,
    username,
    free_points,
    reserved_points,
    created_at,
    updated_at
  ) VALUES (
    input_wallet_address,
    'user_' || substr(md5(random()::text), 1, 8),
    signup_bonus,
    0,
    NOW(),
    NOW()
  ) RETURNING * INTO new_account;

  -- Record the signup bonus transaction
  INSERT INTO public.point_transactions (
    affected_user_id,
    transaction_key,
    affected_balance,
    amount,
    details
  ) VALUES (
    new_account.id,
    'RECEIVED_BONUS_FOR_CREATING_NEW_ACCOUNT',
    'FREE',
    signup_bonus,
    jsonb_build_object('wallet_address', input_wallet_address, 'source', 'wallet_signup')
  );

  RETURN QUERY
  SELECT 
    new_account.id,
    new_account.wallet_address,
    new_account.username,
    new_account.free_points,
    new_account.reserved_points,
    new_account.total_points
  FROM public.user_accounts ua
  WHERE ua.id = new_account.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.register_wallet_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_wallet_user(TEXT) TO service_role;

-- Create a simple function to get wallet user account
CREATE OR REPLACE FUNCTION public.get_wallet_user(input_wallet_address TEXT)
RETURNS TABLE(
  id UUID,
  wallet_address TEXT,
  username TEXT,
  free_points DECIMAL(18,8),
  reserved_points DECIMAL(18,8),
  total_points DECIMAL(18,8)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id,
    ua.wallet_address,
    ua.username,
    ua.free_points,
    ua.reserved_points,
    ua.total_points
  FROM public.user_accounts ua
  WHERE ua.wallet_address = input_wallet_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_wallet_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_user(TEXT) TO service_role; 