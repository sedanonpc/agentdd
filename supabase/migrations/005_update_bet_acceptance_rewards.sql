-- Migration: Update bet rewards from placement to acceptance
-- This changes the reward system to prevent abuse and encourage genuine engagement

-- First, update the enum type to include the new transaction type
ALTER TYPE points_transaction_type ADD VALUE IF NOT EXISTS 'BET_ACCEPTANCE_BONUS_AWARDED';

-- Remove the old placement bonus configuration
DELETE FROM public.points_config WHERE action_type = 'BET_PLACEMENT_BONUS_AWARDED';

-- Add the new acceptance bonus configuration (higher value since it requires two users)
INSERT INTO public.points_config (action_type, points_value)
VALUES ('BET_ACCEPTANCE_BONUS_AWARDED', 15)
ON CONFLICT (action_type) DO UPDATE SET points_value = 15;

-- Update the validation function to handle the new transaction type
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
      
    WHEN 'BET_ACCEPTANCE_BONUS_AWARDED', 'BET_WIN_BONUS_AWARDED', 'SIGNUP', 'REFERRAL_BONUS', 'DAILY_LOGIN' THEN
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

-- Add comment explaining the change
COMMENT ON TABLE public.points_config IS 'Point values for different actions. Updated to use BET_ACCEPTANCE_BONUS_AWARDED instead of BET_PLACEMENT_BONUS_AWARDED to prevent abuse.'; 