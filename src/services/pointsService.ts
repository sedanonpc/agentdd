/**
 * Points Service
 * 
 * Handles all points-related operations including balance queries,
 * transactions, and point modifications.
 */

import { supabase } from './userAccountsService';

// Default points for new users
export const DEFAULT_POINTS = 500;

export interface Transaction {
  id: string;
  affected_user_id: string;
  transaction_key: string;
  affected_balance: string;
  amount: number;
  common_event_id: string;
  details: any;
  created_at: string;
}

/**
 * Get total user points (free + reserved)
 */
export const getTotalUserPoints = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('free_points, reserved_points')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting total user points:', error);
      return 0;
    }

    return (data?.free_points || 0) + (data?.reserved_points || 0);
  } catch (error) {
    console.error('Error getting total user points:', error);
    return 0;
  }
};

/**
 * Get user's free points
 */
export const getUserFreePoints = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('free_points')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting user free points:', error);
      return 0;
    }

    return data?.free_points || 0;
  } catch (error) {
    console.error('Error getting user free points:', error);
    return 0;
  }
};

/**
 * Get user's reserved points
 */
export const getUserReservedPoints = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('reserved_points')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting user reserved points:', error);
      return 0;
    }

    return data?.reserved_points || 0;
  } catch (error) {
    console.error('Error getting user reserved points:', error);
    return 0;
  }
};

/**
 * Get user's transaction history
 */
export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('affected_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user transactions:', error);
    return [];
  }
};

/**
 * Deduct points for a bet (reserve them)
 */
export const deductBetPoints = async (userId: string, amount: number, betId: string): Promise<boolean> => {
  try {
    // First, check if user has enough free points
    const freePoints = await getUserFreePoints(userId);
    if (freePoints < amount) {
      console.error('Insufficient free points for bet');
      return false;
    }

    // Update user account: move points from free to reserved
    const { error: updateError } = await supabase
      .from('user_accounts')
      .update({
        free_points: freePoints - amount,
        reserved_points: (await getUserReservedPoints(userId)) + amount
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating points for bet:', updateError);
      return false;
    }

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        affected_user_id: userId,
        transaction_key: 'BET_PLACED',
        affected_balance: 'FREE',
        amount: -amount,
        details: { betId, action: 'bet_placed' }
      });

    if (transactionError) {
      console.error('Error recording bet transaction:', transactionError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deducting bet points:', error);
    return false;
  }
};

/**
 * Add points when a bet is won
 */
export const addBetWinPoints = async (userId: string, amount: number, betId: string): Promise<boolean> => {
  try {
    // Add points to free balance
    const currentFreePoints = await getUserFreePoints(userId);
    const { error: updateError } = await supabase
      .from('user_accounts')
      .update({
        free_points: currentFreePoints + amount
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error adding bet win points:', updateError);
      return false;
    }

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        affected_user_id: userId,
        transaction_key: 'BET_WON',
        affected_balance: 'FREE',
        amount: amount,
        details: { betId, action: 'bet_won' }
      });

    if (transactionError) {
      console.error('Error recording bet win transaction:', transactionError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding bet win points:', error);
    return false;
  }
};

/**
 * Award points to a user (general purpose)
 */
export const awardPoints = async (userId: string, amount: number, description: string): Promise<boolean> => {
  try {
    // Add points to free balance
    const currentFreePoints = await getUserFreePoints(userId);
    const { error: updateError } = await supabase
      .from('user_accounts')
      .update({
        free_points: currentFreePoints + amount
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error awarding points:', updateError);
      return false;
    }

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        affected_user_id: userId,
        transaction_key: 'POINTS_AWARDED',
        affected_balance: 'FREE',
        amount: amount,
        details: { description, action: 'points_awarded' }
      });

    if (transactionError) {
      console.error('Error recording points awarded transaction:', transactionError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error awarding points:', error);
    return false;
  }
};

/**
 * Reserve points (move from free to reserved)
 */
export const reservePoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    const freePoints = await getUserFreePoints(userId);
    if (freePoints < amount) {
      console.error('Insufficient free points to reserve');
      return false;
    }

    const reservedPoints = await getUserReservedPoints(userId);
    
    const { error: updateError } = await supabase
      .from('user_accounts')
      .update({
        free_points: freePoints - amount,
        reserved_points: reservedPoints + amount
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error reserving points:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error reserving points:', error);
    return false;
  }
};

/**
 * Free points (move from reserved to free)
 */
export const freePoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    const reservedPoints = await getUserReservedPoints(userId);
    if (reservedPoints < amount) {
      console.error('Insufficient reserved points to free');
      return false;
    }

    const freePoints = await getUserFreePoints(userId);
    
    const { error: updateError } = await supabase
      .from('user_accounts')
      .update({
        reserved_points: reservedPoints - amount,
        free_points: freePoints + amount
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error freeing points:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error freeing points:', error);
    return false;
  }
};

/**
 * Record a transaction
 */
export const recordTransaction = async (
  userId: string,
  transactionKey: string,
  affectedBalance: string,
  amount: number,
  details: any
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('point_transactions')
      .insert({
        affected_user_id: userId,
        transaction_key: transactionKey,
        affected_balance: affectedBalance,
        amount: amount,
        details: details
      });

    if (error) {
      console.error('Error recording transaction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error recording transaction:', error);
    return false;
  }
}; 