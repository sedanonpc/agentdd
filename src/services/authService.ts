/**
 * Authentication Service
 * 
 * Handles authentication operations using Supabase Auth.
 * This service is focused on auth.users table operations only.
 * 
 * For user account/profile operations, use userAccountsService.ts
 */

import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

// Supabase configuration (copied from deprecated supabaseService.ts)
const fixedSupabaseUrl = 'https://qiasnpjpkzhretlyymgh.supabase.co';
const fixedSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXNucGpwa3pocmV0bHl5bWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMzI5MDksImV4cCI6MjA2NDgwODkwOX0.BEOkmjVpGHo37omVsWEgvsCnXB0FIVqZQvDNCuy3qYo';

let supabaseUrl = '';
try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fixedSupabaseUrl;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('Invalid Supabase URL format:', supabaseUrl);
    supabaseUrl = fixedSupabaseUrl;
  }
} catch (error) {
  console.error('Error accessing Supabase URL:', error);
  supabaseUrl = fixedSupabaseUrl;
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fixedSupabaseAnonKey;

// Initialize the Supabase client
let supabase = createClient(fixedSupabaseUrl, fixedSupabaseAnonKey);
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('AuthService: Supabase client initialized successfully');
  }
} catch (error) {
  console.error('AuthService: Failed to initialize Supabase client:', error);
}

export { supabase };

/**
 * Helper function to wait for user account creation after signup
 * This is needed because the database trigger might take a moment to create the user_accounts record
 */
const waitForUserAccount = async (userId: string, maxAttempts = 10): Promise<boolean> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Import here to avoid circular dependency
      const { getUserAccount } = await import('./userAccountsService');
      const account = await getUserAccount(userId);
      if (account) {
        console.log('AuthService: User account created successfully');
        return true;
      }
      // Wait 200ms between attempts
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log('AuthService: Still waiting for user account creation...');
    }
  }
  return false;
};

/**
 * Sign up a new user with email and password
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<{ user: User, session: Session }> - The created user and session
 * @throws Error if signup fails
 */
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    // Special handling for existing user error
    if (error) {
      // Check if this is an existing user error
      if (error.message?.includes('User already registered')) {
        // Try to sign in instead
        console.log('AuthService: User already exists, attempting sign in...');
        const signInResult = await signInWithEmail(email, password);
        return signInResult;
      }
      throw error;
    }

    if (!data.user) {
      throw new Error('No user data returned from signup');
    }

    // Wait for the database trigger to complete and user account to be created
    console.log('AuthService: Waiting for user account creation...');
    const accountCreated = await waitForUserAccount(data.user.id);
    
    if (!accountCreated) {
      throw new Error('Timeout waiting for user account creation');
    }

    return data;
  } catch (error) {
    console.error('AuthService: Signup error:', error);
    throw error;
  }
};

/**
 * Sign in an existing user with email and password
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<{ user: User, session: Session }> - The user and session
 * @throws Error if signin fails
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

/**
 * Sign out the current user
 * 
 * @throws Error if signout fails
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get the current authenticated user
 * 
 * @returns Promise<User | null> - The current user or null if not authenticated
 * @throws Error if request fails
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

/**
 * Get the current session
 * 
 * @returns Promise<Session | null> - The current session or null if not authenticated
 * @throws Error if request fails
 */
export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

/**
 * Helper function to check if Supabase is properly configured
 * 
 * @returns boolean - true if Supabase is configured, false otherwise
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey && supabaseAnonKey.length > 10);
}; 