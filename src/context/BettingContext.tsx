import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useWeb3 } from './Web3Context';
import { useDarePoints } from './DarePointsContext';
import { useAuth } from './AuthContext';
import { Match, Bet, BetStatus } from '../types';
import { fetchNBAMatches } from '../services/oddsApi';
import { createBet, getBetsByUser, getAllBets, acceptBet as acceptBetService, settleBet as settleBetService, cancelBet } from '../services/bettingService';
import { INITIAL_MOCK_BETS } from '../data/mockBets';
import { MOCK_MATCHES } from '../data/mockMatches';
import * as betStorageService from '../services/betStorageService';
import { storeBet, updateBet } from '../services/betStorageService';
import { updateDarePoints } from '../services/supabaseService';

interface BettingContextType {
  matches: Match[];
  loadingMatches: boolean;
  userBets: Bet[];
  loadingBets: boolean;
  isLiveData: boolean;
  dataSource: string;
  createNewBet: (matchId: string, teamId: string, amount: number, description: string) => Promise<Bet | null>;
  settleBet: (betId: string) => Promise<boolean>;
  refreshMatches: () => Promise<void>;
  refreshBets: () => Promise<void>;
  getMatchById: (id: string) => Match | undefined;
  getBetById: (id: string) => Bet | undefined;
  debugCache: () => void;
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
  const { deductPoints, addPoints, createBetEscrow, acceptBetEscrow, settleBetEscrow, refundBetEscrow, getEscrowByBet } = useDarePoints();
  const { user, isAuthenticated } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(false);
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState<boolean>(false);
  const [isLiveData, setIsLiveData] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('Loading...');
  const [lastBetsLoadTime, setLastBetsLoadTime] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Ref to keep a cache of all matches we've seen
  const matchCacheRef = useRef<Map<string, Match>>(new Map());

  // Helper function to get current user ID (either from wallet or email)
  const getCurrentUserId = (): string | null => {
    // Use user.id from AuthContext if available (works for both wallet and email login)
    if (user?.id) {
      return user.id;
    }
    // Fallback to wallet account if available but no user.id
    return account;
  };

  // Use useCallback to memoize these functions and prevent unnecessary rerenders
  const refreshMatches = useCallback(async () => {
    try {
      setLoadingMatches(true);
      
      console.log('=== BETTING CONTEXT: Starting to refresh matches... ===');
      
      // Try to get matches from The Odds API first
      let fetchedMatches: Match[] = [];
      let dataSourceValue = 'mock';
      let isLiveDataValue = false;
      
      try {
        console.log('=== BETTING CONTEXT: Attempting to fetch from The Odds API... ===');
        const oddsApiResponse = await fetchNBAMatches();
        fetchedMatches = oddsApiResponse.matches;
        
        if (fetchedMatches && fetchedMatches.length > 0) {
          console.log(`=== BETTING CONTEXT: Fetched ${fetchedMatches.length} matches from The Odds API ===`);
          console.log('First match:', fetchedMatches[0] ? 
            `${fetchedMatches[0].away_team.name} vs ${fetchedMatches[0].home_team.name}` : 'No matches');
          
          dataSourceValue = oddsApiResponse.dataSource || 'the_odds_api';
          isLiveDataValue = oddsApiResponse.isLive;
          
          console.log(`=== BETTING CONTEXT: Data source: ${dataSourceValue}, Is live: ${isLiveDataValue} ===`);
        } else {
          console.log('=== BETTING CONTEXT: No matches returned from The Odds API, trying Yahoo Sports... ===');
        }
      } catch (apiError) {
        console.error('=== BETTING CONTEXT: Error fetching from The Odds API ===', apiError);
        console.log('=== BETTING CONTEXT: Falling back to Yahoo Sports... ===');
      }
      
      // If no matches found, try mock data as fallback
      if (!fetchedMatches || fetchedMatches.length === 0) {
        try {
          console.log('=== BETTING CONTEXT: Using mock match data as final fallback ===');
          fetchedMatches = [...MOCK_MATCHES];
          dataSourceValue = 'mock';
          isLiveDataValue = false;
          
          if (fetchedMatches.length === 0) {
            console.error('=== BETTING CONTEXT: Even mock data fetch failed! ===');
          } else {
            console.log(`=== BETTING CONTEXT: Loaded ${fetchedMatches.length} mock matches ===`);
            console.log('First mock match:', fetchedMatches[0] ? 
              `${fetchedMatches[0].away_team.name} vs ${fetchedMatches[0].home_team.name}` : 'No matches');
          }
        } catch (mockError) {
          console.error('=== BETTING CONTEXT: Error using mock matches ===', mockError);
        }
      }
      
      // Debug the fetched matches
      if (fetchedMatches && fetchedMatches.length > 0) {
        fetchedMatches.forEach((match, index) => {
          console.log(`=== BETTING CONTEXT: Match ${index + 1} ===`);
          console.log(`ID: ${match.id}`);
          console.log(`Teams: ${match.away_team.name} vs ${match.home_team.name}`);
          console.log(`Time: ${match.commence_time}`);
          console.log(`Has bookmakers: ${match.bookmakers && match.bookmakers.length > 0 ? 'Yes' : 'No'}`);
        });
      }
      
      // Set the data source values
      setDataSource(dataSourceValue);
      setIsLiveData(isLiveDataValue);
      
      // Update the cache with all matches - crucially important for bet display
      fetchedMatches.forEach((match: Match) => {
        matchCacheRef.current.set(match.id, match);
      });
      
      console.log(`=== BETTING CONTEXT: Match cache now contains ${matchCacheRef.current.size} matches ===`);
      
      // Update the matches state
      setMatches(fetchedMatches);
      
      // Log some details about the fetched matches for debugging
      if (fetchedMatches.length > 0) {
        console.log('=== BETTING CONTEXT: Sample match ===', {
          id: fetchedMatches[0].id,
          teams: `${fetchedMatches[0].home_team.name} vs ${fetchedMatches[0].away_team.name}`,
          hasBookmakers: !!fetchedMatches[0].bookmakers?.length,
          source: dataSourceValue
        });
      }
    } catch (error) {
      console.error('=== BETTING CONTEXT: Error refreshing matches ===', error);
      setIsLiveData(false);
      setDataSource('mock');
      
      // Try to load mock data as a last resort
      try {
        const mockData = [...MOCK_MATCHES];
        setMatches(mockData);
        console.log('=== BETTING CONTEXT: Loaded emergency mock data ===');
        
        // Update the cache
        mockData.forEach((match: Match) => {
          matchCacheRef.current.set(match.id, match);
        });
      } catch (mockError) {
        console.error('=== BETTING CONTEXT: Even mock data failed to load ===', mockError);
      }
    } finally {
      setLoadingMatches(false);
      console.log('=== BETTING CONTEXT: Finished refreshing matches ===');
    }
  }, []);

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
      
