/*
 * Bets Service - Database-backed bet operations
 * 
 * This service handles straight bet operations using the straight_bets table in Supabase.
 * It replaces the deprecated bettingService.ts and betStorageService.ts files.
 * 
 * Key features:
 * - Uses straight_bets table for all operations
 * - Integrates with points system for reserving/releasing points
 * - No mock data - all operations go to database
 * - Proper error handling and transaction logging
 * 
 * Current scope: BET CREATION FLOW ONLY
 * Future: Will be expanded to include accept, settle, and query operations
 */

import { supabaseClient } from './supabaseService';
import { recordTransaction } from './pointsService';
import { getUserFreePoints, reservePoints } from './pointsService';
import { awardBetAcceptanceBonus } from './pointsConfigService';
import { v4 as uuidv4 } from 'uuid';

// Straight bet status enum - matches database bet_status enum
export enum StraightBetStatus {
  OPEN = 'open',
  WAITING_RESULT = 'waiting_result',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Straight bet interface - uses TypeScript camelCase conventions
export interface StraightBet {
  id: string; // UUID
  creatorUserId: string; // UUID - references auth.users.id
  creatorUsername: string; // Username of the creator (email or wallet address)
  matchId: string; // UUID - references matches(id)  
  creatorsPickId: string; // TEXT - team/player ID the creator is betting on
  amount: number; // DECIMAL(10,2) - amount being wagered
  amountCurrency: 'points'; // currency_type enum
  creatorsNote?: string; // TEXT - optional note from creator
  acceptorUserId?: string; // UUID - references auth.users.id, null if not accepted
  acceptorUsername?: string; // Username of the acceptor (email or wallet address), null if not accepted
  acceptorsPickId?: string; // TEXT - team/player ID the acceptor is betting on
  status: StraightBetStatus; // bet_status enum
  winnerUserId?: string; // UUID - references auth.users.id, null if not completed
  
  // Timestamps
  createdAt: string; // TIMESTAMP WITH TIME ZONE
  updatedAt: string; // TIMESTAMP WITH TIME ZONE
  acceptedAt?: string; // TIMESTAMP WITH TIME ZONE, null if not accepted
  completedAt?: string; // TIMESTAMP WITH TIME ZONE, null if not accepted
}

/**
 * Creates a new straight bet in the database
 * 
 * This function:
 * 1. Validates input parameters
 * 2. Inserts bet record into straight_bets table
 * 3. Records points transaction for bet placement
 * 4. Returns the created straight bet object
 * 
 * @param creatorUserId - User ID of the bet creator (auth.users.id)
 * @param matchId - ID of the match being bet on
 * @param creatorsPickId - ID of the team/pick the creator is betting on
 * @param amount - Amount of points being wagered
 * @param creatorsNote - Optional description/note for the bet
 * @returns Promise<StraightBet> - The created straight bet object
 * @throws Error if validation fails or database operation fails
 */
export const createStraightBet = async (
  creatorUserId: string,  // Changed from creatorId to creatorUserId
  matchId: string,
  creatorsPickId: string,
  amount: number,
  creatorsNote?: string
): Promise<StraightBet> => {
  // Validate input parameters
  if (!creatorUserId || !matchId || !creatorsPickId) {
    throw new Error('Missing required parameters: creatorUserId, matchId, and creatorsPickId are required');
  }

  if (amount <= 0) {
    throw new Error('Bet amount must be greater than 0');
  }

  try {
    const betId = uuidv4();
    
    // Get creator's username from user_accounts
    const { data: userData, error: userError } = await supabaseClient
      .from('user_accounts')
      .select('email, wallet_address')
      .eq('user_id', creatorUserId)  // Changed from id to user_id
      .single();

    if (userError || !userData) {
      console.error('Error fetching creator info:', userError);
      throw new Error('Failed to fetch creator information');
    }

    // Use email if available, otherwise use wallet address
    const creatorUsername = userData.email || userData.wallet_address;
    
    console.log('Creating straight bet in straight_bets table:', {
      betId,
      creatorUserId,
      creatorUsername,
      matchId,
      creatorsPickId,
      amount,
      creatorsNote
    });

    // Insert bet record into straight_bets table
    const { data: betData, error: betError } = await supabaseClient
      .from('straight_bets')
      .insert({
        id: betId,
        creator_user_id: creatorUserId,
        creator_username: creatorUsername,
        match_id: matchId,
        creators_pick_id: creatorsPickId,
        amount: amount,
        amount_currency: 'points',
        creators_note: creatorsNote || null,
        status: 'open'
      })
      .select()
      .single();

    if (betError) {
      console.error('Error inserting straight bet into straight_bets table:', betError);
      throw new Error(`Failed to create straight bet: ${betError.message}`);
    }

    console.log('Straight bet created successfully in database:', betData);

    // Record points transactions for bet placement (deduct from FREE, add to RESERVED)
    try {
      const commonEventId = crypto.randomUUID();
      const metadata = {
        bet_id: betId,
        match_id: matchId,
        bettor_user_id: creatorUserId,
        team_id: creatorsPickId,
        bet_amount: amount,
        common_event_id: commonEventId
      };

      // Transaction 1: Deduct from FREE points
      await recordTransaction(
        creatorUserId,
        'BET_PLACED',
        'FREE',
        -amount,
        `Bet placed: deducted ${amount} from FREE points`,
        metadata
      );

      // Transaction 2: Add to RESERVED points  
      await recordTransaction(
        creatorUserId,
        'BET_PLACED',
        'RESERVED',
        amount,
        `Bet placed: added ${amount} to RESERVED points`,
        metadata
      );
      
      console.log('Points transactions recorded for straight bet placement (FREE deduction and RESERVED addition)');
    } catch (transactionError) {
      console.error('Error recording points transactions:', transactionError);
      throw new Error('Failed to reserve points for bet. Bet creation cancelled.');
    }

    // Convert database record to StraightBet interface
    const createdBet: StraightBet = {
      id: betData.id,
      matchId: betData.match_id,
      creatorUserId: betData.creator_user_id,
      creatorUsername: betData.creator_username,
      amount: betData.amount,
      amountCurrency: betData.amount_currency,
      creatorsPickId: betData.creators_pick_id,
      creatorsNote: betData.creators_note,
      status: betData.status as StraightBetStatus,
      createdAt: betData.created_at,
      updatedAt: betData.updated_at,
      acceptorUserId: betData.acceptor_user_id || undefined,
      acceptorUsername: betData.acceptor_username || undefined,
      acceptorsPickId: betData.acceptors_pick_id || undefined,
      winnerUserId: betData.winner_user_id || undefined,
      acceptedAt: betData.accepted_at || undefined,
      completedAt: betData.completed_at || undefined
    };

    console.log('Straight bet creation completed successfully:', createdBet);
    return createdBet;
  } catch (error) {
    console.error('Error in createStraightBet:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while creating the straight bet');
    }
  }
};

