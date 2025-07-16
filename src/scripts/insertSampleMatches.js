// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://qiasnpjpkzhretlyymgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXNucGpwa3pocmV0bHl5bWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMzI5MDksImV4cCI6MjA2NDgwODkwOX0.BEOkmjVpGHo37omVsWEgvsCnXB0FIVqZQvDNCuy3qYo';

// Initialize the Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function insertSampleMatches() {
  try {
    // Insert NBA match details
    const nbaMatchDetails = [
      {
        id: 'nba_match_1_details',
        home_team_id: 'los-angeles-lakers',
        away_team_id: 'golden-state-warriors',
        game_subtitle: 'Western Conference Showdown',
        venue: 'Crypto.com Arena',
        timezone: 'America/Los_Angeles',
        scores: { home: null, away: null, status: 'scheduled' }
      },
      {
        id: 'nba_match_2_details',
        home_team_id: 'boston-celtics',
        away_team_id: 'miami-heat',
        game_subtitle: 'Eastern Conference Finals Rematch',
        venue: 'TD Garden',
        timezone: 'America/New_York',
        scores: { home: null, away: null, status: 'scheduled' }
      },
      {
        id: 'nba_match_3_details',
        home_team_id: 'milwaukee-bucks',
        away_team_id: 'denver-nuggets',
        game_subtitle: 'Cross-Conference Battle',
        venue: 'Fiserv Forum',
        timezone: 'America/Chicago',
        scores: { home: null, away: null, status: 'scheduled' }
      }
    ];

    console.log('Inserting NBA match details...');
    const nbaDetailsResult = await supabaseClient
      .from('match_details_basketball_nba')
      .insert(nbaMatchDetails)
      .select();

    if (nbaDetailsResult.error) {
      throw new Error(`Failed to insert NBA match details: ${nbaDetailsResult.error.message}`);
    }

    // Insert NBA matches
    const nbaMatches = [
      {
        id: 'nba_match_1',
        event_type: 'basketball_nba',
        details_id: 'nba_match_1_details',
        status: 'upcoming',
        scheduled_start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        bookmakers: { odds: { home: 1.95, away: 1.85 } }
      },
      {
        id: 'nba_match_2',
        event_type: 'basketball_nba',
        details_id: 'nba_match_2_details',
        status: 'upcoming',
        scheduled_start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        bookmakers: { odds: { home: 1.75, away: 2.05 } }
      },
      {
        id: 'nba_match_3',
        event_type: 'basketball_nba',
        details_id: 'nba_match_3_details',
        status: 'upcoming',
        scheduled_start_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        bookmakers: { odds: { home: 1.90, away: 1.90 } }
      }
    ];

    console.log('Inserting NBA matches...');
    const nbaMatchesResult = await supabaseClient
      .from('matches')
      .insert(nbaMatches)
      .select();

    if (nbaMatchesResult.error) {
      throw new Error(`Failed to insert NBA matches: ${nbaMatchesResult.error.message}`);
    }

    // Insert Sandbox match details
    const sandboxMatchDetails = [
      {
        id: 'sandbox_match_1_details',
        player1_id: 'player_1a',
        player1_name: 'CryptoKing',
        player1_subtitle: 'Season 1 Champion',
        player1_image_url: 'https://example.com/cryptoking.jpg',
        player2_id: 'player_1b',
        player2_name: 'MetaChampion',
        player2_subtitle: 'Rising Star',
        player2_image_url: 'https://example.com/metachampion.jpg'
      },
      {
        id: 'sandbox_match_2_details',
        player1_id: 'player_2a',
        player1_name: 'VoxelWarrior',
        player1_subtitle: 'Top Ranked Player',
        player1_image_url: 'https://example.com/voxelwarrior.jpg',
        player2_id: 'player_2b',
        player2_name: 'PixelMaster',
        player2_subtitle: 'Community Favorite',
        player2_image_url: 'https://example.com/pixelmaster.jpg'
      },
      {
        id: 'sandbox_match_3_details',
        player1_id: 'player_3a',
        player1_name: 'BlockchainBoss',
        player1_subtitle: 'Tournament Winner',
        player1_image_url: 'https://example.com/blockchainboss.jpg',
        player2_id: 'player_3b',
        player2_name: 'NFTNinja',
        player2_subtitle: 'Metaverse Veteran',
        player2_image_url: 'https://example.com/nftninja.jpg'
      }
    ];

    console.log('Inserting Sandbox match details...');
    const sandboxDetailsResult = await supabaseClient
      .from('match_details_sandbox_metaverse')
      .insert(sandboxMatchDetails)
      .select();

    if (sandboxDetailsResult.error) {
      throw new Error(`Failed to insert Sandbox match details: ${sandboxDetailsResult.error.message}`);
    }

    // Insert Sandbox matches
    const sandboxMatches = [
      {
        id: 'sandbox_match_1',
        event_type: 'sandbox_metaverse',
        details_id: 'sandbox_match_1_details',
        status: 'upcoming',
        scheduled_start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        bookmakers: { odds: { player1: 1.85, player2: 1.95 } }
      },
      {
        id: 'sandbox_match_2',
        event_type: 'sandbox_metaverse',
        details_id: 'sandbox_match_2_details',
        status: 'upcoming',
        scheduled_start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        bookmakers: { odds: { player1: 2.10, player2: 1.70 } }
      },
      {
        id: 'sandbox_match_3',
        event_type: 'sandbox_metaverse',
        details_id: 'sandbox_match_3_details',
        status: 'upcoming',
        scheduled_start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        bookmakers: { odds: { player1: 1.90, player2: 1.90 } }
      }
    ];

    console.log('Inserting Sandbox matches...');
    const sandboxMatchesResult = await supabaseClient
      .from('matches')
      .insert(sandboxMatches)
      .select();

    if (sandboxMatchesResult.error) {
      throw new Error(`Failed to insert Sandbox matches: ${sandboxMatchesResult.error.message}`);
    }

    console.log('Successfully inserted all sample matches!');
  } catch (error) {
    console.error('Error inserting sample matches:', error);
  }
}

// Run the script
insertSampleMatches(); 