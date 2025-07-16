-- Migration: Insert sample matches
-- This migration inserts sample matches for testing

-- First insert NBA match details
INSERT INTO match_details_basketball_nba (
    id,
    home_team_id,
    away_team_id,
    game_subtitle,
    venue,
    timezone
) VALUES
    -- NBA Match 1: Lakers vs Warriors
    ('nba-2025-1',
    'los-angeles-lakers',
    'golden-state-warriors',
    'Opening Night Showdown',
    'Crypto.com Arena',
    'America/Los_Angeles'),

    -- NBA Match 2: Celtics vs Heat
    ('nba-2025-2',
    'boston-celtics',
    'miami-heat',
    'Eastern Conference Rivalry',
    'TD Garden',
    'America/New_York'),

    -- NBA Match 3: Bucks vs 76ers
    ('nba-2025-3',
    'milwaukee-bucks',
    'philadelphia-76ers',
    'Eastern Conference Clash',
    'Fiserv Forum',
    'America/Chicago'),

    -- NBA Match 4: Nuggets vs Suns
    ('nba-2025-4',
    'denver-nuggets',
    'phoenix-suns',
    'Western Conference Showdown',
    'Ball Arena',
    'America/Denver'),

    -- NBA Match 5: Mavericks vs Clippers
    ('nba-2025-5',
    'dallas-mavericks',
    'los-angeles-clippers',
    'Western Conference Battle',
    'American Airlines Center',
    'America/Chicago');

-- Insert Sandbox match details
INSERT INTO match_details_sandbox_metaverse (
    id,
    player1_id,
    player1_name,
    player1_subtitle,
    player2_id,
    player2_name,
    player2_subtitle
) VALUES
    -- Sandbox Match 1
    ('sandbox-2025-1',
    'player-crypto-1',
    'CryptoMaster',
    'The Blockchain King',
    'player-meta-1',
    'MetaNinja',
    'Virtual Reality Champion'),

    -- Sandbox Match 2
    ('sandbox-2025-2',
    'player-block-1',
    'BlockQueen',
    'Chain Commander',
    'player-pixel-1',
    'PixelKing',
    'Digital Realm Ruler'),

    -- Sandbox Match 3
    ('sandbox-2025-3',
    'player-voxel-1',
    'VoxelWarrior',
    'Master of the Grid',
    'player-crypto-2',
    'CryptoPhoenix',
    'Rising from the Chain'),

    -- Sandbox Match 4
    ('sandbox-2025-4',
    'player-meta-2',
    'MetaMonarch',
    'Sovereign of Space',
    'player-chain-1',
    'ChainChampion',
    'Blockchain Battler'),

    -- Sandbox Match 5
    ('sandbox-2025-5',
    'player-pixel-2',
    'PixelPaladin',
    'Guardian of the Grid',
    'player-virtual-1',
    'VirtualViking',
    'Conqueror of Code');

-- Insert main matches
INSERT INTO matches (
    id,
    event_type,
    details_id,
    status,
    scheduled_start_time
) VALUES
    -- NBA Matches
    ('m1-nba-2025',
    'basketball_nba',
    'nba-2025-1',
    'upcoming',
    '2025-10-15 19:30:00-07:00'),

    ('m2-nba-2025',
    'basketball_nba',
    'nba-2025-2',
    'upcoming',
    '2025-10-20 20:00:00-04:00'),

    ('m3-nba-2025',
    'basketball_nba',
    'nba-2025-3',
    'upcoming',
    '2025-11-05 19:00:00-06:00'),

    ('m4-nba-2025',
    'basketball_nba',
    'nba-2025-4',
    'upcoming',
    '2025-11-15 19:00:00-07:00'),

    ('m5-nba-2025',
    'basketball_nba',
    'nba-2025-5',
    'upcoming',
    '2025-12-01 19:30:00-06:00'),

    -- Sandbox Matches
    ('m1-sandbox-2025',
    'sandbox_metaverse',
    'sandbox-2025-1',
    'upcoming',
    '2025-11-01 18:00:00+00:00'),

    ('m2-sandbox-2025',
    'sandbox_metaverse',
    'sandbox-2025-2',
    'upcoming',
    '2025-11-15 19:00:00+00:00'),

    ('m3-sandbox-2025',
    'sandbox_metaverse',
    'sandbox-2025-3',
    'upcoming',
    '2025-11-30 20:00:00+00:00'),

    ('m4-sandbox-2025',
    'sandbox_metaverse',
    'sandbox-2025-4',
    'upcoming',
    '2025-12-10 18:30:00+00:00'),

    ('m5-sandbox-2025',
    'sandbox_metaverse',
    'sandbox-2025-5',
    'upcoming',
    '2025-12-20 19:00:00+00:00'); 