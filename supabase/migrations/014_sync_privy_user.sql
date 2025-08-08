-- Adds privy_id to user_accounts and creates RPC to sync Privy user on client login

-- 1) Schema changes
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS privy_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS last_privy_sync_at TIMESTAMPTZ;

-- 2) RPC to upsert/sync Privy user into our SoT and award daily login if eligible
CREATE OR REPLACE FUNCTION public.sync_privy_user(
  p_privy_id TEXT,
  p_email TEXT,
  p_wallet TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  wallet_address TEXT,
  free_points DECIMAL(18,8),
  reserved_points DECIMAL(18,8),
  total_points DECIMAL(18,8)
) AS $$
DECLARE
  existing public.user_accounts;
  target_user_id UUID;
  awarded_daily BOOLEAN;
BEGIN
  -- try to find existing by privy_id or email
  SELECT * INTO existing FROM public.user_accounts WHERE privy_id = p_privy_id;
  IF existing IS NULL AND p_email IS NOT NULL THEN
    SELECT * INTO existing FROM public.user_accounts WHERE email = p_email;
  END IF;

  IF existing IS NULL THEN
    -- create new account (signup bonus handled by existing trigger if user_id is present)
    target_user_id := gen_random_uuid();
    INSERT INTO public.user_accounts (
      id,
      user_id,
      email,
      wallet_address,
      privy_id,
      free_points,
      reserved_points,
      created_at,
      updated_points_at,
      updated_account_settings_at,
      updated_at,
      last_login_at
    ) VALUES (
      target_user_id,
      target_user_id,
      p_email,
      p_wallet,
      p_privy_id,
      500,  -- initial bonus for new account if not covered by other trigger
      0,
      NOW(), NOW(), NOW(), NOW(), NOW()
    );
  ELSE
    -- update existing linkage and wallet/email
    target_user_id := existing.user_id;
    UPDATE public.user_accounts
    SET
      email = COALESCE(p_email, email),
      wallet_address = COALESCE(p_wallet, wallet_address),
      privy_id = COALESCE(privy_id, p_privy_id),
      last_privy_sync_at = NOW(),
      updated_at = NOW()
    WHERE id = existing.id;
  END IF;

  -- award daily login if eligible
  PERFORM public.update_user_login(target_user_id);

  RETURN QUERY
  SELECT id, user_id, email, wallet_address, free_points, reserved_points, total_points
  FROM public.user_accounts
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_privy_user(TEXT, TEXT, TEXT) TO authenticated;

