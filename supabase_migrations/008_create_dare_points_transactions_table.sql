-- Migration: Create DARE points transactions table
-- This creates a table to track all DARE points movements for audit purposes

-- Create enum type for transaction types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dare_points_transaction_type') THEN
        CREATE TYPE dare_points_transaction_type AS ENUM (
          -- When a user places a bet, their free points are reserved in the amount of the bet
          'BET_PLACED',
          
          -- When a user places a bet, they earn 10 bonus points
          'BET_PLACEMENT_BONUS',
          
          -- When a user wins a bet, their reserved points (the bet amount) are released back to free points
          'BET_WON',
          
          -- When a user wins a bet, they earn 50 bonus points
          'BET_WIN_BONUS',
          
          -- When a user loses a bet, their reserved points are transferred to the winner
          'BET_LOST',
          
          -- When a new user signs up, they receive 500 free points
          'SIGNUP_BONUS',
          
          -- When a user refers someone who signs up, they receive 100 free points
          'REFERRAL_BONUS',
          
          -- When a user logs in daily, they receive 5 free points
          'DAILY_LOGIN',
          
          -- For manual adjustments by administrators
          'MANUAL_ADJUSTMENT'
        );
    END IF;
END$$;

-- Create enum type for balance types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dare_points_balance_type') THEN
        CREATE TYPE dare_points_balance_type AS ENUM (
          -- Affects the free points balance that users can spend
          'FREE',
          
          -- Affects the reserved points balance that is held in escrow
          'RESERVED'
        );
    END IF;
END$$;

-- Create dare_points_transactions table
CREATE TABLE IF NOT EXISTS public.dare_points_transactions (
  -- Unique identifier for the transaction
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User whose points are being affected
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Type of transaction (bet placed, bet won, etc.)
  transaction_type dare_points_transaction_type NOT NULL,
  
  -- Which balance is affected by this transaction (free or reserved)
  balance_type dare_points_balance_type NOT NULL,
  
  -- Amount of points involved in the transaction (positive for additions, negative for subtractions)
  amount DECIMAL(18,8) NOT NULL,
  
  -- Identifier that groups related transactions from the same event
  common_event_id UUID NOT NULL,
  
  -- Additional JSON data related to the transaction, includes:
  -- - related_user_id: Another user involved in the transaction (e.g., bet opponent, referrer)
  -- - bet_id: ID of the bet related to this transaction
  -- - match_id: ID of the match related to this transaction
  -- - referral_code: Referral code used for referral transactions
  -- - description: Human-readable description of the transaction
  metadata JSONB,
  
  -- When the transaction was created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_dare_points_transactions_user_id 
ON public.dare_points_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_dare_points_transactions_transaction_type
ON public.dare_points_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_dare_points_transactions_balance_type
ON public.dare_points_transactions(balance_type);

CREATE INDEX IF NOT EXISTS idx_dare_points_transactions_created_at
ON public.dare_points_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_dare_points_transactions_common_event_id
ON public.dare_points_transactions(common_event_id);

-- Create GIN index for JSON metadata to allow efficient searching
CREATE INDEX IF NOT EXISTS idx_dare_points_transactions_metadata
ON public.dare_points_transactions USING GIN (metadata);

-- Enable Row Level Security
ALTER TABLE public.dare_points_transactions ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view their own transactions"
  ON dare_points_transactions
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid()::text = (metadata->>'related_user_id')::text
  );

CREATE POLICY "System can insert transactions"
  ON dare_points_transactions
  FOR INSERT
  WITH CHECK (true);  -- This allows the system to insert transactions for any user

-- Add comments
COMMENT ON TABLE public.dare_points_transactions IS 'Audit trail of all DARE points movements';
COMMENT ON COLUMN public.dare_points_transactions.id IS 'Unique identifier for the transaction';
COMMENT ON COLUMN public.dare_points_transactions.user_id IS 'User whose points are being affected';
COMMENT ON COLUMN public.dare_points_transactions.transaction_type IS 'Type of transaction: BET_PLACED, BET_WON, BET_LOST, SIGNUP_BONUS, REFERRAL_BONUS, DAILY_LOGIN, MANUAL_ADJUSTMENT';
COMMENT ON COLUMN public.dare_points_transactions.balance_type IS 'Which balance is affected: FREE or RESERVED';
COMMENT ON COLUMN public.dare_points_transactions.amount IS 'Amount of DARE points involved in the transaction (positive for additions, negative for subtractions)';
COMMENT ON COLUMN public.dare_points_transactions.common_event_id IS 'Identifier that groups related transactions from the same event (e.g., bet placement, bet settlement)';
COMMENT ON COLUMN public.dare_points_transactions.metadata IS 'JSON data containing conditional fields like related_user_id, bet_id, match_id, referral_code, and description';
COMMENT ON COLUMN public.dare_points_transactions.created_at IS 'When the transaction was created'; 