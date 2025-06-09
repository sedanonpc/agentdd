import { supabase, supabaseClient } from './supabaseService';
import { Bet, BetStatus } from '../types';

// Define types for the bet records
interface BetRecord {
  id: string;
  creator_id: string;
  acceptor_id?: string;
  match_id: string;
  team_id: string;
  amount: number;
  status: string;
  escrow_id?: string;
  winner_id?: string;
  created_at: string;
  updated_at: string;
  description?: string;
}

// Define types for leaderboard entries
export interface LeaderboardEntry {
  user_id: string;
  username?: string;
  wallet_address?: string;
  total_bets: number;
  wins: number;
  losses: number;
  total_wagered: number;
  total_won: number;
  win_rate: number;
  dare_points?: number;
  is_mock?: boolean;
}

// Modify the mock leaderboard entries to have a flag indicating they're mock data
const MOCK_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    user_id: 'mock_user_1',
    wallet_address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    total_bets: 24,
    wins: 14,
    losses: 10,
    total_wagered: 1200,
    total_won: 1800,
    win_rate: 0.583,
    dare_points: 2500,
    is_mock: true
  },
  {
    user_id: 'mock_user_2',
    wallet_address: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac',
    total_bets: 18,
    wins: 10,
    losses: 8,
    total_wagered: 900,
    total_won: 1500,
    win_rate: 0.555,
    dare_points: 2100,
    is_mock: true
  },
  {
    user_id: 'mock_user_3',
    wallet_address: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    total_bets: 30,
    wins: 15,
    losses: 15,
    total_wagered: 1500,
    total_won: 2000,
    win_rate: 0.5,
    dare_points: 1950,
    is_mock: true
  },
  {
    user_id: 'mock_user_4',
    wallet_address: '0xabcd1234abcd1234abcd1234abcd1234abcd1234',
    total_bets: 12,
    wins: 7,
    losses: 5,
    total_wagered: 600,
    total_won: 1000,
    win_rate: 0.583,
    dare_points: 1800,
    is_mock: true
  },
  {
    user_id: 'mock_user_5',
    wallet_address: '0x567890567890567890567890567890567890abcd',
    total_bets: 8,
    wins: 4,
    losses: 4,
    total_wagered: 400,
    total_won: 800,
    win_rate: 0.5,
    dare_points: 1600,
    is_mock: true
  }
];

// Add this interface for Supabase errors
interface SupabaseError {
  code: string;
  message?: string;
  details?: string;
  hint?: string;
}

// Update the isSupabaseConnected function
const isSupabaseConnected = async (): Promise<boolean> => {
  try {
    // Try a simple query that would fail quickly if Supabase is not available
    const response = await supabaseClient
      .from('bets')
      .select('count')
      .limit(1)
      .single();
    
    const error = response.error as SupabaseError | null;
    
    // If we get a 404 error, that likely means the table doesn't exist
    if (error && (error.code === '404' || error.code === 'PGRST116' || 
        (error.message && error.message.includes('does not exist')))) {
      console.warn('Supabase table not found, but connection is working');
      return true; // Connection works but table might not exist
    } else if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Exception checking Supabase connection:', err);
    return false;
  }
};

// Update the logSupabaseError function
const logSupabaseError = (operation: string, error: any) => {
  const supaError = error as SupabaseError;
  console.error(`Supabase error during ${operation}:`, {
    code: supaError?.code,
    message: supaError?.message,
    details: supaError?.details,
    hint: supaError?.hint,
    full: error
  });
};

/**
 * Store a bet in Supabase
 */
