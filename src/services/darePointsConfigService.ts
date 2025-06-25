import { supabase } from './supabaseService';
import { DarePointsTransactionType } from '../types/darePoints';

/**
 * Interface for DARE Points Configuration
 */
export interface DarePointsConfig {
  action_type: DarePointsTransactionType;
  points_value: number;
  // description field removed to match database schema
}

/**
 * Interface for DARE Points Configuration History
 */
export interface DarePointsConfigHistory {
  id: string;
  action_type: string;
  old_points_value: number;
  new_points_value: number;
  changed_by_user: string;
  change_reason: string;
  created_at: string;
}

/**
 * Get all active point configurations
 */
export const getAllPointConfigs = async (): Promise<DarePointsConfig[]> => {
  try {
    const { data, error } = await supabase
      .from('active_dare_points_config')
      .select('*');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting point configurations:', error);
    return [];
  }
};

/**
 * Get point value for a specific action type
 */
export const getPointValue = async (actionType: DarePointsTransactionType): Promise<number> => {
  try {
    const { data, error } = await supabase
      .rpc('get_dare_points_value', { action: actionType });
    
    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error(`Error getting point value for ${actionType}:`, error);
    return 0;
  }
};

/**
 * Update a point value (admin only)
 */
export const updatePointValue = async (
  actionType: DarePointsTransactionType, 
  newValue: number, 
  reason: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('update_dare_points_value', { 
        action: actionType,
        new_value: newValue,
        reason: reason
      });
    
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error(`Error updating point value for ${actionType}:`, error);
    return false;
  }
};

/**
 * Get configuration history for all actions or a specific action
 */
export const getConfigHistory = async (actionType?: DarePointsTransactionType): Promise<DarePointsConfigHistory[]> => {
  try {
    // Simplify the query to avoid complex join that causes TypeScript parsing issues
    let query = supabase
      .from('dare_points_config_history')
      .select(`
        id,
        action_type,
        old_points_value,
        new_points_value,
        changed_by,
        change_reason,
        created_at
      `)
      .order('created_at', { ascending: false });
    
    if (actionType) {
      query = query.eq('action_type', actionType);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // For now, return data with a placeholder for changed_by_user
    // In a real implementation, you could make a separate query to get user emails
    return (data || []).map(record => ({
      ...record,
      changed_by_user: record.changed_by ? 'Admin User' : 'System'
    }));
  } catch (error) {
    console.error('Error getting configuration history:', error);
    return [];
  }
};

/**
 * Helper function to award points based on action type
 */
export const awardPointsByAction = async (
  userId: string, 
  actionType: DarePointsTransactionType, 
  description: string,
  betId?: string,
  matchId?: string,
  relatedUserId?: string
): Promise<boolean> => {
  try {
    // Import these functions dynamically to avoid circular dependencies
    const { 
      getUserFreeDarePoints, 
      getUserReservedDarePoints,
      updateUserDarePoints,
      awardPoints  // Use awardPoints instead of recordTransaction for bonus transactions
    } = await import('./darePointsService');
    
    // Get the current point value from configuration
    const pointsAmount = await getPointValue(actionType);
    
    if (pointsAmount <= 0) {
      return true; // No points to award, consider it successful
    }
    
    // Get current balances
    const freeDarePoints = await getUserFreeDarePoints(userId);
    
    // Update the user's balance
    const success = await updateUserDarePoints(userId, freeDarePoints + pointsAmount);
    
    if (success) {
      // Use the existing awardPoints function which handles the transaction recording
      await awardPoints(userId, pointsAmount, description);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error awarding points for ${actionType}:`, error);
    return false;
  }
};

/**
 * Award signup bonus to a new user
 * 
 * Database operations performed:
 * 1. SELECT configured point value for 'SIGNUP' action type
 * 2. INSERT SIGNUP transaction (+configured_amount, FREE balance)
 * 3. UPDATE user's free_dare_points (+configured_amount)
 * 
 * @param userId - ID of the new user receiving the bonus
 * @returns Promise<boolean> - true if successful, false if error
 */
export const awardSignupBonus = async (userId: string): Promise<boolean> => {
  return awardPointsByAction(
    userId, 
    'SIGNUP', 
    'Welcome bonus for new user'
  );
};

/**
 * Award referral bonus
 */
export const awardReferralBonus = async (
  referrerId: string, 
  newUserId: string,
  referralCode: string
): Promise<boolean> => {
  return awardPointsByAction(
    referrerId, 
    'REFERRAL_BONUS', 
    `Bonus for referring new user with code ${referralCode}`,
    undefined,
    undefined,
    newUserId
  );
};

/**
 * Award bet placement bonus
 */
export const awardBetPlacementBonus = async (
  userId: string, 
  betId: string,
  matchId?: string
): Promise<boolean> => {
  return awardPointsByAction(
    userId, 
    'BET_PLACEMENT_BONUS_AWARDED', 
    'Bonus for placing a bet',
    betId,
    matchId
  );
};

/**
 * Award bet win bonus
 */
export const awardBetWinBonus = async (
  userId: string, 
  betId: string,
  matchId?: string
): Promise<boolean> => {
  return awardPointsByAction(
    userId, 
    'BET_WIN_BONUS_AWARDED', 
    'Bonus for winning a bet',
    betId,
    matchId
  );
};

/**
 * Award daily login bonus
 */
export const awardDailyLoginBonus = async (userId: string): Promise<boolean> => {
  return awardPointsByAction(
    userId, 
    'DAILY_LOGIN', 
    'Daily login bonus'
  );
}; 