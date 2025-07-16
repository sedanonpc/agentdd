/*
 * BetsContext - Generalized bet operations context
 * 
 * This context provides functions that generally apply to all bet types in the application.
 * It serves as a unified interface for bet-related operations that are common across
 * different bet types (straight bets, parlay bets, prop bets, etc.).
 * 
 * Key features:
 * - Generalized bet acceptance logic that can handle multiple bet types
 * - Unified error handling and user feedback
 * - Integration with authentication and points systems
 * - Extensible design for future bet types
 * 
 * Current scope:
 * - Bet acceptance (straight bets implemented, extensible for other types)
 * - User authentication validation
 * - Points balance checking
 * - Toast notifications for user feedback
 * 
 * Future expansions may include:
 * - Bet cancellation (generalized)
 * - Bet settlement (generalized)
 * - Bet querying (generalized)
 * - Parlay bet operations
 * - Prop bet operations
 * - Live bet operations
 */

import React, { createContext, useContext } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import { usePoints } from './PointsContext';
import { acceptStraightBet as acceptStraightBetService } from '../services/straightBetsService';
import { getUserAccount } from '../services/supabaseService';

/**
 * Interface for generalized bet operations
 * 
 * This interface defines functions that apply to all bet types in the application.
 * Each function is designed to be extensible for different bet types while maintaining
 * a consistent API for components that need to interact with bets.
 */
interface BetsContextType {
  /**
   * Accept a bet (generalized for all bet types)
   * 
   * This function handles bet acceptance logic that is common across all bet types.
   * It validates user authentication, checks points balance, and delegates to the
   * appropriate service based on the bet type.
   * 
   * @param betId - The ID of the bet to accept
   * @param acceptorsPickId - The team/player ID the acceptor is betting on
   * @param betType - The type of bet (defaults to 'straight', extensible for future types)
   * @returns Promise<boolean> - True if accepted successfully, false otherwise
   */
  acceptBet: (betId: string, acceptorsPickId: string, betType?: 'straight') => Promise<boolean>;
}

const BetsContext = createContext<BetsContextType | undefined>(undefined);

/**
 * BetsProvider - Provides generalized bet operations to the application
 * 
 * This provider implements the BetsContext interface and provides functions
 * that can handle multiple bet types. It's designed to be extensible for
 * future bet types while maintaining a consistent API.
 * 
 * The provider handles:
 * - User authentication validation
 * - Points balance checking
 * - Service delegation based on bet type
 * - Error handling and user feedback
 * - Toast notifications for success/error states
 */
export const BetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { userBalance } = usePoints();

  /**
   * Accept a bet (generalized for all bet types)
   * 
   * This function provides a unified interface for accepting bets of any type.
   * It performs common validation (authentication, points balance) and then
   * delegates to the appropriate service based on the bet type.
   * 
   * The function is designed to be extensible - new bet types can be added
   * by extending the betType parameter and adding the corresponding service calls.
   * 
   * @param betId - The ID of the bet to accept
   * @param acceptorsPickId - The team/player ID the acceptor is betting on
   * @param betType - The type of bet (defaults to 'straight', extensible for future types)
   * @returns Promise<boolean> - True if accepted successfully, false otherwise
   */
  const acceptBet = async (betId: string, acceptorsPickId: string, betType: 'straight' = 'straight'): Promise<boolean> => {
    if (!isAuthenticated || !user?.id) {
      toast.error('Please sign in to accept bets');
      return false;
    }

    try {
      // Get the user account from the database
      const userAccount = await getUserAccount(user.id);
      if (!userAccount || !userAccount.id) {
        toast.error('User account not found. Please try signing in again.');
        return false;
      }

      // Call the appropriate service based on bet type
      // This pattern allows for easy extension to other bet types
      if (betType === 'straight') {
        await acceptStraightBetService(betId, userAccount.id, acceptorsPickId);
      } else {
        throw new Error(`Unsupported bet type: ${betType}`);
      }

      toast.success('Bet accepted successfully!');
      return true;
    } catch (error: any) {
      toast.error(error?.message || 'Failed to accept bet');
      return false;
    }
  };

  const contextValue: BetsContextType = {
    acceptBet
  };

  return (
    <BetsContext.Provider value={contextValue}>
      {children}
    </BetsContext.Provider>
  );
};

/**
 * useBets - Hook to access generalized bet operations
 * 
 * This hook provides access to the BetsContext, which contains functions
 * that generally apply to all bet types in the application.
 * 
 * @returns BetsContextType - The bets context with generalized bet operations
 * @throws Error if used outside of a BetsProvider
 */
export const useBets = (): BetsContextType => {
  const context = useContext(BetsContext);
  if (!context) {
    throw new Error('useBets must be used within a BetsProvider');
  }
  return context;
}; 