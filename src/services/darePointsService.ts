import { supabase } from './supabaseService';
import { getCurrentUser, getUserProfile, updateUserProfile } from './supabaseService';

// Constants
export const LOCAL_STORAGE_KEY = 'dare_points_cache';
export const DEFAULT_POINTS = 500; // Consistent default value

/**
 * Interface for DARE Points transaction
 */
export interface DareTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'BET_PLACED' | 'BET_WON' | 'REWARD' | 'DEPOSIT' | 'WITHDRAWAL';
  description: string;
  betId?: string;
  timestamp: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

/**
 * Get user's DARE points from Supabase with local fallback
 */
export const getUserDarePoints = async (userId: string): Promise<number> => {
  try {
    // Try to get from Supabase first
    const profile = await getUserProfile(userId);
    if (profile?.dare_points !== undefined) {
      // Cache to local storage
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ points: profile.dare_points, timestamp: Date.now() })
      );
      return profile.dare_points;
    }
    
    // If not in Supabase, try local storage
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { points } = JSON.parse(cached);
      return points;
    }
    
    // Default value if nothing found
    return DEFAULT_POINTS;
  } catch (error) {
    console.error('Error fetching DARE points:', error);
    
    // Try local cache on error
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { points } = JSON.parse(cached);
      return points;
    }
    
    return DEFAULT_POINTS;
  }
};

/**
 * Update user's DARE points
 */
export const updateUserDarePoints = async (userId: string, points: number): Promise<boolean> => {
  try {
    await updateUserProfile(userId, { dare_points: points });
    
    // Update local cache
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY}_${userId}`, 
      JSON.stringify({ points, timestamp: Date.now() })
    );
    return true;
  } catch (error) {
    console.error('Error updating DARE points:', error);
    return false;
  }
};

/**
 * Add or subtract points
 */
export const adjustUserDarePoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    const currentPoints = await getUserDarePoints(userId);
    return updateUserDarePoints(userId, currentPoints + amount);
  } catch (error) {
    console.error('Error adjusting DARE points:', error);
    return false;
  }
};

/**
 * Record a DARE points transaction
 */
export const recordTransaction = async (
  transaction: Omit<DareTransaction, 'id' | 'timestamp' | 'status'>
): Promise<DareTransaction | null> => {
  try {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const timestamp = Date.now();
    const status = 'COMPLETED';
    
    const newTransaction: DareTransaction = {
      ...transaction,
      id,
      timestamp,
      status
    };
    
    // In a real app, we'd store this in Supabase
    // For now, we'll just store it in local storage
    const storageKey = `dare_transactions_${transaction.userId}`;
    const storedTransactions = localStorage.getItem(storageKey);
    const transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
    
    transactions.push(newTransaction);
    localStorage.setItem(storageKey, JSON.stringify(transactions));
    
    return newTransaction;
  } catch (error) {
    console.error('Error recording transaction:', error);
    return null;
  }
};

/**
 * Get user's transaction history
 */
export const getUserTransactions = (userId: string): DareTransaction[] => {
  try {
    const storageKey = `dare_transactions_${userId}`;
    const storedTransactions = localStorage.getItem(storageKey);
    return storedTransactions ? JSON.parse(storedTransactions) : [];
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
};

/**
 * Add points for a bet win
 */
export const addBetWinPoints = async (userId: string, amount: number, betId: string): Promise<boolean> => {
  try {
    // Add points to user's balance
    const success = await adjustUserDarePoints(userId, amount);
    
    if (success) {
      // Record the transaction
      await recordTransaction({
        userId,
        amount,
        type: 'BET_WON',
        description: `Won ${amount} $DARE from bet ${betId}`,
        betId
      });
    }
    
    return success;
  } catch (error) {
    console.error('Error adding bet win points:', error);
    return false;
  }
};

/**
 * Deduct points for placing a bet
 */
export const deductBetPoints = async (userId: string, amount: number, betId: string): Promise<boolean> => {
  try {
    // Check if user has enough points
    const currentPoints = await getUserDarePoints(userId);
    if (currentPoints < amount) {
      return false;
    }
    
    // Deduct points from user's balance
    const success = await adjustUserDarePoints(userId, -amount);
    
    if (success) {
      // Record the transaction
      await recordTransaction({
        userId,
        amount: -amount,
        type: 'BET_PLACED',
        description: `Placed a bet of ${amount} $DARE`,
        betId
      });
    }
    
    return success;
  } catch (error) {
    console.error('Error deducting bet points:', error);
    return false;
  }
};

/**
 * Award points for daily actions, referrals, etc.
 */
export const awardPoints = async (userId: string, amount: number, reason: string): Promise<boolean> => {
  try {
    // Add points to user's balance
    const success = await adjustUserDarePoints(userId, amount);
    
    if (success) {
      // Record the transaction
      await recordTransaction({
        userId,
        amount,
        type: 'REWARD',
        description: reason
      });
    }
    
    return success;
  } catch (error) {
    console.error('Error awarding points:', error);
    return false;
  }
}; 