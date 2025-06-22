-- Migration to separate sport_key into sport_name and league_name
ALTER TABLE matches
ADD COLUMN sport_name TEXT,
ADD COLUMN league_name TEXT;

-- Update existing records to split sport_key into the new columns
UPDATE matches
SET 
  sport_name = SPLIT_PART(sport_key, '_', 1),
  league_name = SPLIT_PART(sport_key, '_', 2);

-- Make the new columns NOT NULL after populating them
ALTER TABLE matches
ALTER COLUMN sport_name SET NOT NULL,
ALTER COLUMN league_name SET NOT NULL;

-- Create indexes for sport_name and league_name
CREATE INDEX IF NOT EXISTS idx_matches_sport_name ON matches(sport_name);
CREATE INDEX IF NOT EXISTS idx_matches_league_name ON matches(league_name);

-- Drop the now redundant sport_key column
ALTER TABLE matches
DROP COLUMN sport_key; 