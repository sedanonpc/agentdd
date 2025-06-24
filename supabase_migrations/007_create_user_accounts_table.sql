-- Create user_accounts table
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  email TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reserved_dare_points DECIMAL(18,8) DEFAULT 0,
  free_dare_points DECIMAL(18,8) DEFAULT 500
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id 
ON public.user_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_accounts_free_dare_points
ON public.user_accounts(free_dare_points);

CREATE INDEX IF NOT EXISTS idx_user_accounts_reserved_dare_points
ON public.user_accounts(reserved_dare_points);

-- Enable Row Level Security
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view their own account"
  ON user_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account"
  ON user_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account"
  ON user_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.user_accounts IS 'User accounts with DARE points information';
COMMENT ON COLUMN public.user_accounts.reserved_dare_points IS 'DARE Points that are reserved (e.g., held in escrow) and can no longer be spent';
COMMENT ON COLUMN public.user_accounts.free_dare_points IS 'DARE Points that are not yet reserved and can still be spent'; 