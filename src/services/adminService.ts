import { supabase } from './supabaseService';
import { Match, Team } from '../types';

// Check if a user is an admin
export const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('is_admin')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data?.is_admin || false;
  } catch (error) {
    console.error('Exception checking admin status:', error);
    return false;
  }
};

// Set a user as admin
export const setUserAsAdmin = async (email: string, adminStatus: boolean): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('set_user_as_admin', {
        user_email: email,
        admin_status: adminStatus
      });
    
    if (error) {
      console.error('Error setting admin status:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Exception setting admin status:', error);
    return false;
  }
};

// Create a new match (admin only)
export const createMatch = async (match: Omit<Match, 'id'>): Promise<Match | null> => {
  try {
    // Generate a unique ID for the match
    const matchId = generateMatchId(
      match.sport_name || '',
      match.league_name || '',
      match.home_team.name,
      match.away_team.name,
      match.commence_time
    );
    
    // Prepare match data with ID
    const matchData = {
      id: matchId,
      sport_name: match.sport_name || match.sport_key.split('_')[0],
      league_name: match.league_name || match.sport_key.split('_')[1],
      sport_title: match.sport_title,
      commence_time: match.commence_time,
      home_team_id: match.home_team.id,
      home_team_name: match.home_team.name,
      home_team_logo: match.home_team.logo || null,
      away_team_id: match.away_team.id,
      away_team_name: match.away_team.name,
      away_team_logo: match.away_team.logo || null,
      bookmakers: match.bookmakers || [],
      scores: match.scores || null,
      completed: match.completed || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert match into database
    const { data, error } = await supabase
      .from('matches')
      .insert(matchData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating match:', error);
      return null;
    }
    
    // Convert back to Match type
    return {
      id: data.id,
      sport_key: `${data.sport_name}_${data.league_name}`,
      sport_name: data.sport_name,
      league_name: data.league_name,
      sport_title: data.sport_title,
      commence_time: data.commence_time,
      home_team: {
        id: data.home_team_id,
        name: data.home_team_name,
        logo: data.home_team_logo
      },
      away_team: {
        id: data.away_team_id,
        name: data.away_team_name,
        logo: data.away_team_logo
      },
      bookmakers: data.bookmakers || [],
      scores: data.scores,
      completed: data.completed
    };
  } catch (error) {
    console.error('Exception creating match:', error);
    return null;
  }
};

// Update match scores (admin only)
export const updateMatchScoresAdmin = async (
  matchId: string,
  homeScore: number,
  awayScore: number,
  completed: boolean = false
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('matches')
      .update({
        scores: { home: homeScore, away: awayScore },
        completed: completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId);
    
    if (error) {
      console.error('Error updating match scores:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception updating match scores:', error);
    return false;
  }
};

// Delete a match (admin only)
export const deleteMatch = async (matchId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);
    
    if (error) {
      console.error('Error deleting match:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception deleting match:', error);
    return false;
  }
};

// Helper function to generate a match ID
const generateMatchId = (
  sportName: string,
  leagueName: string,
  homeTeamName: string,
  awayTeamName: string,
  commenceTime: string
): string => {
  // Clean up team names - remove spaces and special characters
  const cleanHome = homeTeamName.replace(/\W+/g, '').toLowerCase();
  const cleanAway = awayTeamName.replace(/\W+/g, '').toLowerCase();
  const cleanSport = sportName.replace(/\W+/g, '').toLowerCase();
  const cleanLeague = leagueName.replace(/\W+/g, '').toLowerCase();
  
  // Get date part from commence time
  const date = new Date(commenceTime);
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  
  // Create unique ID
  return `${cleanSport}_${cleanLeague}_${cleanHome}_${cleanAway}_${dateStr}`;
}; 