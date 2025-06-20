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
    user_profiles: [],
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
      await createUserProfile(data.user.id, {
        email: data.user.email,
        dare_points: 500, // Initialize new users with 500 DARE points
      });
    } catch (profileError) {
      // If profile creation fails, but auth succeeded, just log error
      console.error('Error creating user profile:', profileError);
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

// User profile functions
interface UserProfile {
  id?: string;
  user_id?: string;
  email?: string;
  wallet_address?: string;
  dare_points?: number; // Added DARE points field
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Allow for additional fields
}

export const createUserProfile = async (userId: string, profile: UserProfile) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      dare_points: 500, // Default value for new users
      ...profile,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is the error for no rows returned
    throw error;
  }
  
  return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const linkWalletToUser = async (userId: string, walletAddress: string) => {
  return updateUserProfile(userId, { wallet_address: walletAddress });
};

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !shouldUseDummyClient;
};

// DARE Points functions
export const getDarePoints = async (userId: string): Promise<number> => {
  const profile = await getUserProfile(userId);
  return profile?.dare_points || 0;
};

export const updateDarePoints = async (userId: string, points: number): Promise<number> => {
  const profile = await getUserProfile(userId);
  const currentPoints = profile?.dare_points || 0;
  const newPoints = currentPoints + points;
  
  await updateUserProfile(userId, { dare_points: newPoints });
  return newPoints;
};

// Match storage functions
export const storeMatch = async (match: Match): Promise<boolean> => {
  try {
    console.log('Checking if match already exists in Supabase:', match.id);
    
    // Check if a similar match already exists based on teams and time
    const { data: existingMatches, error: queryError } = await supabaseClient
      .from('matches')
      .select('id')
      .eq('home_team_name', match.home_team.name)
      .eq('away_team_name', match.away_team.name)
      // Compare dates within a 12-hour window to account for small time differences
      .gte('commence_time', new Date(new Date(match.commence_time).getTime() - 12 * 60 * 60 * 1000).toISOString())
      .lte('commence_time', new Date(new Date(match.commence_time).getTime() + 12 * 60 * 60 * 1000).toISOString());
    
    if (queryError) {
      console.error('Error checking for existing match:', queryError);
      return false;
    }
    
    // If a similar match already exists, consider it a success but don't insert
    if (existingMatches && existingMatches.length > 0) {
      console.log(`Match between ${match.home_team.name} and ${match.away_team.name} on ${new Date(match.commence_time).toLocaleDateString()} already exists - skipping`);
      return true;
    }
    
    // No duplicate found, insert this match
    const matchRecord = {
      id: match.id,
      sport_key: match.sport_key,
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

    console.log(`Successfully stored new match: ${match.home_team.name} vs ${match.away_team.name}`);
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
        // Check if a similar match already exists based on teams and time
        const { data: existingMatches, error: queryError } = await supabaseClient
          .from('matches')
          .select('id')
          .eq('home_team_name', match.home_team.name)
          .eq('away_team_name', match.away_team.name)
          // Compare dates within a 12-hour window to account for small time differences
          .gte('commence_time', new Date(new Date(match.commence_time).getTime() - 12 * 60 * 60 * 1000).toISOString())
          .lte('commence_time', new Date(new Date(match.commence_time).getTime() + 12 * 60 * 60 * 1000).toISOString());
        
        if (queryError) {
          console.error('Error checking for existing match:', queryError);
          continue;
        }
        
        // If a similar match already exists, skip this one
        if (existingMatches && existingMatches.length > 0) {
          console.log(`Match between ${match.home_team.name} and ${match.away_team.name} on ${new Date(match.commence_time).toLocaleDateString()} already exists - skipping`);
          successCount++;
          continue;
        }
        
        // No duplicate found, insert this match
        const matchRecord = {
          id: match.id,
          sport_key: match.sport_key,
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
          console.log(`Stored new match: ${match.home_team.name} vs ${match.away_team.name} on ${new Date(match.commence_time).toLocaleDateString()}`);
          successCount++;
        }
      } catch (matchError) {
        console.error(`Error processing match ${match.id}:`, matchError);
      }
    }
    
    console.log(`Successfully processed ${successCount} of ${matches.length} matches`);
    return successCount;
  } catch (error) {
    console.error('Exception storing matches:', error);
    return 0;
  }
};

