import { supabase } from './supabaseService';
import { 
  getCurrentUser, 
  getUserProfile, 
  updateUserProfile, 
  getDarePoints, 
  getUnprovisionedDarePoints,
  getProvisionedDarePoints,
  provisionDarePoints,
  unprovisionDarePoints,
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
    const { error } = await supabase.from('user_accounts').select('account_id').limit(1);
    
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
    const profile = await getUserProfile(userId);
    
    // Check if account exists
    if (profile) {
      const totalPoints = (profile.unprovisioned_points || 0) + (profile.provisioned_points || 0);
      
      // Cache to local storage
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ 
          total: totalPoints,
          unprovisioned: profile.unprovisioned_points || 0,
          provisioned: profile.provisioned_points || 0,
          timestamp: Date.now() 
        })
      );
      
      return totalPoints;
    }
    
    // If profile exists but points don't exist, try to add them
    if (profile && (!('unprovisioned_points' in profile) || !('provisioned_points' in profile))) {
      try {
        // Try to update the profile with points
        const updatedProfile = await updateUserProfile(userId, { 
          unprovisioned_points: DEFAULT_POINTS,
          provisioned_points: 0
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
        console.error('Error adding points to profile:', updateError);
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
 * Get user's unprovisioned DARE points
 */
export const getUserUnprovisionedPoints = async (userId: string): Promise<number> => {
  try {
    // First ensure the structure exists
    await ensureDarePointsStructure();
    
    // Try to get from Supabase first
    return await getUnprovisionedDarePoints(userId);
  } catch (error) {
    console.error('Error fetching unprovisioned DARE points:', error);
    
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
 * Get user's provisioned DARE points
 */
export const getUserProvisionedPoints = async (userId: string): Promise<number> => {
  try {
    // First ensure the structure exists
    await ensureDarePointsStructure();
    
    // Try to get from Supabase first
    return await getProvisionedDarePoints(userId);
  } catch (error) {
    console.error('Error fetching provisioned DARE points:', error);
    
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
    const profile = await getUserProfile(userId);
    if (profile) {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ 
          total: (profile.unprovisioned_points || 0) + (profile.provisioned_points || 0),
          unprovisioned: profile.unprovisioned_points || 0,
          provisioned: profile.provisioned_points || 0,
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
    const currentPoints = await getUserUnprovisionedPoints(userId);
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
 * Provision points (move from unprovisioned to provisioned)
 */
export const provisionUserPoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    return await provisionDarePoints(userId, amount);
  } catch (error) {
    console.error('Error provisioning DARE points:', error);
    return false;
  }
};

/**
 * Unprovision points (move from provisioned to unprovisioned)
 */
export const unprovisionUserPoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    return await unprovisionDarePoints(userId, amount);
  } catch (error) {
    console.error('Error unprovisioning DARE points:', error);
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
    const currentPoints = await getUserUnprovisionedPoints(userId);
    if (currentPoints < amount) {
      return false;
    }
    
    // First provision the points
    const provisioned = await provisionUserPoints(userId, amount);
    if (!provisioned) {
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