-- Sample matches insertion script
-- This script inserts 3 NBA matches and 3 Sandbox matches as if they were created from the admin page

-- First, let's insert NBA matches
-- We'll use existing NBA teams from the teams_nba table

-- 1. Insert NBA match details
INSERT INTO match_details_basketball_nba (id, home_team_id, away_team_id, game_subtitle, venue, timezone, scores)
VALUES
  -- Lakers vs Warriors
  ('nba_match_1_details', 'los-angeles-lakers', 'golden-state-warriors', 'Western Conference Showdown', 'Crypto.com Arena', 'America/Los_Angeles', '{"home": null, "away": null, "status": "scheduled"}'),
  -- Celtics vs Heat
  ('nba_match_2_details', 'boston-celtics', 'miami-heat', 'Eastern Conference Finals Rematch', 'TD Garden', 'America/New_York', '{"home": null, "away": null, "status": "scheduled"}'),
  -- Bucks vs Nuggets
  ('nba_match_3_details', 'milwaukee-bucks', 'denver-nuggets', 'Cross-Conference Battle', 'Fiserv Forum', 'America/Chicago', '{"home": null, "away": null, "status": "scheduled"}');

-- Insert the corresponding matches in the main matches table
INSERT INTO matches (id, event_type, details_id, status, scheduled_start_time, external_id, bookmakers)
VALUES
  ('nba_match_1', 'basketball_nba', 'nba_match_1_details', 'upcoming', NOW() + INTERVAL '2 days', NULL, '{"odds": {"home": 1.95, "away": 1.85}}'),
  ('nba_match_2', 'basketball_nba', 'nba_match_2_details', 'upcoming', NOW() + INTERVAL '3 days', NULL, '{"odds": {"home": 1.75, "away": 2.05}}'),
  ('nba_match_3', 'basketball_nba', 'nba_match_3_details', 'upcoming', NOW() + INTERVAL '4 days', NULL, '{"odds": {"home": 1.90, "away": 1.90}}');

-- Now, let's insert Sandbox matches
-- We'll create player details for each match

-- 1. Insert Sandbox match details
INSERT INTO match_details_sandbox_metaverse (id, player1_id, player1_name, player1_subtitle, player1_image_url, player2_id, player2_name, player2_subtitle, player2_image_url)
VALUES
  -- CryptoKing vs MetaChampion
  ('sandbox_match_1_details', 
   'player_1a', 'CryptoKing', 'Season 1 Champion', 'https://example.com/cryptoking.jpg',
   'player_1b', 'MetaChampion', 'Rising Star', 'https://example.com/metachampion.jpg'),
  -- VoxelWarrior vs PixelMaster
  ('sandbox_match_2_details',
   'player_2a', 'VoxelWarrior', 'Top Ranked Player', 'https://example.com/voxelwarrior.jpg',
   'player_2b', 'PixelMaster', 'Community Favorite', 'https://example.com/pixelmaster.jpg'),
  -- BlockchainBoss vs NFTNinja
  ('sandbox_match_3_details',
   'player_3a', 'BlockchainBoss', 'Tournament Winner', 'https://example.com/blockchainboss.jpg',
   'player_3b', 'NFTNinja', 'Metaverse Veteran', 'https://example.com/nftninja.jpg');

-- Insert the corresponding matches in the main matches table
INSERT INTO matches (id, event_type, details_id, status, scheduled_start_time, external_id, bookmakers)
VALUES
  ('sandbox_match_1', 'sandbox_metaverse', 'sandbox_match_1_details', 'upcoming', NOW() + INTERVAL '1 day', NULL, '{"odds": {"player1": 1.85, "player2": 1.95}}'),
  ('sandbox_match_2', 'sandbox_metaverse', 'sandbox_match_2_details', 'upcoming', NOW() + INTERVAL '2 days', NULL, '{"odds": {"player1": 2.10, "player2": 1.70}}'),
  ('sandbox_match_3', 'sandbox_metaverse', 'sandbox_match_3_details', 'upcoming', NOW() + INTERVAL '3 days', NULL, '{"odds": {"player1": 1.90, "player2": 1.90}}'); 