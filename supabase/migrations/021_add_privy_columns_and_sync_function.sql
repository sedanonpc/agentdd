-- Add privy_id and ensure wallet_address column exists
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS privy_id TEXT UNIQUE;

-- Create or replace sync function called from client after Privy login
CREATE OR REPLACE FUNCTION public.sync_privy_user(
  p_privy_id TEXT,
  p_email TEXT,
  p_wallet TEXT
)
RETURNS VOID AS $$
DECLARE
  existing_user RECORD;
BEGIN
  -- Try to find existing account by privy_id or email
  SELECT * INTO existing_user
  FROM public.user_accounts
  WHERE privy_id = p_privy_id OR (p_email IS NOT NULL AND email = p_email)
  LIMIT 1;

  IF existing_user IS NULL THEN
    -- Create a new auth user (email/password with dummy password = privy_id)
    -- Note: Supabase client on the frontend should sign in; here we only upsert profile
    INSERT INTO public.user_accounts (
      user_id, email, privy_id, wallet_address, username, free_points, reserved_points, created_at, updated_at, last_login_at
    ) VALUES (
      gen_random_uuid(),
      p_email,
      p_privy_id,
      p_wallet,
      generate_unique_username(),
      500, -- signup bonus on first sync
      0,
      NOW(), NOW(), NOW()
    )
    ON CONFLICT (privy_id) DO NOTHING;
  ELSE
    -- Update existing with latest email/wallet and bump last_login
    UPDATE public.user_accounts
    SET 
      email = COALESCE(p_email, email),
      wallet_address = COALESCE(p_wallet, wallet_address),
      updated_at = NOW(),
      last_login_at = NOW()
    WHERE id = existing_user.id;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_privy_user(TEXT, TEXT, TEXT) TO authenticated;


