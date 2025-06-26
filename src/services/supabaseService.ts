import { createClient } from '@supabase/supabase-js';
import { Match, Team } from '../types'; // Add Match and Team import

// Supabase configuration
// Hardcoded values as a fallback when env variables have issues
const fixedSupabaseUrl = 'https://qiasnpjpkzhretlyymgh.supabase.co';
const fixedSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXNucGpwa3pocmV0bHl5bWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMzI5MDksImV4cCI6MjA2NDgwODkwOX0.BEOkmjVpGHo37omVsWEgvsCnXB0FIVqZQvDNCuy3qYo';

// Try to use environment variables, fall back to fixed values if there's an issue
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fixedSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fixedSupabaseAnonKey;

// When in development mode and no proper keys are set, use a dummy client
const isDevelopment = import.meta.env.DEV;
const isProperlyConfigured = supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 10;
const shouldUseDummyClient = isDevelopment && !isProperlyConfigured;

// Log the Supabase URL for debugging
console.log('Supabase URL:', supabaseUrl ? (shouldUseDummyClient ? 'USING DUMMY CLIENT' : supabaseUrl.substring(0, 15) + '...') : 'NOT SET');
console.log('Supabase Anon Key present:', !!supabaseAnonKey && !shouldUseDummyClient);
console.log('Using dummy client:', shouldUseDummyClient);

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    // Log the error for debugging
    console.error('Registration error:', error);
    
    // Check if this is an existing user error
    if (error.message?.includes('User already registered')) {
      // Try to sign in instead
      console.log('User already exists, attempting sign in...');
      const signInResult = await signInWithEmail(email, password);
      return signInResult;
    }
    
    throw error;
  }
  
  // If successful, create a user profile record
  if (data.user) {
    try {
      await createUserAccount(data.user.id, {
        email: data.user.email,
      });
      
      // Award signup bonus DARE points based on configuration
      try {
        const { awardSignupBonus } = await import('./darePointsConfigService');
        const bonusAwarded = await awardSignupBonus(data.user.id);
        
        if (bonusAwarded) {
          console.log('Signup bonus awarded successfully to user:', data.user.id);
        } else {
          console.warn('Failed to award signup bonus to user:', data.user.id);
        }
      } catch (bonusError) {
        // Don't fail the signup if bonus awarding fails
        console.error('Error awarding signup bonus:', bonusError);
      }
    } catch (profileError) {
      // If profile creation fails, but auth succeeded, just log error
      console.error('Error creating user account:', profileError);
    }
  }
  
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
  reserved_dare_points?: number;
  free_dare_points?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Allow for additional fields
}

export const createUserAccount = async (userId: string, account: Partial<UserAccount>) => {
  const { data, error } = await supabase
    .from('user_accounts')
    .insert({
      user_id: userId,
      free_dare_points: 0, // Points will be awarded separately via signup bonus
      reserved_dare_points: 0,
      ...account,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
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

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !shouldUseDummyClient;
};

// DARE Points functions
export const getDarePoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return (account?.free_dare_points || 0) + (account?.reserved_dare_points || 0);
};

export const getFreeDarePoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return account?.free_dare_points || 0;
};

export const getReservedDarePoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return account?.reserved_dare_points || 0;
};

export const updateDarePoints = async (userId: string, points: number): Promise<number> => {
  const account = await getUserAccount(userId);
  const currentPoints = account?.free_dare_points || 0;
  const newPoints = currentPoints + points;
  
  await updateUserAccount(userId, { free_dare_points: newPoints });
  return newPoints;
};

export const reserveDarePoints = async (userId: string, amount: number): Promise<boolean> => {
  const account = await getUserAccount(userId);
  const free = account?.free_dare_points || 0;
  const reserved = account?.reserved_dare_points || 0;
  
  if (free < amount) {
    return false; // Not enough free points
  }
  
  await updateUserAccount(userId, { 
    free_dare_points: free - amount,
    reserved_dare_points: reserved + amount
  });
  
  return true;
};

export const freeDarePoints = async (userId: string, amount: number): Promise<boolean> => {
  const account = await getUserAccount(userId);
  const free = account?.free_dare_points || 0;
  const reserved = account?.reserved_dare_points || 0;
  
  if (reserved < amount) {
    return false; // Not enough reserved points
  }
  
  await updateUserAccount(userId, { 
    free_dare_points: free + amount,
    reserved_dare_points: reserved - amount
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
    // Try to get by ID
    const { data, error } = await supabaseClient
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    // If found by ID, return it
    if (!error && data) {
      // Reconstruct sport_key from sport_name and league_name
      const sport_key = `${data.sport_name}_${data.league_name}`;
      
      return {
        id: data.id,
        sport_key: sport_key, // Reconstructed for backward compatibility
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
        bookmakers: data.bookmakers,
        scores: data.scores,
        completed: data.completed
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
    
    const { data, error } = await supabaseClient
      .from('matches')
      .select('*')
      .gt('commence_time', now)
      .eq('completed', false)
      .order('commence_time', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error getting upcoming matches:', error);
      return [];
    }

    // Convert from DB format to Match format
    return (data || []).map(item => {
      // Reconstruct sport_key from sport_name and league_name
      const sport_key = `${item.sport_name}_${item.league_name}`;
      
      return {
        id: item.id,
        sport_key: sport_key, // Reconstructed for backward compatibility
        sport_title: item.sport_title,
        commence_time: item.commence_time,
        home_team: {
          id: item.home_team_id,
          name: item.home_team_name,
          logo: item.home_team_logo
        },
        away_team: {
          id: item.away_team_id,
          name: item.away_team_name,
          logo: item.away_team_logo
        },
        bookmakers: item.bookmakers,
        scores: item.scores,
        completed: item.completed
      };
    });
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