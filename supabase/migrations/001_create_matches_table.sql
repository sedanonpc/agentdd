-- Create event type enum for different sports/esports
CREATE TYPE event_type_enum AS ENUM ('basketball_nba');

-- Create match status enum 
CREATE TYPE match_status_enum AS ENUM ('upcoming', 'live', 'finished', 'cancelled');

-- Create main matches table (universal for all sports)
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  event_type event_type_enum NOT NULL,
  details_id TEXT NOT NULL,
  status match_status_enum NOT NULL DEFAULT 'upcoming',
  scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  external_id TEXT, -- External API identifier (universal across all sports)
  
  -- Temporary: Keep for frontend compatibility during Phase 1
  bookmakers JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create basketball-specific details table
CREATE TABLE IF NOT EXISTS match_details_basketball_nba (
  id TEXT PRIMARY KEY,
  home_team_id TEXT NOT NULL,
  home_team_name TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_id TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  away_team_logo TEXT,
  season TEXT,
  week INTEGER,
  scores JSONB,
  venue_name TEXT,
  venue_city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_start_time ON matches(scheduled_start_time);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_event_type ON matches(event_type);
CREATE INDEX IF NOT EXISTS idx_matches_details_id ON matches(details_id);

-- Add index for external_id in main matches table
CREATE INDEX IF NOT EXISTS idx_matches_external_id ON matches(external_id);

-- Basketball details indexes
CREATE INDEX IF NOT EXISTS idx_basketball_details_home_team ON match_details_basketball_nba(home_team_id);
CREATE INDEX IF NOT EXISTS idx_basketball_details_away_team ON match_details_basketball_nba(away_team_id);

-- Add foreign key constraint to ensure details_id points to correct table
-- Note: Using a trigger instead of CHECK constraint since PostgreSQL doesn't allow subqueries in CHECK constraints
CREATE OR REPLACE FUNCTION validate_match_details_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that details_id exists in the appropriate details table
  IF NEW.event_type = 'basketball_nba' THEN
    IF NOT EXISTS (SELECT 1 FROM match_details_basketball_nba WHERE id = NEW.details_id) THEN
      RAISE EXCEPTION 'details_id % does not exist in match_details_basketball_nba table', NEW.details_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate details_id on insert and update
CREATE TRIGGER validate_match_details_trigger
  BEFORE INSERT OR UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION validate_match_details_id();

-- Add RLS policies for matches table
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to matches" 
  ON matches FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated users to insert matches" 
  ON matches FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update matches" 
  ON matches FOR UPDATE 
  TO authenticated 
  USING (true);

-- Add RLS policies for basketball details table
ALTER TABLE match_details_basketball_nba ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to basketball details" 
  ON match_details_basketball_nba FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated users to insert basketball details" 
  ON match_details_basketball_nba FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update basketball details" 
  ON match_details_basketball_nba FOR UPDATE 
  TO authenticated 
  USING (true);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.matches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.match_details_basketball_nba TO authenticated; 