      // Fetch the user's bets using userId instead of account
      const fetchedBets = await getBetsByUser(userId);
      
      // Process all bets to ensure they have is_mock property
      const processedBets = fetchedBets.map(bet => ({
        ...bet,
        is_mock: isMockBet(bet)
      }));
      
      setUserBets(processedBets);
      
      // Log the debug info
      console.log(`Refreshed bets, total: ${processedBets.length}, mock: ${processedBets.filter(b => b.is_mock).length}`);
      
      // Update the load time
      setLastBetsLoadTime(Date.now());
    } catch (error) {
      console.error('Error refreshing bets:', error);
    } finally {
      setLoadingBets(false);
    }
  }, [user, account]);

  // Initial data loading
  useEffect(() => {
    if (!isInitialized) {
      const initializeData = async () => {
        await refreshMatches();
        if (isAuthenticated) {
          await refreshBets();
        }
        setIsInitialized(true);
      };
      
      initializeData();
    }
  }, [isAuthenticated, refreshMatches, refreshBets, isInitialized]);

  // Refresh data when user changes
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      refreshBets();
    }
  }, [isAuthenticated, user, account, isInitialized, refreshBets]);

  const createNewBet = async (matchId: string, teamId: string, amount: number, description: string): Promise<Bet | null> => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error('Please sign in to place a bet');
      return null;
    }
    
    try {
      // Ensure amount is a number
      const numericAmount = Number(amount);
      
      if (isNaN(numericAmount) || numericAmount <= 0) {
        toast.error('Invalid bet amount');
        return null;
      }
      
      // Create a new bet object with userId instead of account
      const newBet: Bet = {
        id: `bet_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        creator: userId,
        matchId,
        teamId,
        amount: numericAmount,
        status: BetStatus.OPEN,
        timestamp: Date.now(),
        description: description || undefined
      };
      
      // Deduct DARE points from the user's balance - silently to avoid duplicate notifications
      const deductResult = await deductPoints(numericAmount, newBet.id, `Created bet on match ${matchId}`, true);
      
      if (!deductResult) {
        toast.error('Failed to deduct DARE points');
        return null;
      }
      
      // Create escrow for the bet - silently to avoid duplicate notifications
      const escrow = await createBetEscrow(newBet.id, numericAmount, true);
      
      if (!escrow) {
        toast.error('Failed to create escrow');
        return null;
      }
      
      // Add escrow ID to the bet before creating it
      newBet.escrowId = escrow.id;
      
      // Save the bet using the service
      const createdBet = await createBet(
        newBet.creator,
        newBet.matchId,
        newBet.teamId,
        newBet.amount,
        newBet.description || '',
        escrow.id // Pass the escrow ID as an argument
      );
      
      if (!createdBet) {
        toast.error('Failed to create bet');
        return null;
      }
      
      // Make sure the escrow ID is included in the created bet
      createdBet.escrowId = escrow.id;
      
      // Log the bet before storing
      console.log('Storing bet in Supabase:', createdBet);
      
      // Store the bet in Supabase
      const storeResult = await storeBet(createdBet);
      
      if (!storeResult) {
        console.error('Failed to store bet in Supabase, but bet was created locally');
      } else {
        console.log('Successfully stored bet in Supabase!');
        
        // Try to update the user's DARE points in Supabase to match their wallet's record
        // This helps keep the leaderboard up-to-date
        try {
          if (user?.id) {
            await updateDarePoints(user.id, 0); // Update with 0 to sync the current balance
            console.log('Updated user DARE points in Supabase for leaderboard');
          }
        } catch (pointsError) {
          console.error('Failed to update user DARE points for leaderboard:', pointsError);
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
      
      // Get the match associated with this bet
      const match = getMatchById(bet.matchId);
      
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
      
      // Get the escrow for this bet
      const escrow = await getEscrowByBet(bet.id);
      
      if (!escrow) {
        toast.error('Escrow not found for this bet');
        return false;
      }
      
      // Settle the bet's escrow
      const settleEscrowResult = await settleBetEscrow(escrow.id, winnerId);
      
      if (!settleEscrowResult) {
        toast.error('Failed to settle bet escrow');
        return false;
      }
      
      // Call the service to settle the bet
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

  const getMatchById = (id: string): Match | undefined => {
    // First try to find the match in the current matches list
    const currentMatch = matches.find(match => match.id === id);
    if (currentMatch) {
      return currentMatch;
    }
    
    // If not found in current matches, try to get it from our cache
    const cachedMatch = matchCacheRef.current.get(id);
    if (cachedMatch) {
      console.log('Match not in current list, but found in cache:', id);
      return cachedMatch;
    }
    
    // If we still can't find it, log a warning
    console.warn('Match not found in current list or cache:', id);
    return undefined;
  };

  // Add a debug method to inspect the match cache
  const debugCache = () => {
    console.log('Current matches in state:', matches.length);
    console.log('Current matches in cache:', matchCacheRef.current.size);
    
    // Log some stats about the cached matches
    const cachedMatchIds = Array.from(matchCacheRef.current.keys());
    console.log('Cached match IDs:', cachedMatchIds);
    
    // Compare with bet match IDs
    const betMatchIds = userBets.map(bet => bet.matchId);
    const uniqueBetMatchIds = [...new Set(betMatchIds)];
    console.log('Unique bet match IDs:', uniqueBetMatchIds);
    
    // Check if all bet match IDs are in the cache
    const missingMatchIds = uniqueBetMatchIds.filter(id => !matchCacheRef.current.has(id));
    console.log('Missing match IDs in cache:', missingMatchIds);
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
      
      // Deduct points from the user accepting the bet
      const deductResult = await deductPoints(bet.amount, bet.id, `Accepted bet ${bet.id}`, true);
      
      if (!deductResult) {
        toast.error('Failed to deduct DARE points');
        return false;
      }
      
      // Create escrow for the acceptor
      const escrow = bet.escrowId || await createBetEscrow(bet.id, bet.amount, true);
      
      if (!escrow) {
        toast.error('Failed to create escrow');
        return false;
      }
      
      // Get the escrow ID based on whether it's a string or an object
      const escrowId = typeof escrow === 'string' ? escrow : escrow.id;
      
      // Update the bet in the local state
      const acceptedBet = await acceptBetService(bet.id, userId, escrowId);
      
      if (!acceptedBet) {
        toast.error('Failed to accept bet');
        return false;
      }
      
      // Update the bet in Supabase
      const updatedBet = {
        ...bet,
        acceptor: userId,
        status: BetStatus.ACTIVE,
        escrowId: escrowId
      };
      
      const updateResult = await updateBet(updatedBet);
      
      if (!updateResult) {
        console.error('Failed to update bet in Supabase, but bet was accepted locally');
      } else {
        // Try to update the user's DARE points in Supabase for the leaderboard
        try {
          if (user?.id) {
            await updateDarePoints(user.id, 0); // Update with 0 to sync the current balance
            console.log('Updated user DARE points in Supabase for leaderboard');
          }
        } catch (pointsError) {
          console.error('Failed to update user DARE points for leaderboard:', pointsError);
        }
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
        matches,
        loadingMatches,
        userBets,
        loadingBets,
        isLiveData,
        dataSource,
        createNewBet,
        settleBet,
        refreshMatches,
        refreshBets,
        getMatchById,
        getBetById,
        debugCache,
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