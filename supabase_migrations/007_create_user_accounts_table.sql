-- Create user_accounts table
CREATE TABLE IF NOT EXISTS public.user_accounts (
  account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id UUID REFERENCES auth.users(id) NOT NULL,
  email TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  provisioned_points INTEGER DEFAULT 0,
  unprovisioned_points INTEGER DEFAULT 500
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_accounts_supabase_user_id 
ON public.user_accounts(supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_user_accounts_unprovisioned_points
ON public.user_accounts(unprovisioned_points);

CREATE INDEX IF NOT EXISTS idx_user_accounts_provisioned_points
ON public.user_accounts(provisioned_points);

-- Add policies
CREATE POLICY "Users can view their own account"
  ON user_accounts
  FOR SELECT
  USING (auth.uid() = supabase_user_id);

CREATE POLICY "Users can insert their own account"
  ON user_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = supabase_user_id);

CREATE POLICY "Users can update their own account"
  ON user_accounts
  FOR UPDATE
  USING (auth.uid() = supabase_user_id);

-- Add comments
COMMENT ON TABLE public.user_accounts IS 'User accounts with DARE points information';
COMMENT ON COLUMN public.user_accounts.provisioned_points IS 'DARE Points that are reserved (e.g., held in escrow) and can no longer be spent';
COMMENT ON COLUMN public.user_accounts.unprovisioned_points IS 'DARE Points that are not yet reserved and can still be spent'; 