export const getMatchById = async (id: string, homeTeamName?: string, awayTeamName?: string, commenceTime?: string): Promise<Match | null> => {
  try {
    // First try to get by ID
    const { data, error } = await supabaseClient
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    // If found by ID, return it
    if (!error && data) {
      return {
        id: data.id,
        sport_key: data.sport_key,
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
    
    // If not found by ID and we have team names and time, try to find by those
    if (homeTeamName && awayTeamName && commenceTime) {
      console.log(`Could not find match with ID ${id}, trying to find by team names and time`);
      
      // Find matches with these team names around the commence time
      const { data: matchData, error: findError } = await supabaseClient
        .from('matches')
        .select('*')
        .eq('home_team_name', homeTeamName)
        .eq('away_team_name', awayTeamName)
        // Compare dates within a 12-hour window to account for small time differences
        .gte('commence_time', new Date(new Date(commenceTime).getTime() - 12 * 60 * 60 * 1000).toISOString())
        .lte('commence_time', new Date(new Date(commenceTime).getTime() + 12 * 60 * 60 * 1000).toISOString());
      
      if (findError || !matchData || matchData.length === 0) {
        console.error('Error finding match by team names and time:', findError || 'No matches found');
        return null;
      }
      
      // Return the first matching match
      const foundMatch = matchData[0];
      console.log(`Found match with ID ${foundMatch.id} instead of ${id}`);
      
      return {
        id: foundMatch.id,
        sport_key: foundMatch.sport_key,
        sport_title: foundMatch.sport_title,
        commence_time: foundMatch.commence_time,
        home_team: {
          id: foundMatch.home_team_id,
          name: foundMatch.home_team_name,
          logo: foundMatch.home_team_logo
        },
        away_team: {
          id: foundMatch.away_team_id,
          name: foundMatch.away_team_name,
          logo: foundMatch.away_team_logo
        },
        bookmakers: foundMatch.bookmakers,
        scores: foundMatch.scores,
        completed: foundMatch.completed
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
    return (data || []).map(item => ({
      id: item.id,
      sport_key: item.sport_key,
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
    }));
  } catch (error) {
    console.error('Exception getting upcoming matches:', error);
    return [];
  }
};

export const updateMatchScores = async (
  matchId: string, 
  homeScore: number, 
  awayScore: number, 
  homeTeamName?: string,
  awayTeamName?: string,
  commenceTime?: string,
  completed: boolean = false
): Promise<boolean> => {
  try {
    // First try to update by ID
    const { error, count } = await supabaseClient
      .from('matches')
      .update({
        scores: { home: homeScore, away: awayScore },
        completed: completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId);

    // If update failed or no rows were updated, and we have team names and time, try to find by those
    if ((error || count === 0) && homeTeamName && awayTeamName && commenceTime) {
      console.log(`Could not update match with ID ${matchId}, trying to find by team names and time`);
      
      // Find matches with these team names around the commence time
      const { data: matchData, error: findError } = await supabaseClient
        .from('matches')
        .select('id')
        .eq('home_team_name', homeTeamName)
        .eq('away_team_name', awayTeamName)
        // Compare dates within a 12-hour window to account for small time differences
        .gte('commence_time', new Date(new Date(commenceTime).getTime() - 12 * 60 * 60 * 1000).toISOString())
        .lte('commence_time', new Date(new Date(commenceTime).getTime() + 12 * 60 * 60 * 1000).toISOString());
      
      if (findError || !matchData || matchData.length === 0) {
        console.error('Error finding match by team names and time:', findError || 'No matches found');
        return false;
      }
      
      // Update the first matching match
      const foundMatchId = matchData[0].id;
      console.log(`Found match with ID ${foundMatchId}, updating scores`);
      
      const { error: updateError } = await supabaseClient
        .from('matches')
        .update({
          scores: { home: homeScore, away: awayScore },
          completed: completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', foundMatchId);
      
      if (updateError) {
        console.error('Error updating match scores by team names:', updateError);
        return false;
      }
      
      return true;
    }

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