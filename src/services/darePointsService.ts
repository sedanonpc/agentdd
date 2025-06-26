import { supabase } from './supabaseService';
import { 
  getCurrentUser, 
  getUserAccount, 
  updateUserAccount, 
  getFreeDarePoints as getSupabaseFreeDarePoints,
  getReservedDarePoints as getSupabaseReservedDarePoints,
  reserveDarePoints as supabaseReserveDarePoints,
  freeDarePoints as supabaseFreeDarePoints,
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
          free: account.free_dare_points || 0,
          reserved: account.reserved_dare_points || 0,
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
            free: DEFAULT_POINTS,
            reserved: 0,
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
      const { free } = JSON.parse(cached);
      return free || 0;
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
      const { reserved } = JSON.parse(cached);
      return reserved || 0;
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
    
    // Update only free points
    await updateDarePoints(userId, points);
    
    // Update local cache
    const account = await getUserAccount(userId);
    if (account) {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ 
          total: (account.free_dare_points || 0) + (account.reserved_dare_points || 0),
          free: account.free_dare_points || 0,
          reserved: account.reserved_dare_points || 0,
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
          total: (cachedData.free + points) + cachedData.reserved,
          free: cachedData.free + points,
          reserved: cachedData.reserved,
          timestamp: Date.now()
        })
      );
    } else {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ 
          total: points > 0 ? points : DEFAULT_POINTS,
          free: points > 0 ? points : DEFAULT_POINTS,
          reserved: 0,
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
 * Record a DARE points transaction in the database
 */
export const recordTransaction = async (
  userId: string,
  transactionType: string,
  balanceType: 'FREE' | 'RESERVED',
  amount: number,
  description: string,
  metadata?: any
): Promise<boolean> => {
  try {
    const commonEventId = crypto.randomUUID();
    
    const { error } = await supabase
      .from('dare_points_transactions')
      .insert({
        user_id: userId,
        transaction_type: transactionType,
        balance_type: balanceType,
        amount: amount,
        common_event_id: commonEventId,
        metadata: metadata || {}
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

/**
 * Get user's transaction history from the database
 */
export const getUserTransactions = async (userId: string): Promise<DareTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('dare_points_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
    
    // Convert database format to DareTransaction format for backward compatibility
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      type: row.transaction_type,
      description: `${row.transaction_type}: ${row.amount} points`,
      betId: row.metadata?.bet_id,
      timestamp: new Date(row.created_at).getTime(),
      status: 'COMPLETED' as const
    }));
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
      await recordTransaction(
        userId,
        'BET_WON',
        'FREE',
        amount,
        `Won ${amount} $DARE from bet ${betId}`,
        { bet_id: betId }
      );
    }
    
    return success;
  } catch (error) {
    console.error('Error adding bet win points:', error);
    return false;
  }
};

/**
 * Deduct points for placing a bet
 * 
 * Database operations performed:
 * 1. INSERT BET_PLACED transaction (-amount, RESERVED balance)
 * 2. UPDATE user's free_dare_points (-amount)
 * 3. UPDATE user's reserved_dare_points (+amount)
 * 
 * @param userId - ID of the user placing the bet
 * @param amount - Number of points to reserve for the bet
 * @param betId - ID of the bet being placed
 * @returns Promise<boolean> - true if successful, false if insufficient funds or error
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
    await recordTransaction(
      userId,
      'BET_PLACED',
      'RESERVED',
      -amount,
      `Placed a bet of ${amount} $DARE`,
      { bet_id: betId }
    );
    
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
      await recordTransaction(
        userId,
        'SIGNUP',
        'FREE',
        amount,
        reason
      );
    }
    
    return success;
  } catch (error) {
    console.error('Error awarding points:', error);
    return false;
  }
}; 