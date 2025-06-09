import { createClient } from '@supabase/supabase-js';

// Supabase configuration - replace these with your actual Supabase project URL and anon key
// Get these from your Supabase project settings > API
// If not set, we'll use default development values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-dev-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-dev-anon-key';

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
  
  if (error) throw error;
  
  // If successful, create a user profile record
  if (data.user) {
    await createUserProfile(data.user.id, {
      email: data.user.email,
      dare_points: 500, // Initialize new users with 500 DARE points
    });
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