export const storeBet = async (bet: Bet): Promise<boolean> => {
  try {
    console.log('Attempting to store bet in Supabase:', bet);
    
    const betRecord: Partial<BetRecord> = {
      id: bet.id,
      creator_id: bet.creator,
      acceptor_id: bet.acceptor,
      match_id: bet.matchId,
      team_id: bet.teamId,
      amount: bet.amount,
      status: bet.status,
      escrow_id: bet.escrowId,
      winner_id: bet.winnerId,
      description: bet.description,
      created_at: new Date(bet.timestamp).toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from('bets')
      .upsert(betRecord)
      .select();

    if (error) {
      console.error('Error storing bet in Supabase:', error);
      return false;
    }

    console.log('Successfully stored bet in Supabase');
    return true;
  } catch (error) {
    console.error('Exception storing bet:', error);
    return false;
  }
};

/**
 * Update a bet in Supabase
 */
export const updateBet = async (bet: Bet): Promise<boolean> => {
  try {
    const betRecord: Partial<BetRecord> = {
      acceptor_id: bet.acceptor,
      status: bet.status,
      escrow_id: bet.escrowId,
      winner_id: bet.winnerId,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
      .from('bets')
      .update(betRecord)
      .eq('id', bet.id)
      .select();

    if (error) {
      console.error('Error updating bet:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating bet:', error);
    return false;
  }
};

/**
 * Get all bets from Supabase
 */
export const getAllBets = async (): Promise<Bet[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('bets')
      .select('*');

    if (error) {
      console.error('Error getting all bets:', error);
      return [];
    }

    return (data || []).map((betRecord: BetRecord) => ({
      id: betRecord.id,
      creator: betRecord.creator_id,
      acceptor: betRecord.acceptor_id,
      matchId: betRecord.match_id,
      teamId: betRecord.team_id,
      amount: betRecord.amount,
      status: betRecord.status as BetStatus,
      escrowId: betRecord.escrow_id,
      winnerId: betRecord.winner_id,
      timestamp: new Date(betRecord.created_at).getTime(),
      description: betRecord.description
    }));
  } catch (error) {
    console.error('Exception getting all bets:', error);
    return [];
  }
};

/**
 * Get bets by user from Supabase
 */
export const getBetsByUser = async (userId: string): Promise<Bet[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('bets')
      .select('*')
      .or(`creator_id.eq.${userId},acceptor_id.eq.${userId}`);

    if (error) {
      console.error('Error getting bets by user:', error);
      return [];
    }

    return (data || []).map((betRecord: BetRecord) => ({
      id: betRecord.id,
      creator: betRecord.creator_id,
      acceptor: betRecord.acceptor_id,
      matchId: betRecord.match_id,
      teamId: betRecord.team_id,
      amount: betRecord.amount,
      status: betRecord.status as BetStatus,
      escrowId: betRecord.escrow_id,
      winnerId: betRecord.winner_id,
      timestamp: new Date(betRecord.created_at).getTime(),
      description: betRecord.description
    }));
  } catch (error) {
    console.error('Exception getting bets by user:', error);
    return [];
  }
};

/**
 * Get top winners by number of wins
 */
export const getTopWinners = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    // Get top winners with the most wins
    const { data, error } = await supabaseClient.rpc('get_top_winners', { limit_count: limit });

    if (error) {
      console.error('Error getting top winners:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception getting top winners:', error);
    return [];
  }
};

/**
 * Get top earners by total amount won
 */
export const getTopEarners = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    // Get top earners with the most $DARE points won
    const { data, error } = await supabaseClient.rpc('get_top_earners', { limit_count: limit });

    if (error) {
      console.error('Error getting top earners:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception getting top earners:', error);
    return [];
  }
};

/**
 * Get most active bettors by number of bets placed
 */
export const getMostActiveBettors = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    // Get most active bettors with the most bets placed
    const { data, error } = await supabaseClient.rpc('get_most_active_bettors', { limit_count: limit });

    if (error) {
      console.error('Error getting most active bettors:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception getting most active bettors:', error);
    return [];
  }
};

/**
 * Get user's betting stats
 */
