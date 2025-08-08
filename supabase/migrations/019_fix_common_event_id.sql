-- Fix the register_wallet_user function to include common_event_id

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.register_wallet_user(TEXT);

-- Create the function with common_event_id
CREATE FUNCTION public.register_wallet_user(input_wallet_address TEXT)
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
  common_event_id UUID;
BEGIN
  -- Check if account already exists using explicit table reference
  IF EXISTS (SELECT 1 FROM public.user_accounts WHERE public.user_accounts.wallet_address = input_wallet_address) THEN
    RAISE EXCEPTION 'Wallet account already exists: %', input_wallet_address;
  END IF;

  -- Generate username and common event ID
  new_username := 'user_' || substr(md5(random()::text), 1, 8);
  common_event_id := gen_random_uuid();

  -- Insert user account
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

  -- Record the signup bonus transaction with common_event_id
  INSERT INTO public.point_transactions (
    affected_user_id,
    transaction_key,
    affected_balance,
    amount,
    common_event_id,
    details
  ) VALUES (
    new_account_id,
    'RECEIVED_BONUS_FOR_CREATING_NEW_ACCOUNT',
    'FREE',
    signup_bonus,
    common_event_id,
    jsonb_build_object('wallet_address', input_wallet_address, 'source', 'wallet_signup')
  );

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
GRANT EXECUTE ON FUNCTION public.register_wallet_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_wallet_user(TEXT) TO service_role; 