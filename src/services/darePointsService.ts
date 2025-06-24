import { supabase } from './supabaseService';
import { 
  getCurrentUser, 
  getUserAccount, 
  updateUserAccount, 
  getFreeDarePoints as getSupabaseFreeDarePoints,
  getReservedDarePoints as getSupabaseReservedDarePoints,
  provisionDarePoints as supabaseReserveDarePoints,
  unprovisionDarePoints as supabaseFreeDarePoints,
  updateDarePoints
} from './supabaseService';

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
 * Ensure the user_accounts table exists
 */
export const ensureDarePointsStructure = async (): Promise<void> => {
  try {
    // Try to access the user_accounts table
    const { error } = await supabase.from('user_accounts').select('id').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is the error for no rows returned
      console.error('Error ensuring user_accounts structure:', error);
      
      // Try direct SQL approach as fallback
      const { error: alterError } = await supabase.from('_temp_ensure_structure')
        .select('*')
        .limit(1)
        .single();
      
      // We expect an error here, but it should indicate the database is working
      if (alterError && alterError.code !== 'PGRST116') {
        console.error('Fallback check failed:', alterError);
      }
    }
  } catch (error) {
    console.error('Exception ensuring user_accounts structure:', error);
  }
};

/**
 * Get user's total DARE points from Supabase with local fallback
 */
export const getUserDarePoints = async (userId: string): Promise<number> => {
  try {
    // First ensure the structure exists
    await ensureDarePointsStructure();
    
    // Try to get from Supabase first
    const account = await getUserAccount(userId);
    
    // Check if account exists
    if (account) {
      const totalPoints = (account.free_dare_points || 0) + (account.reserved_dare_points || 0);
      
      // Cache to local storage
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ 
          total: totalPoints,
          unprovisioned: account.free_dare_points || 0,
          provisioned: account.reserved_dare_points || 0,
          timestamp: Date.now() 
        })
      );
      
      return totalPoints;
    }
    
    // If profile exists but points don't exist, try to add them
    if (account && (!('free_dare_points' in account) || !('reserved_dare_points' in account))) {
      try {
        // Try to update the profile with points
        const updatedAccount = await updateUserAccount(userId, { 
          free_dare_points: DEFAULT_POINTS,
          reserved_dare_points: 0
        });
        
        // Cache to local storage
        localStorage.setItem(
          `${LOCAL_STORAGE_KEY}_${userId}`, 
          JSON.stringify({ 
            total: DEFAULT_POINTS,
            unprovisioned: DEFAULT_POINTS,
            provisioned: 0,
            timestamp: Date.now() 
          })
        );
        
        return DEFAULT_POINTS;
      } catch (updateError) {
        console.error('Error adding points to account:', updateError);
      }
    }
    
    // If not in Supabase or points couldn't be added, try local storage
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { total } = JSON.parse(cached);
      return total;
    }
    
    // Default value if nothing found
    return DEFAULT_POINTS;
  } catch (error) {
    console.error('Error fetching DARE points:', error);
    
    // Try local cache on error
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { total } = JSON.parse(cached);
      return total;
    }
    
    return DEFAULT_POINTS;
  }
};

/**
 * Get user's free DARE points
 */
export const getUserFreeDarePoints = async (userId: string): Promise<number> => {
  try {
    // First ensure the structure exists
    await ensureDarePointsStructure();
    
    // Try to get from Supabase first
    return await getSupabaseFreeDarePoints(userId);
  } catch (error) {
    console.error('Error fetching free DARE points:', error);
    
    // Try local cache on error
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { unprovisioned } = JSON.parse(cached);
      return unprovisioned || 0;
    }
    
    return 0;
  }
};

/**
 * Get user's reserved DARE points
 */
export const getUserReservedDarePoints = async (userId: string): Promise<number> => {
  try {
    // First ensure the structure exists
    await ensureDarePointsStructure();
    
    // Try to get from Supabase first
    return await getSupabaseReservedDarePoints(userId);
  } catch (error) {
    console.error('Error fetching reserved DARE points:', error);
    
    // Try local cache on error
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { provisioned } = JSON.parse(cached);
      return provisioned || 0;
    }
    
    return 0;
  }
};

/**
 * Update user's DARE points
 */
export const updateUserDarePoints = async (userId: string, points: number): Promise<boolean> => {
  try {
    // Ensure the structure exists first
    await ensureDarePointsStructure();
    
    // Update only unprovisioned points
    await updateDarePoints(userId, points);
    
    // Update local cache
    const account = await getUserAccount(userId);
    if (account) {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ 
          total: (account.free_dare_points || 0) + (account.reserved_dare_points || 0),
          unprovisioned: account.free_dare_points || 0,
          provisioned: account.reserved_dare_points || 0,
          timestamp: Date.now() 
        })
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error updating DARE points:', error);
    
    // Try to update local cache anyway
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const cachedData = JSON.parse(cached);
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({
          ...cachedData,
          total: (cachedData.unprovisioned + points) + cachedData.provisioned,
          unprovisioned: cachedData.unprovisioned + points,
          timestamp: Date.now()
        })
      );
    } else {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ 
          total: points > 0 ? points : DEFAULT_POINTS,
          unprovisioned: points > 0 ? points : DEFAULT_POINTS,
          provisioned: 0,
          timestamp: Date.now() 
        })
      );
    }
    
    return true; // Return true for local mode
  }
};

/**
 * Add or subtract points
 */
export const adjustUserDarePoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    const currentPoints = await getUserFreeDarePoints(userId);
    if (amount < 0 && Math.abs(amount) > currentPoints) {
      return false; // Not enough points
    }
    
    return updateUserDarePoints(userId, amount);
  } catch (error) {
    console.error('Error adjusting DARE points:', error);
    return false;
  }
};

/**
 * Reserve points (move from free to reserved)
 */
export const reserveDarePoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    return await supabaseReserveDarePoints(userId, amount);
  } catch (error) {
    console.error('Error reserving points:', error);
    return false;
  }
};

/**
 * Free points (move from reserved to free)
 */
export const freeDarePoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    return await supabaseFreeDarePoints(userId, amount);
  } catch (error) {
    console.error('Error freeing points:', error);
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
    const currentPoints = await getUserFreeDarePoints(userId);
    
    if (currentPoints < amount) {
      return false;
    }
    
    // Use reserve function to move points to reserved
    const reserved = await reserveDarePoints(userId, amount);
    if (!reserved) {
      return false;
    }
    
    // Record the transaction
    await recordTransaction({
      userId,
      amount: -amount,
      type: 'BET_PLACED',
      description: `Placed a bet of ${amount} $DARE`,
      betId
    });
    
    return true;
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