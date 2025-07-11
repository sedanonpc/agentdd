import { createClient } from '@supabase/supabase-js';
import { Match, Team } from '../types'; // Add Match and Team import

// Supabase configuration
// Hardcoded values as a fallback when env variables have issues
const fixedSupabaseUrl = 'https://qiasnpjpkzhretlyymgh.supabase.co';
const fixedSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXNucGpwa3pocmV0bHl5bWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMzI5MDksImV4cCI6MjA2NDgwODkwOX0.BEOkmjVpGHo37omVsWEgvsCnXB0FIVqZQvDNCuy3qYo';

// Try to use environment variables, fall back to fixed values if there's an issue
let supabaseUrl = '';
try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fixedSupabaseUrl;
  // Validate URL format
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('Invalid Supabase URL format:', supabaseUrl);
    supabaseUrl = fixedSupabaseUrl;
  }
} catch (error) {
  console.error('Error accessing Supabase URL:', error);
  supabaseUrl = fixedSupabaseUrl;
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fixedSupabaseAnonKey;

// When in development mode and no proper keys are set, use a dummy client
const isDevelopment = import.meta.env.DEV;
const isProperlyConfigured = supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey && supabaseAnonKey.length > 10;
const shouldUseDummyClient = false; // Force real Supabase client

// Log the Supabase URL for debugging
console.log('Supabase URL:', supabaseUrl ? (shouldUseDummyClient ? 'USING DUMMY CLIENT' : supabaseUrl.substring(0, 15) + '...') : 'NOT SET');
console.log('Supabase Anon Key present:', !!supabaseAnonKey && !shouldUseDummyClient);
console.log('Using dummy client:', shouldUseDummyClient);

// Initialize the Supabase client
let supabase = createClient(fixedSupabaseUrl, fixedSupabaseAnonKey); // Default initialization
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Already using the default client
}
export { supabase };

// Create a dummy Supabase client for offline/development mode
const createDummyClient = () => {
  console.warn('Using dummy Supabase client - data will not persist to cloud');
  
  // Create a simple in-memory store for development
  const inMemoryStore: Record<string, any[]> = {
    user_accounts: [],
    bets: [],
  };
  
  // Create a dummy channel for realtime subscriptions
  class DummyChannel {
    private callbacks: Array<{ event: string; callback: Function }> = [];
    private channelName: string;
    
    constructor(name: string) {
      this.channelName = name;
      console.log(`Creating dummy channel: ${name}`);
    }
    
    on(event: string, filter: any, callback: Function) {
      console.log(`Registered dummy callback for event: ${event}`, filter);
      this.callbacks.push({ event, callback });
      return this;
    }
    
    subscribe(statusCallback?: Function) {
      if (statusCallback) {
        statusCallback('SUBSCRIBED');
      }
      console.log(`Subscribed to dummy channel: ${this.channelName}`);
      return this;
    }
    
    // Method to simulate events for testing
    simulateEvent(event: string, payload: any) {
      this.callbacks
        .filter(cb => cb.event === event)
        .forEach(cb => {
          console.log(`Simulating event ${event} on channel ${this.channelName}`);
          cb.callback(payload);
        });
    }
  }
  
  // Store active channels
  const activeChannels: Record<string, DummyChannel> = {};
  
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: null,
            error: { code: 'DUMMY_CLIENT' }
          })
        }),
        limit: () => ({
          single: () => ({
            data: null,
            error: { code: 'DUMMY_CLIENT' }
          })
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => {
            if (inMemoryStore[table]) {
              inMemoryStore[table].push(data);
            } else {
              inMemoryStore[table] = [data];
            }
            return { data, error: null };
          }
        })
      }),
      update: (data: any) => ({
        eq: () => ({
          select: () => ({
            single: () => {
              return { data, error: null };
            }
          })
        })
      }),
      upsert: (data: any) => ({
        select: () => {
          if (inMemoryStore[table]) {
            inMemoryStore[table].push(data);
          } else {
            inMemoryStore[table] = [data];
          }
          return { data, error: null };
        }
      })
    }),
    rpc: (func: string, params: any) => {
      console.log(`Called RPC function ${func} with params:`, params);
      return { data: [], error: null };
    },
    auth: {
      signUp: () => ({ data: null, error: null }),
      signInWithPassword: () => ({ data: null, error: null }),
      signOut: () => ({ error: null }),
      getUser: () => ({ data: { user: null }, error: null }),
      getSession: () => ({ data: { session: null }, error: null })
    },
    channel: (name: string) => {
      const channel = new DummyChannel(name);
      activeChannels[name] = channel;
      return channel;
    },
    removeChannel: (channel: any) => {
      const channelNames = Object.keys(activeChannels);
      for (const name of channelNames) {
        if (activeChannels[name] === channel) {
          delete activeChannels[name];
          console.log(`Removed dummy channel: ${name}`);
          return { error: null };
        }
      }
      return { error: null };
    }
  };
};