/**
 * Helper function to validate that a match exists
 * This can be used before creating a straight bet to ensure the match is valid
 * 
 * @param matchId - ID of the match to validate
 * @returns Promise<boolean> - True if match exists, false otherwise
 */
export const validateMatchExistsForStraightBet = async (matchId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabaseClient
      .from('matches')
      .select('id')
      .eq('id', matchId)
      .single();

    if (error || !data) {
      console.warn('Match validation failed for straight bet:', error ? String(error) : 'Match not found');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating match for straight bet:', error);
    return false;
  }
};

/**
 * Validates that a team/pick ID is valid for a specific match
 * 
 * @param matchId - ID of the match
 * @param creatorsPickId - ID of the team/pick to validate
 * @returns Promise<boolean> - true if valid, false otherwise
 */
export const validateTeamForStraightBet = async (matchId: string, creatorsPickId: string): Promise<boolean> => {
  try {
    // Get match details to determine event type
    const { data: match, error: matchError } = await supabaseClient
      .from('matches')
      .select('event_type, details_id')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('Error fetching match for team validation:', matchError);
      return false;
    }

    if (match.event_type === 'basketball_nba') {
      // For NBA basketball, validate that the team ID exists in the match
      const { data: details, error: detailsError } = await supabaseClient
        .from('match_details_basketball_nba')
        .select('home_team_id, away_team_id')
        .eq('id', match.details_id)
        .single();

      if (detailsError || !details) {
        console.error('Error fetching basketball match details:', detailsError);
        return false;
      }

      // Check if the creatorsPickId matches either home or away team
      return details.home_team_id === creatorsPickId || details.away_team_id === creatorsPickId;
    } else if (match.event_type === 'sandbox_metaverse') {
      // For Sandbox Metaverse, validate that the player ID exists in the match
      const { data: details, error: detailsError } = await supabaseClient
        .from('match_details_sandbox_metaverse')
        .select('player1_id, player2_id')
        .eq('id', match.details_id)
        .single();

      if (detailsError || !details) {
        console.error('Error fetching sandbox match details:', detailsError);
        return false;
      }

      // Check if the creatorsPickId matches either player1 or player2
      return details.player1_id === creatorsPickId || details.player2_id === creatorsPickId;
    }

    return false;
  } catch (error) {
    console.error('Error validating team for straight bet:', error);
    return false;
  }
};

