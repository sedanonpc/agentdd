-- Migration: Create points transactions table
-- This creates a table to track all points movements for audit purposes

-- Create enum type for transaction types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'points_transaction_type') THEN
        CREATE TYPE points_transaction_type AS ENUM (
          -- When a user places a bet, their free points are reserved in the amount of the bet
          'BET_PLACED',
          
          -- When a user places a bet, they are awarded bonus points
          'BET_PLACEMENT_BONUS_AWARDED',
          
          -- When a user wins a bet, their reserved points (the bet amount) are released back to free points
          'BET_WON',
          
          -- When a user wins a bet, they are awarded bonus points
          'BET_WIN_BONUS_AWARDED',
          
          -- When a user loses a bet, their reserved points are transferred to the winner
          'BET_LOST',
          
          -- When a new user signs up, they receive 500 free points
          'SIGNUP',
          
          -- When a user refers someone who signs up, they receive 100 free points
          'REFERRAL_BONUS',
          
          -- When a user logs in daily, they receive 5 free points
          'DAILY_LOGIN'
        );
    END IF;
END$$;

-- Create enum type for balance types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'points_balance_type') THEN
        CREATE TYPE points_balance_type AS ENUM (
          -- Affects the free points balance that users can spend
          'FREE',
          
          -- Affects the reserved points balance that is held in escrow
          'RESERVED'
        );
    END IF;
END$$;

