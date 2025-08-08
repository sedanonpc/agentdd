-- Add privy_id and ensure wallet_address column exists
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS privy_id TEXT UNIQUE;

-- Create or replace sync function called from client after Privy login
-- This function does NOT create rows (creation handled by auth trigger on signup).
-- It only updates the current authenticated user's profile with privy_id and wallet.
CREATE OR REPLACE FUNCTION public.sync_privy_user(
  p_privy_id TEXT,
  p_email TEXT,
  p_wallet TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update by authenticated user_id when available
  IF auth.uid() IS NOT NULL THEN
    UPDATE public.user_accounts
    SET 
      privy_id = COALESCE(p_privy_id, privy_id),
      email = COALESCE(p_email, email),
      wallet_address = COALESCE(p_wallet, wallet_address),
      updated_at = NOW(),
      last_login_at = NOW()
    WHERE user_id = auth.uid();
    RETURN;
  END IF;

  -- Fallback: update by email if user_id not present (edge case)
  IF p_email IS NOT NULL THEN
    UPDATE public.user_accounts
    SET 
      privy_id = COALESCE(p_privy_id, privy_id),
      wallet_address = COALESCE(p_wallet, wallet_address),
      updated_at = NOW(),
      last_login_at = NOW()
    WHERE email = p_email;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_privy_user(TEXT, TEXT, TEXT) TO authenticated;