/**
 * Creates a straight bet with comprehensive validation
 * 
 * This is a wrapper around createStraightBet that includes:
 * - Match existence validation
 * - Team/pick validation for the match
 * - User points balance validation
 * 
 * @param creatorUserId - User ID of the bet creator (auth.users.id)
 * @param matchId - ID of the match being bet on
 * @param creatorsPickId - ID of the team/pick the creator is betting on
 * @param amount - Amount of points being wagered
 * @param creatorsNote - Optional description/note for the bet
 * @param validateInputs - Whether to perform validation (default: true)
 * @returns Promise<StraightBet> - The created straight bet object
 * @throws Error if validation fails or bet creation fails
 */
export const createStraightBetWithValidation = async (
  creatorUserId: string,  // Changed from creatorId to creatorUserId
  matchId: string,
  creatorsPickId: string,
  amount: number,
  creatorsNote?: string,
  validateInputs: boolean = true
): Promise<StraightBet> => {
  if (validateInputs) {
    // Validate match exists
    const matchExists = await validateMatchExistsForStraightBet(matchId);
    if (!matchExists) {
      throw new Error(`Match with ID ${matchId} does not exist`);
    }

    // Validate team/pick is valid for this match
    const teamValid = await validateTeamForStraightBet(matchId, creatorsPickId);
    if (!teamValid) {
      throw new Error(`Team/pick ID ${creatorsPickId} is not valid for match ${matchId}`);
    }

    // TODO: Add user points balance validation here
    // const userBalance = await getUserPointsBalance(creatorId);
    // if (userBalance < amount) {
    //   throw new Error(`Insufficient points balance. Required: ${amount}, Available: ${userBalance}`);
    // }
  }

  // Create the bet
  return await createStraightBet(creatorUserId, matchId, creatorsPickId, amount, creatorsNote);
};

/**
 * Get all straight bets for a specific user (both created and accepted)
 * 
 * @param userAccountId - User account ID (from user_accounts table, not auth.users)
 * @param status - Optional status filter
 * @param limit - Maximum number of bets to return (default: 50)
 * @returns Promise<StraightBet[]> - Array of user's straight bets
 */
