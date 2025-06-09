-- SQL script to fix the DARE points structure in Supabase
-- Run this in the Supabase SQL Editor
-- IMPORTANT: Run each statement separately if you encounter errors

-- First, check if the user_profiles table exists and create it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
  ) THEN
    CREATE TABLE public.user_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) NOT NULL,
      dare_points INTEGER DEFAULT 500,
      wallet_address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END
$$;

-- Then run this to add the dare_points column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'dare_points'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN dare_points INTEGER DEFAULT 500;
  END IF;
END
$$;

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.dare_points IS 'DARE Points balance for the user, initialized at 500 for new accounts';

-- Create RPC function to ensure dare_points column exists
CREATE OR REPLACE FUNCTION public.ensure_dare_points_column()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'dare_points'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN dare_points INTEGER DEFAULT 500;
  END IF;
  
  RETURN true;
END;
$$;

-- Create RPC function to get user's DARE points
CREATE OR REPLACE FUNCTION public.get_user_dare_points(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points INTEGER;
BEGIN
  SELECT dare_points INTO points
  FROM public.user_profiles
  WHERE user_profiles.user_id = get_user_dare_points.user_id;
  
  IF points IS NULL THEN
    RETURN 500; -- Default value
  ELSE
    RETURN points;
  END IF;
END;
$$;

-- Create RPC function to update user's DARE points
CREATE OR REPLACE FUNCTION public.update_user_dare_points(user_id UUID, new_points INTEGER)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET dare_points = new_points
  WHERE user_profiles.user_id = update_user_dare_points.user_id;
  
  RETURN FOUND;
END;
$$;

-- Create RPC function to adjust user's DARE points (add or subtract)
CREATE OR REPLACE FUNCTION public.adjust_user_dare_points(user_id UUID, amount INTEGER)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET dare_points = dare_points + amount
  WHERE user_profiles.user_id = adjust_user_dare_points.user_id;
  
  RETURN FOUND;
END;
$$;

-- Create transaction table for DARE points
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'dare_transactions'
  ) THEN
    CREATE TABLE public.dare_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      bet_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      status TEXT DEFAULT 'COMPLETED'
    );
  END IF;
END
$$;

