/*
 * StraightBetsContext - Focused context for straight bet operations
 * 
 * This context handles straight bet operations specifically for the Matches tab.
 * It uses the database-backed straightBetsService for all operations.
 * 
 * Scope: BET CREATION FLOW ONLY
 * - Creating new straight bets in the Matches tab
 * - Validation and error handling
 * - Integration with points system
 * 
 * Future expansions may include:
 * - Bet acceptance
 * - Bet settlement  
 * - Querying user's straight bets
 */

import React, { createContext, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import { usePoints } from './PointsContext';
import { createStraightBetWithValidation, StraightBet } from '../services/straightBetsService';
import { getUserAccount } from '../services/supabaseService';

interface StraightBetsContextType {
  isCreatingBet: boolean;
  createStraightBet: (matchId: string, teamId: string, amount: number, description: string) => Promise<StraightBet | null>;
}

const StraightBetsContext = createContext<StraightBetsContextType | undefined>(undefined);

export const StraightBetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { userBalance, deductPoints } = usePoints();
  const [isCreatingBet, setIsCreatingBet] = useState(false);

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
      
      return createdBet;

    } catch (error) {
      console.error('=== STRAIGHT BETS CONTEXT: Error creating bet ===', error);
      
      // If bet creation failed, we should refund the deducted points
      // TODO: Implement point refund mechanism if needed
      
      if (error instanceof Error) {
        toast.error(`Failed to create bet: ${error.message}`);
      } else {
        toast.error('Failed to create bet. Please try again.');
      }
      
      return null;
      
    } finally {
      setIsCreatingBet(false);
    }
  };

  const value: StraightBetsContextType = {
    isCreatingBet,
    createStraightBet
  };

  return (
    <StraightBetsContext.Provider value={value}>
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