// Test the connection immediately
(async () => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials not provided. Running in offline mode.');
      return;
    }
    
    const { error } = await supabase.from('_dummy_test').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase connection test error:', error);
      console.warn('Unable to connect to database. Some features may not work correctly.');
    } else {
      console.log('Supabase connection test: Success!');
    }
  } catch (err) {
    console.error('Supabase connection test exception:', err);
  }
})();

// Export the Supabase client - use real or dummy based on configuration
export const supabaseClient = shouldUseDummyClient ? createDummyClient() : supabase;

// Auth functions
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  // Special handling for existing user error
  if (error) {
    // Check if this is an existing user error
    if (error.message?.includes('User already registered')) {
      // Try to sign in instead
      console.log('User already exists, attempting sign in...');
      const signInResult = await signInWithEmail(email, password);
      return signInResult;
    }
    
    throw error;
  }
  
  // Database trigger automatically handles account creation and signup bonus
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// User account functions
interface UserAccount {
  id?: string;
  user_id?: string;
  email?: string;
  wallet_address?: string;
  reserved_points?: number;
  free_points?: number;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Allow for additional fields
}

export const createUserAccount = async (userId: string, account: Partial<UserAccount>) => {
  console.log('=== CREATE ACCOUNT DEBUG: Starting createUserAccount ===');
  console.log('User ID:', userId);
  console.log('Account data:', account);
  
  try {
    console.log('=== CREATE ACCOUNT DEBUG: About to call supabase.from(user_accounts).insert ===');
    
    const { data, error } = await supabase
      .from('user_accounts')
      .insert({
        user_id: userId,
        free_points: 0, // Points will be awarded separately via signup bonus
        reserved_points: 0,
        ...account,
      })
      .select()
      .single();
    
    console.log('=== CREATE ACCOUNT DEBUG: Insert completed ===');
    console.log('Data:', data);
    console.log('Error:', error);
    
    if (error) {
      console.log('=== CREATE ACCOUNT DEBUG: Throwing error ===');
      throw error;
    }
    
    console.log('=== CREATE ACCOUNT DEBUG: Returning data ===');
    return data;
  } catch (err) {
    console.log('=== CREATE ACCOUNT DEBUG: Caught exception ===');
    console.error('Exception in createUserAccount:', err);
    throw err;
  }
};

export const getUserAccount = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_accounts')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is the error for no rows returned
    throw error;
  }
  
  return data;
};