-- Create points_transactions table
CREATE TABLE IF NOT EXISTS public.points_transactions (
  -- Unique identifier for the transaction
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User whose points are being affected
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Type of transaction (bet placed, bet won, etc.)
  transaction_type points_transaction_type NOT NULL,
  
  -- Which balance is affected by this transaction (free or reserved)
  balance_type points_balance_type NOT NULL,
  
  -- Amount of points involved in the transaction (positive for additions, negative for subtractions)
  amount DECIMAL(18,8) NOT NULL,
  
  -- Identifier that groups related transactions from the same event
  common_event_id UUID NOT NULL,
  
  -- Additional JSON data related to the transaction, includes:
  -- - bet_id: ID of the bet related to this transaction (for BET_* transaction types)
  -- - match_id: ID of the match related to this transaction (for BET_* transaction types)
  -- - referral_code: Referral code used for referral transactions (for REFERRAL_BONUS)
  -- - referrer_user_id: User ID of the referrer (for REFERRAL_BONUS transactions)
  -- - bettor_user_id: User ID of the bettor who originated the bet (for BET_* transaction types)
  -- - opponent_user_id: User ID of the opponent in a bet (for BET_WON, BET_LOST transactions)
  -- - referred_user_id: User ID of the new user who was referred (for REFERRAL_BONUS transactions on referrer's account)
  metadata JSONB,
  
  -- When the transaction was created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id 
ON public.points_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_points_transactions_transaction_type
ON public.points_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_points_transactions_balance_type
ON public.points_transactions(balance_type);

CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at
ON public.points_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_points_transactions_common_event_id
ON public.points_transactions(common_event_id);

-- Create GIN index for JSON metadata to allow efficient searching
CREATE INDEX IF NOT EXISTS idx_points_transactions_metadata
ON public.points_transactions USING GIN (metadata);

-- Enable Row Level Security
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view their own transactions"
  ON points_transactions
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid()::text = (metadata->>'referrer_user_id')::text OR
    auth.uid()::text = (metadata->>'opponent_user_id')::text OR
    auth.uid()::text = (metadata->>'referred_user_id')::text OR
    auth.uid()::text = (metadata->>'bettor_user_id')::text
  );

CREATE POLICY "System can insert transactions"
  ON points_transactions
  FOR INSERT
  WITH CHECK (true);  -- This allows the system to insert transactions for any user

-- Add comments
COMMENT ON TABLE public.points_transactions IS 'Audit trail of all points movements';
COMMENT ON COLUMN public.points_transactions.id IS 'Unique identifier for the transaction';
COMMENT ON COLUMN public.points_transactions.user_id IS 'User whose points are being affected';
COMMENT ON COLUMN public.points_transactions.transaction_type IS 'Type of transaction - see points_transaction_type enum definition for all possible values';
COMMENT ON COLUMN public.points_transactions.balance_type IS 'Which balance is affected - see points_balance_type enum definition for all possible values';
COMMENT ON COLUMN public.points_transactions.amount IS 'Amount of points involved in the transaction (positive for additions, negative for subtractions)';
COMMENT ON COLUMN public.points_transactions.common_event_id IS 'Identifier that groups related transactions from the same event (e.g., bet placement, bet settlement)';
COMMENT ON COLUMN public.points_transactions.metadata IS 'JSON data containing conditional fields - see PointsTransactionMetadata type definition for all possible fields';
COMMENT ON COLUMN public.points_transactions.created_at IS 'When the transaction was created';

-- Create validation function for transaction metadata
CREATE OR REPLACE FUNCTION public.validate_points_transaction_metadata(
  transaction_type points_transaction_type,
  balance_type points_balance_type,
  amount DECIMAL(18,8),
  metadata JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate amount based on transaction type
  CASE transaction_type
    WHEN 'BET_PLACED' THEN
      -- BET_PLACED should have negative amount and RESERVED balance
      IF amount >= 0 OR balance_type != 'RESERVED' THEN
        RAISE EXCEPTION 'BET_PLACED transactions must have negative amount and RESERVED balance type';
      END IF;
      -- Require bet_id and bettor_user_id
      IF metadata->>'bet_id' IS NULL OR metadata->>'bettor_user_id' IS NULL THEN
        RAISE EXCEPTION 'BET_PLACED transactions require bet_id and bettor_user_id in metadata';
      END IF;
      
         WHEN 'BET_PLACEMENT_BONUS_AWARDED', 'BET_WIN_BONUS_AWARDED', 'SIGNUP', 'REFERRAL_BONUS', 'DAILY_LOGIN' THEN
      -- Bonus transactions should have positive amount and FREE balance
      IF amount <= 0 OR balance_type != 'FREE' THEN
        RAISE EXCEPTION '% transactions must have positive amount and FREE balance type', transaction_type;
      END IF;
      
    WHEN 'BET_WON' THEN
      -- BET_WON should have positive amount and move from RESERVED to FREE
      IF amount <= 0 OR balance_type != 'FREE' THEN
        RAISE EXCEPTION 'BET_WON transactions must have positive amount and FREE balance type';
      END IF;
      -- Require bet_id and bettor_user_id
      IF metadata->>'bet_id' IS NULL OR metadata->>'bettor_user_id' IS NULL THEN
        RAISE EXCEPTION 'BET_WON transactions require bet_id and bettor_user_id in metadata';
      END IF;
      
    WHEN 'BET_LOST' THEN
      -- BET_LOST should have negative amount and RESERVED balance (removing reserved points)
      IF amount >= 0 OR balance_type != 'RESERVED' THEN
        RAISE EXCEPTION 'BET_LOST transactions must have negative amount and RESERVED balance type';
      END IF;
      -- Require bet_id, bettor_user_id, and opponent_user_id
      IF metadata->>'bet_id' IS NULL OR metadata->>'bettor_user_id' IS NULL OR metadata->>'opponent_user_id' IS NULL THEN
        RAISE EXCEPTION 'BET_LOST transactions require bet_id, bettor_user_id, and opponent_user_id in metadata';
      END IF;
      
          WHEN 'REFERRAL_BONUS' THEN
        -- Additional validation for referral bonus
        IF metadata->>'referrer_user_id' IS NULL OR metadata->>'referred_user_id' IS NULL THEN
          RAISE EXCEPTION 'REFERRAL_BONUS transactions require referrer_user_id and referred_user_id in metadata';
        END IF;
  END CASE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to validate transactions before insert
CREATE OR REPLACE FUNCTION public.validate_transaction_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Run validation
  PERFORM public.validate_points_transaction_metadata(
    NEW.transaction_type,
    NEW.balance_type, 
    NEW.amount,
    NEW.metadata
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER validate_points_transaction
  BEFORE INSERT ON public.points_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_before_insert(); 