export const getUserBettingStats = async (userId: string): Promise<LeaderboardEntry | null> => {
  try {
    const { data, error } = await supabaseClient.rpc('get_user_betting_stats', { user_id: userId });

    if (error) {
      console.error('Error getting user betting stats:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Exception getting user betting stats:', error);
    return null;
  }
};

/**
 * Get users ranked by their $DARE points
 */
export const getUsersByDarePoints = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    console.log('Fetching leaderboard data from Supabase...');
    
    // Check connection first
    const isConnected = await isSupabaseConnected();
    if (!isConnected) {
      console.warn('Supabase is not connected, using mock data for leaderboard');
      if (import.meta.env.DEV) {
        return MOCK_LEADERBOARD_ENTRIES;
      }
      return [];
    }
    
    // Get users ranked by their $DARE points
    const { data, error } = await supabaseClient
      .from('user_profiles')
      .select('user_id, username, wallet_address, dare_points')
      .order('dare_points', { ascending: false })
      .limit(limit);

    // Create an array to hold our result (real + mock)
    let result: LeaderboardEntry[] = [];
    
    // Handle error case
    if (error) {
      logSupabaseError('getUsersByDarePoints', error);
      console.log('Will use mock data for leaderboard');
    } else if (data && data.length > 0) {
      // Process real data if available
      console.log(`Found ${data.length} real users with DARE points`);
      
      // Convert to LeaderboardEntry format with available fields
      const realUsers = data.map(user => ({
        user_id: user.user_id,
        username: user.username,
        wallet_address: user.wallet_address,
        total_bets: 0, // Default values for fields not directly in user_profiles
        wins: 0,
        losses: 0,
        total_wagered: 0,
        total_won: 0,
        win_rate: 0,
        dare_points: user.dare_points || 0,
        is_mock: false
      }));
      
      result = [...realUsers];
    } else {
      console.log('No users found in Supabase');
    }
    
    // Always add mock data in development mode if we have fewer entries than requested
    if (import.meta.env.DEV && result.length < limit) {
      const mockNeeded = Math.min(MOCK_LEADERBOARD_ENTRIES.length, limit - result.length);
      console.log(`Adding ${mockNeeded} mock users to fill the leaderboard`);
      
      // Get the mock entries we need
      const mockUsers = MOCK_LEADERBOARD_ENTRIES.slice(0, mockNeeded);
      
      // Add them to our result
      result = [...result, ...mockUsers];
    }
    
    // Sort the combined result by DARE points
    result.sort((a, b) => (b.dare_points || 0) - (a.dare_points || 0));
    
    // Log the final result for debugging
    console.log(`Returning ${result.length} leaderboard entries (${result.filter(u => u.is_mock).length} mock, ${result.filter(u => !u.is_mock).length} real)`);
    
    // Return the limited result
    return result.slice(0, limit);
  } catch (error) {
    console.error('Exception getting users by DARE points:', error);
    
    // Return mock data in development mode only
    if (import.meta.env.DEV) {
      return MOCK_LEADERBOARD_ENTRIES;
    }
    
    // In production, return an empty array
    return [];
  }
};

// Create a function to get all leaderboard data in one call
export const getAllLeaderboardData = async (limit: number = 10): Promise<{
  topWinners: LeaderboardEntry[];
  topEarners: LeaderboardEntry[];
  mostActive: LeaderboardEntry[];
  darePointsRanking: LeaderboardEntry[];
}> => {
  try {
    // Get all leaderboard data in parallel
    const [winners, earners, active, darePointsUsers] = await Promise.all([
      getTopWinners(limit),
      getTopEarners(limit),
      getMostActiveBettors(limit),
      getUsersByDarePoints(limit)
    ]);

    return {
      topWinners: winners,
      topEarners: earners,
      mostActive: active,
      darePointsRanking: darePointsUsers
    };
  } catch (error) {
    console.error('Error getting all leaderboard data:', error);
    return {
      topWinners: [],
      topEarners: [],
      mostActive: [],
      darePointsRanking: []
    };
  }
};

/**
 * Get all open bets that haven't been accepted yet
 */