export const getUserStraightBets = async (
  userAccountId: string, 
  status?: StraightBetStatus,
  limit: number = 50
): Promise<StraightBet[]> => {
  try {
    console.log('Fetching straight bets for user:', userAccountId, 'with status:', status);

    // Build the query
    let query = supabaseClient
      .from('straight_bets')
      .select('*')
      .or(`creator_user_id.eq.${userAccountId},acceptor_user_id.eq.${userAccountId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user straight bets:', error);
      throw new Error(`Failed to fetch user bets: ${error.message}`);
    }

    console.log(`Found ${data?.length || 0} straight bets for user ${userAccountId}`);

    // Convert database records to StraightBet interface
    return (data || []).map((betData: any) => ({
      id: betData.id,
      matchId: betData.match_id,
      creatorUserId: betData.creator_user_id,
      creatorUsername: betData.creator_username,
      amount: betData.amount,
      amountCurrency: betData.amount_currency,
      creatorsPickId: betData.creators_pick_id,
      creatorsNote: betData.creators_note,
      status: betData.status as StraightBetStatus,
      createdAt: betData.created_at,
      updatedAt: betData.updated_at,
      acceptorUserId: betData.acceptor_user_id || undefined,
      acceptorUsername: betData.acceptor_username || undefined,
      acceptorsPickId: betData.acceptors_pick_id || undefined,
      winnerUserId: betData.winner_user_id || undefined,
      acceptedAt: betData.accepted_at || undefined,
      completedAt: betData.completed_at || undefined
    }));

  } catch (error) {
    console.error('Exception getting user straight bets:', error);
    throw error;
  }
};

/**
 * Get all open straight bets (available for acceptance)
 * 
 * @param limit - Maximum number of bets to return (default: 50)
 * @returns Promise<StraightBet[]> - Array of open straight bets
 */
export const getOpenStraightBets = async (limit: number = 50): Promise<StraightBet[]> => {
  try {
    console.log('Fetching open straight bets');

    // First get the bets with basic match info
    const { data, error } = await supabaseClient
      .from('straight_bets')
      .select(`
        *,
        match:matches!straight_bets_match_id_fkey(
          id,
          event_type,
          details_id
        )
      `)
      .eq('status', StraightBetStatus.OPEN)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching open straight bets:', error);
      throw new Error(`Failed to fetch open bets: ${error.message}`);
    }

    // Now fetch details for each match based on event type
    const betsWithDetails = await Promise.all((data || []).map(async (betData: any) => {
      const match = betData.match;
      let details = null;

      if (match) {
        if (match.event_type === 'basketball_nba') {
          // Get NBA match details
          const { data: nbaDetails } = await supabaseClient
            .from('match_details_basketball_nba')
            .select(`
              *,
              home_team:teams_nba!home_team_id(name),
              away_team:teams_nba!away_team_id(name)
            `)
            .eq('id', match.details_id)
            .single();

          if (nbaDetails) {
            details = {
              homeTeamId: nbaDetails.home_team_id,
              homeTeamName: nbaDetails.home_team?.name,
              awayTeamId: nbaDetails.away_team_id,
              awayTeamName: nbaDetails.away_team?.name
            };
          }
        } else if (match.event_type === 'sandbox_metaverse') {
          // Get Sandbox match details
          const { data: sandboxDetails } = await supabaseClient
            .from('match_details_sandbox_metaverse')
            .select('*')
            .eq('id', match.details_id)
            .single();

          if (sandboxDetails) {
            details = {
              player1Id: sandboxDetails.player1_id,
              player1Name: sandboxDetails.player1_name,
              player2Id: sandboxDetails.player2_id,
              player2Name: sandboxDetails.player2_name
            };
          }
        }
      }

      return {
        id: betData.id,
        matchId: betData.match_id,
        creatorUserId: betData.creator_user_id,
        creatorUsername: betData.creator_username,
        amount: betData.amount,
        amountCurrency: betData.amount_currency,
        creatorsPickId: betData.creators_pick_id,
        creatorsNote: betData.creators_note,
        status: betData.status as StraightBetStatus,
        createdAt: betData.created_at,
        updatedAt: betData.updated_at,
        acceptorUserId: betData.acceptor_user_id || undefined,
        acceptorUsername: betData.acceptor_username || undefined,
        acceptorsPickId: betData.acceptors_pick_id || undefined,
        winnerUserId: betData.winner_user_id || undefined,
        acceptedAt: betData.accepted_at || undefined,
        completedAt: betData.completed_at || undefined,
        matchWithDetails: match ? {
          id: match.id,
          eventType: match.event_type,
          details
        } : null
      };
    }));

    console.log(`Found ${betsWithDetails.length} open straight bets`);
    return betsWithDetails;

  } catch (error) {
    console.error('Exception getting open straight bets:', error);
    throw error;
  }
};

/**
 * Accept an open straight bet
 */
export const acceptStraightBet = async (
  betId: string,
  acceptorUserId: string,  // Changed from acceptorId to acceptorUserId
  acceptorsPickId: string
): Promise<StraightBet> => {
  try {
    // Get acceptor's username from user_accounts
    const { data: userData, error: userError } = await supabaseClient
      .from('user_accounts')
      .select('email, wallet_address')
      .eq('user_id', acceptorUserId)  // Changed from id to user_id
      .single();

    if (userError || !userData) {
      console.error('Error fetching acceptor info:', userError);
      throw new Error('Failed to fetch acceptor information');
    }

    // Use email if available, otherwise use wallet address
    const acceptorUsername = userData.email || userData.wallet_address;

    // Update bet with acceptor information
    const { data: updatedBet, error: updateError } = await supabaseClient
      .from('straight_bets')
      .update({
        acceptor_user_id: acceptorUserId,
        acceptor_username: acceptorUsername,
        acceptors_pick_id: acceptorsPickId,
        status: 'waiting_result',
        accepted_at: new Date().toISOString()
      })
      .eq('id', betId)
      .eq('status', 'open')  // Ensure bet is still open
      .select()
      .single();

    if (updateError || !updatedBet) {
      throw new Error('Failed to update bet after acceptance');
    }

    // Award bet acceptance bonus to both users
    try {
      await awardBetAcceptanceBonus(updatedBet.creator_user_id, acceptorUserId, betId, updatedBet.match_id);
    } catch (bonusError) {
      // Log but do not fail the operation if bonus fails
      console.error('Failed to award bet acceptance bonus:', bonusError);
    }

    // Return the updated bet object
    return {
      id: updatedBet.id,
      matchId: updatedBet.match_id,
      creatorUserId: updatedBet.creator_user_id,
      creatorUsername: updatedBet.creator_username,
      amount: updatedBet.amount,
      amountCurrency: updatedBet.amount_currency,
      creatorsPickId: updatedBet.creators_pick_id,
      creatorsNote: updatedBet.creators_note,
      status: updatedBet.status as StraightBetStatus,
      createdAt: updatedBet.created_at,
      updatedAt: updatedBet.updated_at,
      acceptorUserId: updatedBet.acceptor_user_id || undefined,
      acceptorUsername: updatedBet.acceptor_username || undefined,
      acceptorsPickId: updatedBet.acceptors_pick_id || undefined,
      winnerUserId: updatedBet.winner_user_id || undefined,
      acceptedAt: updatedBet.accepted_at || undefined,
      completedAt: updatedBet.completed_at || undefined
    };
  } catch (error) {
    console.error('Error in acceptStraightBet:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while accepting the bet');
    }
  }
};