export const updateUserAccount = async (userId: string, updates: Partial<UserAccount>) => {
  const { data, error } = await supabase
    .from('user_accounts')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const linkWalletToUser = async (userId: string, walletAddress: string) => {
  return updateUserAccount(userId, { wallet_address: walletAddress });
};

// Create wallet account with signup bonus using database function
export const insertRowsAfterSignupFromWallet = async (userId: string, walletAddress: string) => {
  try {
    const { data, error } = await supabase.rpc('insert_rows_after_signup_from_wallet', {
      wallet_user_id: userId,
      wallet_address: walletAddress
    });

    if (error) {
      console.error('Error inserting rows after wallet signup:', error);
      throw error;
    }

    if (data && !data.success) {
      console.error('Wallet signup row insertion failed:', data.error);
      throw new Error(data.error);
    }

    console.log('Rows inserted after wallet signup:', data);
    return data;
  } catch (error) {
    console.error('Exception in insertRowsAfterSignupFromWallet:', error);
    throw error;
  }
};

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !shouldUseDummyClient;
};

// Points functions
export const getPoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return (account?.free_points || 0) + (account?.reserved_points || 0);
};

export const getFreePoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return account?.free_points || 0;
};

export const getReservedPoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return account?.reserved_points || 0;
};

export const updatePoints = async (userId: string, points: number): Promise<number> => {
  const account = await getUserAccount(userId);
  const currentPoints = account?.free_points || 0;
  const newPoints = currentPoints + points;
  
  await updateUserAccount(userId, { free_points: newPoints });
  return newPoints;
};

export const reservePoints = async (userId: string, amount: number): Promise<boolean> => {
  const account = await getUserAccount(userId);
  const free = account?.free_points || 0;
  const reserved = account?.reserved_points || 0;
  
  if (free < amount) {
    return false; // Not enough free points
  }
  
  await updateUserAccount(userId, { 
    free_points: free - amount,
    reserved_points: reserved + amount
  });
  
  return true;
};

export const freePoints = async (userId: string, amount: number): Promise<boolean> => {
  const account = await getUserAccount(userId);
  const free = account?.free_points || 0;
  const reserved = account?.reserved_points || 0;
  
  if (reserved < amount) {
    return false; // Not enough reserved points
  }
  
  await updateUserAccount(userId, { 
    free_points: free + amount,
    reserved_points: reserved - amount
  });
  
  return true;
};

/**
 * Generates a consistent ID for a match based on identifying columns
 * @param sportName The sport name (e.g., "basketball")
 * @param leagueName The league name (e.g., "nba")
 * @param homeTeamName The home team name
 * @param awayTeamName The away team name 
 * @param commenceTime The match commence time
 * @returns A consistent ID string
 */
export const generateMatchId = (
  sportName: string,
  leagueName: string,
  homeTeamName: string,
  awayTeamName: string,
  commenceTime: string
): string => {
  // Normalize all inputs (lowercase, trim spaces)
  const normalizedSport = sportName.toLowerCase().trim();
  const normalizedLeague = leagueName.toLowerCase().trim();
  const normalizedHomeTeam = homeTeamName.toLowerCase().trim().replace(/\s+/g, '_');
  const normalizedAwayTeam = awayTeamName.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Ensure date is in UTC and ISO 8601 format (YYYY-MM-DD)
  const date = new Date(commenceTime);
  const utcDateString = date.toISOString().split('T')[0];
  
  // Combine the values in a consistent order with sport and league prepended
  const idString = `${normalizedSport}_${normalizedLeague}_${normalizedHomeTeam}_vs_${normalizedAwayTeam}_${utcDateString}`;
  
  return idString;
};

