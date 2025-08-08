/**
 * Leaderboard Service
 * 
 * Handles leaderboard data fetching and user ranking operations.
 * Provides fresh database queries without caching for real-time accuracy.
 */

import { supabase } from './supabaseService';

// Use shared Supabase client to avoid multiple GoTrueClient instances
console.log('LeaderboardService: using shared Supabase client');

/**
 * Interface for leaderboard entry
 */
export interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  email?: string;
  wallet_address?: string;
  image_url?: string;
  total_points: number;
  rank: number;
  updated_points_at: string;
}

/**
 * Interface for user rank data
 */
export interface UserRankData {
  rank: number;
  totalUsers: number;
  totalPoints: number;
}

/**
 * Get leaderboard with top users
 * 
 * @param limit - Number of top users to retrieve (default 10)
 * @returns Promise<LeaderboardEntry[]> - Array of top users with rankings
 * @throws Error if query fails
 */
export const getLeaderboard = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  console.log('LeaderboardService: Fetching leaderboard data', { limit });
  
  try {
    const { data, error } = await supabase
      .rpc('get_leaderboard', { 
        limit_count: limit 
      });

    if (error) {
      console.error('LeaderboardService: Error fetching leaderboard:', error);
      throw error;
    }

    console.log('LeaderboardService: Leaderboard data fetched successfully:', data?.length || 0, 'entries');
    return data || [];
  } catch (err) {
    console.error('LeaderboardService: Exception fetching leaderboard:', err);
    throw err;
  }
};

/**
 * Get user's rank and total user count
 * 
 * @param userId - The user ID to get rank for
 * @returns Promise<UserRankData> - User's rank, total users, and points
 * @throws Error if query fails
 */
export const getUserRank = async (userId: string): Promise<UserRankData> => {
  console.log('LeaderboardService: Getting user rank', { userId });
  
  try {
    const { data, error } = await supabase
      .rpc('get_user_rank', { 
        target_user_id: userId 
      });

    if (error) {
      console.error('LeaderboardService: Error getting user rank:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('LeaderboardService: No rank data found for user:', userId);
      return {
        rank: 0,
        totalUsers: 0,
        totalPoints: 0
      };
    }

    const rankData = data[0];
    console.log('LeaderboardService: User rank data fetched successfully:', rankData);
    
    return {
      rank: rankData.user_rank || 0,
      totalUsers: rankData.total_users || 0,
      totalPoints: rankData.total_points || 0
    };
  } catch (err) {
    console.error('LeaderboardService: Exception getting user rank:', err);
    throw err;
  }
};

/**
 * Get combined leaderboard and user rank data in a single query
 * This is more efficient than making separate calls
 * 
 * @param userId - The user ID to include in results
 * @param limit - Number of top users to retrieve (default 10) 
 * @returns Promise<{leaderboard: LeaderboardEntry[], userRank: UserRankData}>
 * @throws Error if query fails
 */
export const getLeaderboardWithUserRank = async (
  userId: string, 
  limit: number = 10
): Promise<{
  leaderboard: LeaderboardEntry[];
  userRank: UserRankData;
}> => {
  console.log('LeaderboardService: Fetching combined leaderboard and user rank', { userId, limit });
  
  try {
    // Use the SQL query from requirements with proper ordering by total_points and updated_points_at
    const { data, error } = await supabase
      .from('user_accounts')
      .select(`
        id,
        user_id,
        username,
        email,
        wallet_address,
        image_url,
        total_points,
        updated_points_at
      `)
      .not('user_id', 'is', null)
      .order('total_points', { ascending: false })
      .order('updated_points_at', { ascending: true });

    if (error) {
      console.error('LeaderboardService: Error fetching combined data:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('LeaderboardService: No user accounts found');
      return {
        leaderboard: [],
        userRank: { rank: 0, totalUsers: 0, totalPoints: 0 }
      };
    }

    // Add rank numbers to all users
    const rankedUsers = data.map((user, index) => ({
      ...user,
      rank: index + 1,
      total_points: user.total_points || 0
    }));

    // Get top users for leaderboard
    const leaderboard = rankedUsers.slice(0, limit);

    // Find current user's rank
    const userIndex = rankedUsers.findIndex(user => user.user_id === userId);
    const userRank: UserRankData = {
      rank: userIndex >= 0 ? userIndex + 1 : 0,
      totalUsers: rankedUsers.length,
      totalPoints: userIndex >= 0 ? rankedUsers[userIndex].total_points : 0
    };

    console.log('LeaderboardService: Combined data fetched successfully', {
      leaderboardCount: leaderboard.length,
      userRank: userRank.rank,
      totalUsers: userRank.totalUsers
    });

    return { leaderboard, userRank };
  } catch (err) {
    console.error('LeaderboardService: Exception fetching combined data:', err);
    throw err;
  }
};