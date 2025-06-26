-- Create matches table to persist scraped match data
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  sport_key TEXT NOT NULL,
  sport_title TEXT NOT NULL,
  commence_time TIMESTAMP WITH TIME ZONE NOT NULL,
  home_team_id TEXT NOT NULL,
  home_team_name TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_id TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  away_team_logo TEXT,
  bookmakers JSONB,
  scores JSONB,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster querying of upcoming matches
CREATE INDEX IF NOT EXISTS idx_matches_commence_time ON matches(commence_time);

-- Create index for completed matches
CREATE INDEX IF NOT EXISTS idx_matches_completed ON matches(completed);

-- Add RLS policies
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Everyone can read matches
CREATE POLICY "Allow public read access to matches" 
  ON matches FOR SELECT 
  USING (true);

-- Only authenticated users can insert/update matches
CREATE POLICY "Allow authenticated users to insert matches" 
  ON matches FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update matches" 
  ON matches FOR UPDATE 
  TO authenticated 
  USING (true); 