// Match storage functions
export const storeMatch = async (match: Match): Promise<boolean> => {
  try {
    // Extract sport and league from sport_key (typically in format "basketball_nba")
    const [sportName, leagueName] = match.sport_key.split('_');
    
    // Generate a consistent ID based on identifying columns
    const generatedId = generateMatchId(
      sportName,
      leagueName,
      match.home_team.name,
      match.away_team.name,
      match.commence_time
    );
    
    console.log('Using generated match ID:', generatedId);
    
    // Check if a match with this ID already exists
    const { data: existingMatch, error: queryError } = await supabaseClient
      .from('matches')
      .select('id')
      .eq('id', generatedId)
      .single();
    
    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking for existing match:', queryError);
      return false;
    }
    
    // If match already exists, consider it a success but don't insert
    if (existingMatch) {
      console.log(`Match with ID ${generatedId} already exists - skipping`);
      return true;
    }
    
    // No duplicate found, insert this match with the generated ID
    const matchRecord = {
      id: generatedId,
      sport_name: sportName,
      league_name: leagueName,
      sport_title: match.sport_title,
      commence_time: match.commence_time,
      home_team_id: match.home_team.id,
      home_team_name: match.home_team.name,
      home_team_logo: match.home_team.logo,
      away_team_id: match.away_team.id,
      away_team_name: match.away_team.name,
      away_team_logo: match.away_team.logo,
      bookmakers: match.bookmakers,
      scores: match.scores,
      completed: match.completed || false,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from('matches')
      .insert(matchRecord);

    if (error) {
      console.error('Error storing match in Supabase:', error);
      return false;
    }

    console.log(`Successfully stored new match with ID ${generatedId}: ${match.home_team.name} vs ${match.away_team.name}`);
    return true;
  } catch (error) {
    console.error('Exception storing match:', error);
    return false;
  }
};

export const storeMatches = async (matches: Match[]): Promise<number> => {
  try {
    let successCount = 0;
    
    // Process each match individually to check for duplicates
    for (const match of matches) {
      try {
        // Extract sport and league from sport_key (typically in format "basketball_nba")
        const [sportName, leagueName] = match.sport_key.split('_');
        
        // Generate a consistent ID based on identifying columns
        const generatedId = generateMatchId(
          sportName,
          leagueName,
          match.home_team.name,
          match.away_team.name,
          match.commence_time
        );
        
        // Check if a match with this ID already exists
        const { data: existingMatch, error: queryError } = await supabaseClient
          .from('matches')
          .select('id')
          .eq('id', generatedId)
          .single();
        
        if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error checking for existing match:', queryError);
          continue;
        }
        
        // If match already exists, skip this one
        if (existingMatch) {
          console.log(`Match with ID ${generatedId} already exists - skipping`);
          successCount++;
          continue;
        }
        
        // No duplicate found, insert this match with the generated ID
        const matchRecord = {
          id: generatedId,
          sport_name: sportName,
          league_name: leagueName,
          sport_title: match.sport_title,
          commence_time: match.commence_time,
          home_team_id: match.home_team.id,
          home_team_name: match.home_team.name,
          home_team_logo: match.home_team.logo,
          away_team_id: match.away_team.id,
          away_team_name: match.away_team.name,
          away_team_logo: match.away_team.logo,
          bookmakers: match.bookmakers,
          scores: match.scores,
          completed: match.completed || false,
          updated_at: new Date().toISOString()
        };
        
        const { error: insertError } = await supabaseClient
          .from('matches')
          .insert(matchRecord);
        
        if (insertError) {
          console.error(`Error storing match in Supabase:`, insertError);
        } else {
          console.log(`Stored new match with ID ${generatedId}: ${match.home_team.name} vs ${match.away_team.name}`);
          successCount++;
        }
      } catch (matchError) {
        console.error(`Error processing match:`, matchError);
      }
    }
    
    console.log(`Successfully processed ${successCount} of ${matches.length} matches`);
    return successCount;
  } catch (error) {
    console.error('Exception storing matches:', error);
    return 0;
  }
};

export const getMatchById = async (id: string): Promise<Match | null> => {
  try {
    // Query the new multi-sport schema with joins
    const { data, error } = await supabaseClient
      .from('matches')
      .select(`
        *,
        match_details_basketball_nba!inner(*)
      `)
      .eq('id', id)
      .single();

    // If found by ID, return it
    if (!error && data) {
      const basketballDetails = data.match_details_basketball_nba;
      
      return {
        id: data.id,
        sport_key: 'basketball_nba', // Based on event_type
        sport_title: 'Basketball', // Default for basketball
        commence_time: data.scheduled_start_time, // Map scheduled_start_time to commence_time
        home_team: {
          id: basketballDetails.home_team_id,
          name: basketballDetails.home_team_name,
          logo: basketballDetails.home_team_logo
        },
        away_team: {
          id: basketballDetails.away_team_id,
          name: basketballDetails.away_team_name,
          logo: basketballDetails.away_team_logo
        },
        bookmakers: data.bookmakers || [],
        scores: basketballDetails.scores || null,
        completed: data.status === 'finished'
      };
    }

    if (error) {
      console.error('Error getting match by ID:', error);
    }
    return null;
  } catch (error) {
    console.error('Exception getting match by ID:', error);
    return null;
  }
};

