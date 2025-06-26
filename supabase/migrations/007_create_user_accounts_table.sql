-- Migration: Create user_accounts table
-- This creates a user accounts table that stores wallet addresses and point balances

CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    wallet_address TEXT UNIQUE,
    reserved_points DECIMAL(18,8) DEFAULT 0,
    free_points DECIMAL(18,8) DEFAULT 500,
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

-- Enable Row Level Security
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see their own accounts
CREATE POLICY "Users can view own account" ON public.user_accounts
FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to update their own accounts
CREATE POLICY "Users can update own account" ON public.user_accounts
FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own accounts
CREATE POLICY "Users can insert own account" ON public.user_accounts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.user_accounts IS 'User accounts with points information';
COMMENT ON COLUMN public.user_accounts.reserved_points IS 'Points that are reserved (e.g., held in escrow) and can no longer be spent';
COMMENT ON COLUMN public.user_accounts.free_points IS 'Points that are not yet reserved and can still be spent'; 