export const getOpenBets = async (limit: number = 50): Promise<Bet[]> => {
  try {
    console.log('Fetching open bets from Supabase...');
    
    // Check connection first
    const isConnected = await isSupabaseConnected();
    if (!isConnected) {
      console.warn('Supabase is not connected, using mock data');
      if (import.meta.env.DEV) {
        return MOCK_OPEN_BETS.map(bet => ({...bet, is_mock: true}));
      }
      return [];
    }
    
    const { data, error } = await supabaseClient
      .from('bets')
      .select('*')
      .eq('status', BetStatus.OPEN)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Create an array to hold our result (real + mock)
    let result: Bet[] = [];
    
    // Handle error case
    if (error) {
      logSupabaseError('getOpenBets', error);
      console.log('Will try fallback method and mock data');
    } else if (data && data.length > 0) {
      // Process real data if available
      console.log(`Found ${data.length} real open bets`);
      
      // Convert to Bet format
      const realBets = data.map((betRecord: BetRecord) => ({
        id: betRecord.id,
        creator: betRecord.creator_id,
        acceptor: betRecord.acceptor_id,
        matchId: betRecord.match_id,
        teamId: betRecord.team_id,
        amount: betRecord.amount,
        status: betRecord.status as BetStatus,
        escrowId: betRecord.escrow_id,
        winnerId: betRecord.winner_id,
        timestamp: new Date(betRecord.created_at).getTime(),
        description: betRecord.description,
        is_mock: false
      }));
      
      result = [...realBets];
    } else {
      console.log('No open bets found in Supabase');
    }
    
    // Try fallback method if we have no results yet
    if (result.length === 0) {
      try {
        console.log('Attempting to get all bets as fallback...');
        const allBets = await getAllBets();
        console.log(`getAllBets returned ${allBets.length} total bets`);
        
        const openBets = allBets.filter(bet => bet.status === BetStatus.OPEN).map(bet => ({
          ...bet,
          is_mock: false
        }));
        
        if (openBets.length > 0) {
          console.log(`Found ${openBets.length} open bets from getAllBets fallback`);
          result = [...openBets];
        } else {
          console.log('No open bets found in fallback method');
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
    
    // Add mock data in development mode (always add some mock data in dev mode)
    if (import.meta.env.DEV && (result.length === 0 || result.length < limit)) {
      const mockNeeded = Math.min(MOCK_OPEN_BETS.length, limit - result.length);
      if (mockNeeded > 0) {
        console.log(`Adding ${mockNeeded} mock open bets to fill the list`);
        
        // Get the mock entries we need with refreshed timestamps
        const mockBets = MOCK_OPEN_BETS.slice(0, mockNeeded).map(bet => ({
          ...bet,
          timestamp: Date.now() - Math.floor(Math.random() * 36000000), // Random time in last 10 hours
          is_mock: true // Ensure mock flag is set
        }));
        
        // Add them to our result
        result = [...result, ...mockBets];
        console.log(`After adding mock data, have ${result.length} total bets`);
      }
    }
    
    // Make sure all bets have the is_mock property
    result = result.map(bet => ({
      ...bet,
      is_mock: bet.is_mock === undefined ? (bet.id.startsWith('mock_') ? true : false) : bet.is_mock
    }));
    
    // Sort the combined result by timestamp (newest first)
    result.sort((a, b) => b.timestamp - a.timestamp);
    
    // Log the final result for debugging
    console.log(`Returning ${result.length} open bets (${result.filter(b => b.is_mock).length} mock, ${result.filter(b => !b.is_mock).length} real)`);
    
    // Return the limited result
    return result.slice(0, limit);
  } catch (error) {
    console.error('Exception getting open bets:', error);
    
    // Return mock data in development mode only
    if (import.meta.env.DEV) {
      console.log('Returning mock data due to exception');
      return MOCK_OPEN_BETS.map(bet => ({...bet, is_mock: true}));
    }
    
    // In production, return an empty array
    return [];
  }
};

/**
 * Get all closed bets (completed or cancelled)
 */
export const getClosedBets = async (limit: number = 50): Promise<Bet[]> => {
  try {
    console.log('Fetching closed bets from Supabase...');
    const { data, error } = await supabaseClient
      .from('bets')
      .select('*')
      .in('status', [BetStatus.COMPLETED, BetStatus.CANCELLED])
      .order('created_at', { ascending: false })
      .limit(limit);

    // Create an array to hold our result (real + mock)
    let result: Bet[] = [];
    
    // Process real data if available
    if (!error && data && data.length > 0) {
      console.log(`Found ${data.length} real closed bets`);
      
      // Convert to Bet format
      const realBets = data.map((betRecord: BetRecord) => ({
        id: betRecord.id,
        creator: betRecord.creator_id,
        acceptor: betRecord.acceptor_id,
        matchId: betRecord.match_id,
        teamId: betRecord.team_id,
        amount: betRecord.amount,
        status: betRecord.status as BetStatus,
        escrowId: betRecord.escrow_id,
        winnerId: betRecord.winner_id,
        timestamp: new Date(betRecord.created_at).getTime(),
        description: betRecord.description,
        is_mock: false
      }));
      
      result = [...realBets];
    } else if (error) {
      console.error('Error getting closed bets from Supabase:', error);
    }
    
    // Add mock data if needed (only in development and if we need more entries)
    if (import.meta.env.DEV && result.length < limit) {
      const mockNeeded = Math.min(MOCK_CLOSED_BETS.length, limit - result.length);
      if (mockNeeded > 0) {
        console.log(`Adding ${mockNeeded} mock closed bets to fill the list`);
        
        // Get the mock entries we need with refreshed timestamps
        const mockBets = MOCK_CLOSED_BETS.slice(0, mockNeeded).map(bet => ({
          ...bet,
          timestamp: Date.now() - Math.floor(Math.random() * 864000000), // Random time in last 10 days
        }));
        
        // Add them to our result
        result = [...result, ...mockBets];
      }
    }
    
    // Sort the combined result by timestamp (newest first)
    result.sort((a, b) => b.timestamp - a.timestamp);
    
    // Return the limited result
    return result.slice(0, limit);
  } catch (error) {
    console.error('Exception getting closed bets:', error);
    
    // Return mock data in development mode only
    if (import.meta.env.DEV) {
      return MOCK_CLOSED_BETS.slice(0, limit);
    }
    
    // In production, return an empty array
    return [];
  }
};

/**
 * Get active bets that have been accepted but not settled yet
 */
export const getActiveBets = async (limit: number = 50): Promise<Bet[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('bets')
      .select('*')
      .eq('status', BetStatus.ACTIVE)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting active bets:', error);
      return [];
    }

    return (data || []).map((betRecord: BetRecord) => ({
      id: betRecord.id,
      creator: betRecord.creator_id,
      acceptor: betRecord.acceptor_id,
      matchId: betRecord.match_id,
      teamId: betRecord.team_id,
      amount: betRecord.amount,
      status: betRecord.status as BetStatus,
      escrowId: betRecord.escrow_id,
      winnerId: betRecord.winner_id,
      timestamp: new Date(betRecord.created_at).getTime(),
      description: betRecord.description
    }));
  } catch (error) {
    console.error('Exception getting active bets:', error);
    return [];
  }
};

// Update mock bets to have a flag indicating they're mock data
const MOCK_OPEN_BETS: Bet[] = [
  {
    id: 'mock_bet_open_1',
    creator: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    matchId: 'match_123',
    teamId: 'team_456',
    amount: 100,
    status: BetStatus.OPEN,
    timestamp: Date.now() - 3600000, // 1 hour ago
    description: 'Lakers to win by 10 points',
    is_mock: true
  },
  {
    id: 'mock_bet_open_2',
    creator: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac',
    matchId: 'match_124',
    teamId: 'team_789',
    amount: 200,
    status: BetStatus.OPEN,
    timestamp: Date.now() - 7200000, // 2 hours ago
    description: 'Warriors to win the championship',
    is_mock: true
  },
  {
    id: 'mock_bet_open_3',
    creator: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    matchId: 'match_125',
    teamId: 'team_101',
    amount: 150,
    status: BetStatus.OPEN,
    timestamp: Date.now() - 10800000, // 3 hours ago
    description: 'Bucks to win the next game',
    is_mock: true
  }
];

const MOCK_CLOSED_BETS: Bet[] = [
  {
    id: 'mock_bet_closed_1',
    creator: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    acceptor: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac',
    matchId: 'match_123',
    teamId: 'team_456',
    amount: 100,
    status: BetStatus.COMPLETED,
    timestamp: Date.now() - 86400000, // 1 day ago
    description: 'Lakers to win by 10 points',
    winnerId: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    is_mock: true
  },
  {
    id: 'mock_bet_closed_2',
    creator: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac',
    acceptor: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    matchId: 'match_124',
    teamId: 'team_789',
    amount: 200,
    status: BetStatus.COMPLETED,
    timestamp: Date.now() - 172800000, // 2 days ago
    description: 'Warriors to win the championship',
    winnerId: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    is_mock: true
  },
  {
    id: 'mock_bet_closed_3',
    creator: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    acceptor: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    matchId: 'match_125',
    teamId: 'team_101',
    amount: 150,
    status: BetStatus.CANCELLED,
    timestamp: Date.now() - 259200000, // 3 days ago
    description: 'Bucks to win the next game',
    is_mock: true
  }
]; 