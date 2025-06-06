import { createClient } from '@supabase/supabase-js';

// Supabase configuration - replace these with your actual Supabase project URL and anon key
// Get these from your Supabase project settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Log the Supabase URL for debugging
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key present:', !!supabaseAnonKey);

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test the connection immediately
(async () => {
  try {
    const { error } = await supabase.from('_dummy_test').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase connection test error:', error);
    } else {
      console.log('Supabase connection test: Success!');
    }
  } catch (err) {
    console.error('Supabase connection test exception:', err);
  }
})();

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
  return Boolean(supabaseUrl && supabaseAnonKey);
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