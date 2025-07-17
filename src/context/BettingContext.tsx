/*
 * ⚠️ DEPRECATED - SCHEDULED FOR REMOVAL ⚠️
 * 
 * This context is deprecated and scheduled for removal.
 * 
 * DO NOT USE THIS CONTEXT FOR NEW FEATURES.
 * DO NOT EXTEND OR MODIFY THIS CONTEXT.
 * 
 * This context manages legacy betting functionality that is being replaced 
 * by specialized contexts:
 * - StraightBetsContext for straight bet creation in Matches tab
 * - Future contexts for bet acceptance, settlement, and marketplace
 * 
 * Current usage will be gradually migrated to the new contexts.
 * This file will be moved to src/context/for_removal/ folder.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useWeb3 } from './Web3Context';
import { usePoints } from './PointsContext';
import { useAuth } from './AuthContext';
import { useMatches } from './MatchesContext';
import { Bet, BetStatus } from '../types';
import { createBet, getBetsByUser, acceptBet as acceptBetService, settleBet as settleBetService } from '../services/for_removal/bettingService';
import { storeBet, updateBet } from '../services/for_removal/betStorageService';
import { updatePoints } from '../services/supabaseService';
import { awardBetAcceptanceBonus } from '../services/pointsConfigService';

interface BettingContextType {
  userBets: Bet[];
  loadingBets: boolean;
  createNewBet: (matchId: string, teamId: string, amount: number, description: string) => Promise<Bet | null>;
  settleBet: (betId: string) => Promise<boolean>;
  refreshBets: () => Promise<void>;
  getBetById: (id: string) => Bet | undefined;
  acceptBet: (bet: Bet) => Promise<boolean>;
}

const BettingContext = createContext<BettingContextType | undefined>(undefined);

// Simple debounce function to prevent rapid consecutive calls
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export const BettingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, isConnected } = useWeb3();
  const { addPoints } = usePoints();
  const { user, isAuthenticated } = useAuth();
  const { getMatchById: getMatchFromContext } = useMatches(); // Get match data from MatchesContext
  
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState<boolean>(false);
  const [lastBetsLoadTime, setLastBetsLoadTime] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Helper function to get current user ID (either from wallet or email)
  const getCurrentUserId = (): string | null => {
    // Use user.id from AuthContext if available (works for both wallet and email login)
    if (user?.id) {
      return user.id;
    }
    // Fallback to wallet account if available but no user.id
    return account;
  };

  // Add this function to identify mock bets
  const isMockBet = (bet: Bet): boolean => {
    // Check if bet already has is_mock flag
    if (bet.is_mock !== undefined) {
      return bet.is_mock;
    }
    
    // Check for mock bet ID pattern (starts with 'mock_')
    if (bet.id.startsWith('mock_')) {
      return true;
    }
    
    // Fallback: Return false for any bet without a clear indication
    return false;
  };

  const refreshBets = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setUserBets([]);
      setLoadingBets(false);
      return;
    }

    try {
      setLoadingBets(true);
      console.log('=== BETTING CONTEXT: Refreshing bets for user:', userId, '===');

      const bets = await getBetsByUser(userId);
      
      if (bets && bets.length > 0) {
        console.log(`=== BETTING CONTEXT: Found ${bets.length} bets for user ===`);
        setUserBets(bets);
      } else {
        console.log('=== BETTING CONTEXT: No bets found for user ===');
        setUserBets([]);
      }
      
      setLastBetsLoadTime(Date.now());
      setIsInitialized(true);
    } catch (error) {
      console.error('=== BETTING CONTEXT: Error refreshing bets ===', error);
      setUserBets([]);
    } finally {
      setLoadingBets(false);
    }
  }, [account, user]);

  // Initialize data on component mount and when authentication changes
  useEffect(() => {
    if (isAuthenticated || isConnected) {
      const initializeData = async () => {
        console.log('=== BETTING CONTEXT: Initializing data ===');
        
        // Load bets for the current user
        await refreshBets();
        
        console.log('=== BETTING CONTEXT: Data initialization complete ===');
      };
      
      initializeData();
    } else {
      // Clear data when not authenticated
      setUserBets([]);
      setIsInitialized(false);
    }
  }, [isAuthenticated, isConnected, refreshBets]);

  const createNewBet = async (matchId: string, teamId: string, amount: number, description: string): Promise<Bet | null> => {
    const userId = getCurrentUserId();
    
    if (!userId) {
      toast.error('Please sign in to create a bet');
      return null;
    }

    try {
      // Get match from MatchesContext
      const match = getMatchFromContext(matchId);
      if (!match) {
        toast.error('Match not found');
        return null;
      }

      // Note: Points will be deducted when the bet is created via the service

      // Create the bet
      const createdBet = await createBet(userId, matchId, teamId, amount, description);
      
      if (!createdBet) {
        toast.error('Failed to create bet');
        return null;
      }

      // Store the bet
      const storeResult = await storeBet(createdBet);
      
      if (!storeResult) {
        console.error('Failed to store bet in Supabase, but bet was created locally');
      } else {
        // Try to update the user's points in Supabase for the leaderboard
        try {
          if (user?.id) {
            await updatePoints(user.id, 0); // Update with 0 to sync the current balance
            console.log('Updated user points in Supabase for leaderboard');
          }
        } catch (pointsError) {
          console.error('Failed to update user points for leaderboard:', pointsError);
        }
      }
      
      toast.success('Bet created successfully');
      
      // Add the bet to the local state
      setUserBets(prevBets => [...prevBets, createdBet]);
      
      // Refresh bets list
      refreshBets();
      
      // Dispatch an event to notify other components that a bet was created
      try {
        // Standard event dispatch
        window.dispatchEvent(new CustomEvent('bet-created', { detail: createdBet }));
        console.log('Event dispatched: bet-created');
        
        // Dispatch a second backup event with different payload format for better compatibility
        const simpleEvent = new CustomEvent('bet-refresh-required', { 
          bubbles: true,
          cancelable: true
        });
        window.dispatchEvent(simpleEvent);
        
        // Force refresh on other components if needed
        if (typeof refreshBets === 'function') {
          setTimeout(refreshBets, 500);  // Delayed refresh
        }
      } catch (eventError) {
        console.error('Error dispatching events:', eventError);
        // Silent fail - the regular polling will still update eventually
      }
      
      return createdBet;
    } catch (error) {
      console.error('Error creating bet:', error);
      toast.error('Failed to create bet');
      return null;
    }
  };

  const settleBet = async (betId: string): Promise<boolean> => {
    try {
      const bet = userBets.find(b => b.id === betId);
      
      if (!bet) {
        toast.error('Bet not found');
        return false;
      }
      
      if (bet.status !== BetStatus.ACTIVE) {
        toast.error('Only active bets can be settled');
        return false;
      }
      
      // Get the match associated with this bet from MatchesContext
      const match = getMatchFromContext(bet.matchId);
      
      if (!match) {
        toast.error('Match not found for this bet');
        return false;
      }
      
      // Only allow settlement if the match has a winner
      if (!match.completed) {
        toast.error('Match has not been completed yet');
        return false;
      }
      
      // For demonstration, use the creator as the winner
      // In a real app, you would check the match results to determine the winner
      const winnerId = bet.creator;
      
      if (!winnerId) {
        toast.error('Unable to determine winner');
        return false;
      }
      
      // Settle the bet
      const settledBet = await settleBetService(bet.id, winnerId);
      
      if (!settledBet) {
        toast.error('Failed to settle bet');
        return false;
      }
      
      // Update the bet in Supabase
      await updateBet(settledBet);
      
      toast.success(`Bet settled - Winner: ${winnerId}`);
      
      // Refresh bets list
      refreshBets();
      
      return true;
      
    } catch (error) {
      console.error('Error settling bet:', error);
      toast.error('Failed to settle bet');
      return false;
    }
  };

  const getBetById = (id: string): Bet | undefined => {
    return userBets.find(bet => bet.id === id);
  };

  // Accept a bet
  const acceptBet = async (bet: Bet): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error('Please sign in to accept a bet');
      return false;
    }
    
    if (bet.status !== BetStatus.OPEN) {
      toast.error('This bet is no longer open for acceptance');
      return false;
    }
    
    if (userId.toLowerCase() === bet.creator.toLowerCase()) {
      toast.error('You cannot accept your own bet');
      return false;
    }
    
    try {
      // Don't allow accepting mock bets if we have a real account
      if (isMockBet(bet) && userId) {
        toast.error('Demo bets cannot be accepted by real accounts');
        return false;
      }
      
      // Note: Points will be deducted when the bet is accepted via the service
      
      // Accept the bet
      const acceptedBet = await acceptBetService(bet.id, userId, '');
      
      if (!acceptedBet) {
        toast.error('Failed to accept bet');
        return false;
      }
      
      // Update the bet in Supabase
      const updatedBet = {
        ...bet,
        acceptor: userId,
        status: BetStatus.ACTIVE
      };
      
      const updateResult = await updateBet(updatedBet);
      
      if (!updateResult) {
        console.error('Failed to update bet in Supabase, but bet was accepted locally');
      } else {
        // Try to update the user's points in Supabase for the leaderboard
        try {
          if (user?.id) {
            await updatePoints(user.id, 0); // Update with 0 to sync the current balance
            console.log('Updated user points in Supabase for leaderboard');
          }
        } catch (pointsError) {
          console.error('Failed to update user points for leaderboard:', pointsError);
        }
      }
      
      // Award bet acceptance bonus to both users
      try {
        await awardBetAcceptanceBonus(bet.creator, userId, bet.id, bet.matchId);
        console.log('Bet acceptance bonus awarded to both users');
      } catch (bonusError) {
        console.error('Failed to award bet acceptance bonus:', bonusError);
        // Don't fail the entire operation if bonus fails
      }

      toast.success('Bet accepted successfully');
      
      // Refresh bets to reflect the changes
      refreshBets();
      
      // Dispatch an event to notify other components that a bet was accepted
      try {
        // Standard event dispatch
        window.dispatchEvent(new CustomEvent('bet-accepted', { detail: bet.id }));
        console.log('Event dispatched: bet-accepted');
        
        // Dispatch a second backup event with different payload format for better compatibility
        const simpleEvent = new CustomEvent('bet-refresh-required', { 
          bubbles: true,
          cancelable: true
        });
        window.dispatchEvent(simpleEvent);
        
        // Force refresh on other components if needed
        if (typeof refreshBets === 'function') {
          setTimeout(refreshBets, 500);  // Delayed refresh
        }
      } catch (eventError) {
        console.error('Error dispatching events:', eventError);
        // Silent fail - the regular polling will still update eventually
      }
      
      return true;
    } catch (error) {
      console.error('Error accepting bet:', error);
      toast.error('Failed to accept bet');
      return false;
    }
  };

  // Using React.memo or useMemo here could also help prevent unnecessary renders
  const contextValue = {
        userBets,
        loadingBets,
        createNewBet,
        settleBet,
        refreshBets,
        getBetById,
        acceptBet
  };

  return (
    <BettingContext.Provider value={contextValue}>
      {children}
    </BettingContext.Provider>
  );
};

export const useBetting = (): BettingContextType => {
  const context = useContext(BettingContext);
  if (context === undefined) {
    throw new Error('useBetting must be used within a BettingProvider');
  }
  return context;
};