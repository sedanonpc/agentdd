/*
 * StraightBetsContext - Focused context for straight bet operations
 * 
 * This context handles straight bet operations and user bet management.
 * It uses the database-backed straightBetsService for all operations.
 * 
 * Scope: 
 * - Creating new straight bets in the Matches tab
 * - Fetching and managing user's bet list
 * - Validation and error handling
 * - Integration with points system
 * 
 * Future expansions may include:
 * - Bet acceptance
 * - Bet settlement  
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import { usePoints } from './PointsContext';
import { 
  createStraightBetWithValidation, 
  StraightBet, 
  StraightBetStatus,
  getUserStraightBets,
  cancelStraightBet as cancelStraightBetService
} from '../services/straightBetsService';
import { getUserAccount } from '../services/supabaseService';

interface StraightBetsContextType {
  // Bet creation
  isCreatingBet: boolean;
  createStraightBet: (matchId: string, teamId: string, amount: number, description: string) => Promise<StraightBet | null>;
  
  // Bet cancellation
  isCancellingBet: boolean;
  cancelStraightBet: (betId: string) => Promise<boolean>;
  
  // User bet list management
  userBets: StraightBet[];
  isLoadingUserBets: boolean;
  fetchUserBets: (status?: StraightBetStatus) => Promise<void>;
  refreshUserBets: () => Promise<void>;
}

const StraightBetsContext = createContext<StraightBetsContextType | undefined>(undefined);

export const StraightBetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { userBalance, deductPoints } = usePoints();
  
  // Bet creation state
  const [isCreatingBet, setIsCreatingBet] = useState(false);
  
  // Bet cancellation state
  const [isCancellingBet, setIsCancellingBet] = useState(false);
  
  // User bet list state
  const [userBets, setUserBets] = useState<StraightBet[]>([]);
  const [isLoadingUserBets, setIsLoadingUserBets] = useState(false);

  /**
   * Fetches user's straight bets from the database
   * 
   * @param status - Optional status filter
   */
  const fetchUserBets = async (status?: StraightBetStatus): Promise<void> => {
    if (!isAuthenticated || !user?.id) {
      console.log('User not authenticated, skipping bet fetch');
      return;
    }

    setIsLoadingUserBets(true);

    try {
      console.log('=== STRAIGHT BETS CONTEXT: Fetching user bets ===', {
        authUserId: user.id,
        statusFilter: status
      });

      // Get the user account from the database
      const userAccount = await getUserAccount(user.id);
      if (!userAccount || !userAccount.id) {
        console.error('User account not found for bet fetching');
        toast.error('User account not found. Please try signing in again.');
        return;
      }

      // Fetch user's bets using the user_accounts.id
      const bets = await getUserStraightBets(userAccount.id, status);
      
      console.log('=== STRAIGHT BETS CONTEXT: Fetched user bets ===', {
        userAccountId: userAccount.id,
        betCount: bets.length,
        statusFilter: status
      });

      setUserBets(bets);

    } catch (error) {
      console.error('Error fetching user bets:', error);
      toast.error('Failed to load your bets. Please try again.');
    } finally {
      setIsLoadingUserBets(false);
    }
  };

  /**
   * Refreshes the user's bet list
   */
  const refreshUserBets = async (): Promise<void> => {
    await fetchUserBets();
  };

  /**
   * Creates a new straight bet
   * 
   * @param matchId - ID of the match being bet on
   * @param teamId - ID of the team/pick being bet on
   * @param amount - Amount of points being wagered
   * @param description - Optional description/note for the bet
   * @returns Promise<StraightBet | null> - The created bet or null if failed
   */
  const createStraightBet = async (
    matchId: string, 
    teamId: string, 
    amount: number, 
    description: string
  ): Promise<StraightBet | null> => {
    if (!isAuthenticated || !user?.id) {
      toast.error('Please sign in to place bets');
      return null;
    }

    if (amount <= 0) {
      toast.error('Please enter a valid bet amount');
      return null;
    }

    if (amount > userBalance) {
      toast.error('Insufficient DARE points balance');
      return null;
    }

    setIsCreatingBet(true);

    try {
      console.log('=== STRAIGHT BETS CONTEXT: Creating bet ===', {
        authUserId: user.id,
        matchId,
        teamId,
        amount,
        description
      });

      // Get the user account from the database to get the correct user_accounts.id
      const userAccount = await getUserAccount(user.id);
      if (!userAccount || !userAccount.id) {
        toast.error('User account not found. Please try signing in again.');
        return null;
      }

      console.log('=== STRAIGHT BETS CONTEXT: Found user account ===', {
        authUserId: user.id,
        userAccountId: userAccount.id
      });

      // Deduct points from user's balance first (this reserves the points)
      const deductResult = await deductPoints(amount, `bet-${Date.now()}`, `Bet placed on match ${matchId}`, true);
      
      if (!deductResult) {
        toast.error('Failed to reserve DARE points for bet');
        return null;
      }

      console.log('=== STRAIGHT BETS CONTEXT: Points deducted successfully ===');

      // Create the straight bet in the database using the user_accounts.id (not auth.users.id)
      const createdBet = await createStraightBetWithValidation(
        userAccount.id, // Use user_accounts.id instead of auth.users.id
        matchId,
        teamId,
        amount,
        description || undefined,
        true // Enable validation
      );

      console.log('=== STRAIGHT BETS CONTEXT: Bet created successfully ===', createdBet);

      toast.success(`Bet placed successfully! Wagered ${amount} DARE points.`);
      
      // Refresh user bets to include the new bet
      await refreshUserBets();
      
      return createdBet;

    } catch (error) {
      console.error('=== STRAIGHT BETS CONTEXT: Error creating bet ===', error);
      
      if (error instanceof Error) {
        toast.error(`Failed to place bet: ${error.message}`);
      } else {
        toast.error('Failed to place bet. Please try again.');
      }
      
      return null;
    } finally {
      setIsCreatingBet(false);
    }
  };

  /**
   * Cancels a straight bet (only if it's still open and belongs to the user)
   * 
   * @param betId - ID of the bet to cancel
   * @returns Promise<boolean> - True if cancelled successfully, false otherwise
   */
  const cancelStraightBet = async (betId: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.id) {
      toast.error('Please sign in to cancel bets');
      return false;
    }

    setIsCancellingBet(true);

    try {
      console.log('=== STRAIGHT BETS CONTEXT: Cancelling bet ===', {
        authUserId: user.id,
        betId
      });

      // Get the user account from the database
      const userAccount = await getUserAccount(user.id);
      if (!userAccount || !userAccount.id) {
        toast.error('User account not found. Please try signing in again.');
        return false;
      }

      // Call the service function to cancel the bet in the database
      const success = await cancelStraightBetService(betId, userAccount.id);
      
      if (success) {
        // Refresh user bets to get the updated status from the database
        await refreshUserBets();
        toast.success('Bet cancelled successfully');
        return true;
      } else {
        toast.error('Failed to cancel bet. Please try again.');
        return false;
      }

    } catch (error) {
      console.error('=== STRAIGHT BETS CONTEXT: Error cancelling bet ===', error);
      
      if (error instanceof Error) {
        toast.error(`Failed to cancel bet: ${error.message}`);
      } else {
        toast.error('Failed to cancel bet. Please try again.');
      }
      return false;
    } finally {
      setIsCancellingBet(false);
    }
  };

  // Load user bets when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchUserBets();
    } else {
      // Clear bets when user logs out
      setUserBets([]);
    }
  }, [isAuthenticated, user?.id]);

  const contextValue: StraightBetsContextType = {
    // Bet creation
    isCreatingBet,
    createStraightBet,
    
    // User bet list management
    userBets,
    isLoadingUserBets,
    fetchUserBets,
    refreshUserBets,
    // Bet cancellation
    isCancellingBet,
    cancelStraightBet
  };

  return (
    <StraightBetsContext.Provider value={contextValue}>
      {children}
    </StraightBetsContext.Provider>
  );
};

export const useStraightBets = (): StraightBetsContextType => {
  const context = useContext(StraightBetsContext);
  if (context === undefined) {
    throw new Error('useStraightBets must be used within a StraightBetsProvider');
  }
  return context;
}; 