-- Create RPC function to record a transaction
CREATE OR REPLACE FUNCTION public.record_dare_transaction(
  user_id UUID,
  amount INTEGER,
  type TEXT,
  description TEXT DEFAULT NULL,
  bet_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transaction_id UUID;
BEGIN
  INSERT INTO public.dare_transactions (user_id, amount, type, description, bet_id)
  VALUES (user_id, amount, type, description, bet_id)
  RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
END;
$$;

-- Create escrow table for DARE points
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'dare_escrows'
  ) THEN
    CREATE TABLE public.dare_escrows (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      bet_id TEXT NOT NULL,
      creator_id UUID REFERENCES auth.users(id) NOT NULL,
      acceptor_id UUID REFERENCES auth.users(id),
      total_amount INTEGER NOT NULL,
      creator_amount INTEGER NOT NULL,
      acceptor_amount INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END
$$;

-- Create RPC function to create a new escrow
CREATE OR REPLACE FUNCTION public.create_escrow(
  bet_id TEXT,
  creator_id UUID,
  creator_amount INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escrow_id UUID;
BEGIN
  -- First deduct the points from the creator
  PERFORM adjust_user_dare_points(creator_id, -creator_amount);
  
  -- Create the escrow
  INSERT INTO public.dare_escrows (bet_id, creator_id, creator_amount, total_amount)
  VALUES (bet_id, creator_id, creator_amount, creator_amount)
  RETURNING id INTO escrow_id;
  
  -- Record the transaction
  PERFORM record_dare_transaction(creator_id, -creator_amount, 'BET_PLACED', 'Bet placed in escrow', bet_id);
  
  RETURN escrow_id;
END;
$$;

-- Create RPC function to add acceptor to escrow
CREATE OR REPLACE FUNCTION public.add_acceptor_to_escrow(
  escrow_id UUID,
  acceptor_id UUID,
  acceptor_amount INTEGER
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First deduct the points from the acceptor
  PERFORM adjust_user_dare_points(acceptor_id, -acceptor_amount);
  
  -- Update the escrow
  UPDATE public.dare_escrows
  SET 
    acceptor_id = add_acceptor_to_escrow.acceptor_id,
    acceptor_amount = add_acceptor_to_escrow.acceptor_amount,
    total_amount = creator_amount + add_acceptor_to_escrow.acceptor_amount,
    status = 'ACTIVE',
    updated_at = NOW()
  WHERE id = escrow_id;
  
  -- Record the transaction
  PERFORM record_dare_transaction(
    acceptor_id, 
    -acceptor_amount, 
    'BET_PLACED', 
    'Bet accepted and placed in escrow', 
    (SELECT bet_id FROM public.dare_escrows WHERE id = escrow_id)
  );
  
  RETURN FOUND;
END;
$$;

-- Create RPC function to complete escrow and award winner
CREATE OR REPLACE FUNCTION public.complete_escrow(
  escrow_id UUID,
  winner_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escrow_record public.dare_escrows;
BEGIN
  -- Get the escrow record
  SELECT * INTO escrow_record
  FROM public.dare_escrows
  WHERE id = escrow_id;
  
  -- Check if escrow exists and is active
  IF escrow_record IS NULL OR escrow_record.status != 'ACTIVE' THEN
    RETURN false;
  END IF;
  
  -- Award points to winner
  PERFORM adjust_user_dare_points(winner_id, escrow_record.total_amount);
  
  -- Update escrow status
  UPDATE public.dare_escrows
  SET 
    status = 'COMPLETED',
    updated_at = NOW()
  WHERE id = escrow_id;
  
  -- Record the transaction
  PERFORM record_dare_transaction(
    winner_id,
    escrow_record.total_amount,
    'BET_WON',
    'Bet won and claimed from escrow',
    escrow_record.bet_id
  );
  
  RETURN true;
END;
$$;

-- Create RPC function to refund escrow
CREATE OR REPLACE FUNCTION public.refund_escrow(
  escrow_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escrow_record public.dare_escrows;
BEGIN
  -- Get the escrow record
  SELECT * INTO escrow_record
  FROM public.dare_escrows
  WHERE id = escrow_id;
  
  -- Check if escrow exists
  IF escrow_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Refund creator if applicable
  IF escrow_record.creator_id IS NOT NULL AND escrow_record.creator_amount > 0 THEN
    PERFORM adjust_user_dare_points(escrow_record.creator_id, escrow_record.creator_amount);
    
    -- Record the transaction
    PERFORM record_dare_transaction(
      escrow_record.creator_id,
      escrow_record.creator_amount,
      'REFUND',
      'Bet refunded from escrow',
      escrow_record.bet_id
    );
  END IF;
  
  -- Refund acceptor if applicable
  IF escrow_record.acceptor_id IS NOT NULL AND escrow_record.acceptor_amount > 0 THEN
    PERFORM adjust_user_dare_points(escrow_record.acceptor_id, escrow_record.acceptor_amount);
    
    -- Record the transaction
    PERFORM record_dare_transaction(
      escrow_record.acceptor_id,
      escrow_record.acceptor_amount,
      'REFUND',
      'Bet refunded from escrow',
      escrow_record.bet_id
    );
  END IF;
  
  -- Update escrow status
  UPDATE public.dare_escrows
  SET 
    status = 'REFUNDED',
    updated_at = NOW()
  WHERE id = escrow_id;
  
  RETURN true;
END;
$$;

-- Add RLS policies for dare_transactions table
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.dare_transactions ENABLE ROW LEVEL SECURITY';
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dare_transactions' 
    AND policyname = 'Users can view their own transactions'
  ) THEN
    CREATE POLICY "Users can view their own transactions"
    ON public.dare_transactions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Add RLS policies for dare_escrows table
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.dare_escrows ENABLE ROW LEVEL SECURITY';
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dare_escrows' 
    AND policyname = 'Users can view their escrows'
  ) THEN
    CREATE POLICY "Users can view their escrows"
    ON public.dare_escrows
    FOR SELECT
    USING (auth.uid() = creator_id OR auth.uid() = acceptor_id);
  END IF;
END
$$;

-- Create indexes for faster queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_user_profiles_user_id'
  ) THEN
    CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_dare_transactions_user_id'
  ) THEN
    CREATE INDEX idx_dare_transactions_user_id ON public.dare_transactions(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_dare_escrows_bet_id'
  ) THEN
    CREATE INDEX idx_dare_escrows_bet_id ON public.dare_escrows(bet_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_dare_escrows_creator_id'
  ) THEN
    CREATE INDEX idx_dare_escrows_creator_id ON public.dare_escrows(creator_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_dare_escrows_acceptor_id'
  ) THEN
    CREATE INDEX idx_dare_escrows_acceptor_id ON public.dare_escrows(acceptor_id);
  END IF;
END
$$; 