export const getUpcomingMatches = async (limit: number = 50): Promise<Match[]> => {
  try {
    const now = new Date().toISOString();
    
    // First get matches from the main table
    // Temporarily allowing past matches for testing - remove this filter in production
    const { data: matchesData, error: matchesError } = await supabaseClient
      .from('matches')
      .select('*')
      // .gt('scheduled_start_time', now)  // Commented out to include past matches for testing
      .eq('status', 'upcoming')
      .eq('event_type', 'basketball_nba')
      .order('scheduled_start_time', { ascending: true })
      .limit(limit);

    if (matchesError) {
      console.error('Error getting matches:', matchesError);
      return [];
    }

    if (!matchesData || matchesData.length === 0) {
      console.log('No upcoming matches found');
      return [];
    }

    // Get the details_ids from matches
    const detailsIds = matchesData.map(match => match.details_id);
    
    // Get basketball details for these matches with team info
    const { data: basketballData, error: basketballError } = await supabaseClient
      .from('match_details_basketball_nba')
      .select(`
        *,
        home_team:teams_nba!match_details_basketball_nba_home_team_id_fkey(*),
        away_team:teams_nba!match_details_basketball_nba_away_team_id_fkey(*)
      `)
      .in('id', detailsIds);

    if (basketballError) {
      console.error('Error getting basketball details:', basketballError);
      return [];
    }

    // Create a map of details for quick lookup
    const detailsMap = new Map();
    (basketballData || []).forEach(detail => {
      detailsMap.set(detail.id, detail);
    });

    // Convert from new multi-sport schema to Match format expected by UI
    return matchesData.map(item => {
      const basketballDetails = detailsMap.get(item.details_id);
      
      if (!basketballDetails) {
        console.warn(`No basketball details found for match ${item.id} with details_id ${item.details_id}`);
        return null;
      }
      
      const homeTeam = basketballDetails.home_team;
      const awayTeam = basketballDetails.away_team;
      
      return {
        id: item.id,
        sport_key: 'basketball_nba', // Based on event_type
        sport_title: 'NBA', // Updated to match sport_title
        sport_name: 'basketball',
        league_name: 'nba',
        commence_time: item.scheduled_start_time, // Map scheduled_start_time to commence_time
        home_team: {
          id: basketballDetails.home_team_id,
          name: homeTeam ? `${homeTeam.city} ${homeTeam.name}` : basketballDetails.home_team_id,
          logo: homeTeam?.logo_url || null
        },
        away_team: {
          id: basketballDetails.away_team_id,
          name: awayTeam ? `${awayTeam.city} ${awayTeam.name}` : basketballDetails.away_team_id,
          logo: awayTeam?.logo_url || null
        },
        bookmakers: item.bookmakers || [],
        scores: basketballDetails.scores || null,
        completed: item.status === 'finished'
      };
    }).filter(match => match !== null); // Remove any null entries
  } catch (error) {
    console.error('Exception getting upcoming matches:', error);
    return [];
  }
};

export const updateMatchScores = async (
  matchId: string, 
  homeScore: number, 
  awayScore: number, 
  completed: boolean = false
): Promise<boolean> => {
  try {
    // Try to update by ID
    const { error } = await supabaseClient
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

// TODO: Add new multi-sport architecture functions here after resolving TypeScript issues with mock Supabase client 