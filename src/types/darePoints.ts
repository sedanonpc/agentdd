// TypeScript enums that match the SQL enums exactly
export type DarePointsTransactionType = 
  | 'BET_PLACED'
  | 'BET_PLACEMENT_BONUS_AWARDED' 
  | 'BET_WON'
  | 'BET_WIN_BONUS_AWARDED'
  | 'BET_LOST'
  | 'SIGNUP'
  | 'REFERRAL_BONUS'
  | 'DAILY_LOGIN'
  | 'MANUAL_ADJUSTMENT';

export type DarePointsBalanceType = 'FREE' | 'RESERVED';

// Interface for transaction metadata (stored as JSONB)
export interface DarePointsTransactionMetadata {
  /** ID of the bet related to this transaction (for BET_* transaction types) */
  bet_id?: string;
  
  /** ID of the match related to this transaction (for BET_* transaction types) */
  match_id?: string;
  
  /** Referral code used for referral transactions (for REFERRAL_BONUS) */
  referral_code?: string;
  
  /** User ID of the referrer (for REFERRAL_BONUS transactions) */
  referrer_user_id?: string;
  
  /** User ID of the bettor who originated the bet (for BET_* transaction types) */
  bettor_user_id?: string;
  
  /** User ID of the opponent in a bet (for BET_WON, BET_LOST transactions) */
  opponent_user_id?: string;
  
  /** User ID of the new user who was referred (for REFERRAL_BONUS transactions on referrer's account) */
  referred_user_id?: string;
}

// Interface for the transaction record that matches the database exactly
export interface DarePointsTransactionRecord {
  user_id: string;  // matches database column name
  transaction_type: DarePointsTransactionType;
  balance_type: DarePointsBalanceType;
  amount: number;
  common_event_id: string;
  metadata?: DarePointsTransactionMetadata;
} 