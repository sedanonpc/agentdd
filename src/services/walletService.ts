/**
 * Simple Wallet Service
 * 
 * Handles wallet user registration and account management.
 * This service is separate from email authentication and doesn't interfere with it.
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
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
    console.log('WalletService: Supabase client initialized successfully');
  }
} catch (error) {
  console.error('WalletService: Failed to initialize Supabase client:', error);
}

export { supabase };

/**
 * Interface for wallet user account
 */
export interface WalletUser {
  id: string;
  wallet_address: string;
  username: string;
  free_points: number;
  reserved_points: number;
  total_points: number;
}

/**
 * Register a new wallet user with signup bonus
 * 
 * @param walletAddress - The wallet address to register
 * @returns Promise<WalletUser> - The created wallet user account
 * @throws Error if registration fails
 */
export const registerWalletUser = async (walletAddress: string): Promise<WalletUser> => {
  console.log('WalletService: Registering wallet user:', walletAddress);
  
  try {
    const { data, error } = await supabase.rpc('register_wallet_user_simple', {
      input_wallet_address: walletAddress
    });

    if (error) {
      console.error('WalletService: Error registering wallet user:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from wallet registration');
    }

    const user = data[0];
    console.log('WalletService: Wallet user registered successfully:', user);
    return user;
  } catch (error) {
    console.error('WalletService: Exception registering wallet user:', error);
    throw error;
  }
};

/**
 * Get wallet user account by wallet address
 * 
 * @param walletAddress - The wallet address to look up
 * @returns Promise<WalletUser | null> - The wallet user account or null if not found
 * @throws Error if query fails
 */
export const getWalletUser = async (walletAddress: string): Promise<WalletUser | null> => {
  console.log('WalletService: Getting wallet user:', walletAddress);
  
  try {
    const { data, error } = await supabase.rpc('get_wallet_user', {
      input_wallet_address: walletAddress
    });

    if (error) {
      console.error('WalletService: Error getting wallet user:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('WalletService: No wallet user found for address:', walletAddress);
      return null;
    }

    const user = data[0];
    console.log('WalletService: Found wallet user:', user);
    return user;
  } catch (error) {
    console.error('WalletService: Exception getting wallet user:', error);
    throw error;
  }
};

/**
 * Check if a wallet user exists
 * 
 * @param walletAddress - The wallet address to check
 * @returns Promise<boolean> - true if user exists, false otherwise
 */
export const walletUserExists = async (walletAddress: string): Promise<boolean> => {
  try {
    const user = await getWalletUser(walletAddress);
    return user !== null;
  } catch (error) {
    console.error('WalletService: Error checking if wallet user exists:', error);
    return false;
  }
}; 