-- Migration: 006_create_straight_bets_table.sql
-- Creates the straight_bets table to store all betting data

-- Create enum type for bet statuses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bet_status') THEN
        CREATE TYPE bet_status AS ENUM (
          -- A bet has been created but not yet accepted by another user
          'open',
          
          -- A bet has been accepted by another user and is awaiting match result
          'waiting_result',
          
          -- A bet has been settled with a winner determined
          'completed',
          
          -- A bet has been cancelled (by creator before acceptance, or by system)
          'cancelled'
        );
    END IF;
END$$;

-- Create enum type for currency
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_type') THEN
        CREATE TYPE currency_type AS ENUM ('points');
    END IF;
END$$;

-- Create the straight_bets table
CREATE TABLE IF NOT EXISTS straight_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User who created the bet
  creator_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  
  -- User who accepted the bet (NULL if still open)
  acceptor_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  
  -- The match this bet is placed on
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  
  -- Team/player ID that the bet creator picked to win
  creators_pick_id TEXT NOT NULL,
  
  -- Team/player ID that the bet acceptor picked to win (NULL if bet not accepted yet)
  acceptors_pick_id TEXT,
  
  -- Bet amount
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  
  -- Currency for the bet amount (currently only points supported)
  amount_currency currency_type NOT NULL DEFAULT 'points',
  
  -- Optional note from the bet creator
  creators_note TEXT,
  
  -- Current status of the bet
  status bet_status NOT NULL DEFAULT 'open',
  
  -- User ID of the winning bettor (NULL until bet is completed)
  winner_user_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT different_picks CHECK (
    acceptors_pick_id IS NULL OR creators_pick_id != acceptors_pick_id
  ),
  CONSTRAINT creator_not_acceptor CHECK (creator_id != acceptor_id),
  CONSTRAINT winner_is_participant CHECK (
    winner_user_id IS NULL OR 
    winner_user_id = creator_id OR 
    winner_user_id = acceptor_id
  ),
  CONSTRAINT valid_acceptance CHECK (
    (status = 'open' AND acceptor_id IS NULL AND accepted_at IS NULL AND acceptors_pick_id IS NULL) OR
    (status != 'open' AND acceptor_id IS NOT NULL AND accepted_at IS NOT NULL AND acceptors_pick_id IS NOT NULL)
  ),
  CONSTRAINT valid_completion CHECK (
    (status != 'completed' AND completed_at IS NULL AND winner_user_id IS NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL AND winner_user_id IS NOT NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_straight_bets_creator_id ON straight_bets(creator_id);
CREATE INDEX idx_straight_bets_acceptor_id ON straight_bets(acceptor_id);
CREATE INDEX idx_straight_bets_match_id ON straight_bets(match_id);
CREATE INDEX idx_straight_bets_status ON straight_bets(status);
CREATE INDEX idx_straight_bets_created_at ON straight_bets(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_straight_bets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_straight_bets_updated_at_trigger
    BEFORE UPDATE ON straight_bets
    FOR EACH ROW
    EXECUTE FUNCTION update_straight_bets_updated_at();

-- Create view for open bets that can be accepted by other users
CREATE VIEW open_straight_bets AS
SELECT 
    sb.*,
    creator.username as creator_username,
    creator.wallet_address as creator_wallet_address,
    m.home_team,
    m.away_team,
    m.start_time as match_start_time,
    m.status as match_status
FROM straight_bets sb
JOIN user_accounts creator ON sb.creator_id = creator.id
JOIN matches m ON sb.match_id = m.id
WHERE sb.status = 'open'
ORDER BY sb.created_at DESC;

-- Enable Row Level Security
ALTER TABLE straight_bets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view bets they created or accepted
CREATE POLICY "Users can view their own bets" ON straight_bets
    FOR SELECT USING (
        auth.uid() = creator_id OR 
        auth.uid() = acceptor_id
    );

-- Users can view open bets from others (for accepting)
CREATE POLICY "Users can view open bets" ON straight_bets
    FOR SELECT USING (status = 'open');

-- Users can create bets
CREATE POLICY "Users can create bets" ON straight_bets
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Users can update their own open bets (e.g., to accept them)
CREATE POLICY "Users can update bets" ON straight_bets
    FOR UPDATE USING (
        auth.uid() = creator_id OR 
        (status = 'open' AND auth.uid() IS NOT NULL)
    ); 