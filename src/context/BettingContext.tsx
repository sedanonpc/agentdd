import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useWeb3 } from './Web3Context';
import { Match, Bet, BetStatus } from '../types';
import { fetchNBAMatches } from '../services/oddsApi';
import { createBet, getBetsByUser, getAllBets } from '../services/bettingService';
import { INITIAL_MOCK_BETS } from '../data/mockBets';
import { MOCK_MATCHES } from '../data/mockMatches';

interface BettingContextType {
  matches: Match[];
  loadingMatches: boolean;
  userBets: Bet[];
  loadingBets: boolean;
  isLiveData: boolean;
  dataSource: string;
  createNewBet: (matchId: string, teamId: string, amount: string, description: string) => Promise<Bet | null>;
  settleBet: (betId: string) => Promise<boolean>;
  refreshMatches: () => Promise<void>;
  refreshBets: () => Promise<void>;
  getMatchById: (id: string) => Match | undefined;
  getBetById: (id: string) => Bet | undefined;
  debugCache: () => void;
  acceptBet: (bet: Bet) => Promise<void>;
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

export const BettingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { account, isConnected } = useWeb3();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(true); // Start with loading state
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState<boolean>(true); // Start with loading state
  const [isLiveData, setIsLiveData] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('mock'); // Default to mock
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Create a ref to store a cache of all matches we've ever seen
  // This helps ensure that even if a match is no longer in the current matches list,
  // we can still access its data for bets
  const matchCacheRef = useRef<Map<string, Match>>(new Map());

  // Use useCallback to memoize these functions and prevent unnecessary rerenders
  const refreshMatches = useCallback(async () => {
    // Remove the guard clause that prevents concurrent refreshes
    // if (loadingMatches) return; // Prevent concurrent refreshes
    
    setLoadingMatches(true);
    try {
      const { matches: fetchedMatches, isLive, dataSource: source } = await fetchNBAMatches();
      
      // Add all fetched matches to our cache
      fetchedMatches.forEach(match => {
        matchCacheRef.current.set(match.id, match);
      });
      
      // Only update if the data actually changed
      if (JSON.stringify(fetchedMatches) !== JSON.stringify(matches)) {
      setMatches(fetchedMatches);
        setIsLiveData(isLive);
        setDataSource(source || 'unknown'); // Update the data source
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load NBA matches');
      setIsLiveData(false);
      setDataSource('error');
    } finally {
      setLoadingMatches(false);
    }
  }, [matches]); // Remove loadingMatches from dependencies

  const refreshBets = useCallback(async () => {
    // Only refresh if there's an account connected
    if (!account) {
      setUserBets([]);
      setLoadingBets(false);
      return;
    }
    
    if (loadingBets) return; // Prevent concurrent refreshes
    
    // Make sure we have matches data first
    if (matches.length === 0 && !loadingMatches) {
      await refreshMatches();
    }
    
    setLoadingBets(true);
    try {
      // Fetch all bets
      const allBets = await getAllBets();
      
      // Filter user bets
      const userBetsData = allBets.filter(
        bet => bet.creator === account || bet.acceptor === account
      );
      
      console.log(`Found ${userBetsData.length} bets for user ${account}`);
      
      // Only update if the data actually changed
      if (JSON.stringify(userBetsData) !== JSON.stringify(userBets)) {
        setUserBets(userBetsData);
      }
    } catch (error) {
      console.error('Error fetching bets:', error);
      toast.error('Failed to load bets');
    } finally {
      setLoadingBets(false);
    }
  }, [account, matches.length, loadingMatches, loadingBets, refreshMatches, userBets]);

  // Initial data loading
  useEffect(() => {
    if (!isInitialized) {
      const initializeData = async () => {
        await refreshMatches();
        if (isConnected) {
          await refreshBets();
        }
        setIsInitialized(true);
      };
      
      initializeData();
    }
  }, [isConnected, refreshMatches, refreshBets, isInitialized]);

  // Refresh data when account changes
  useEffect(() => {
    if (isInitialized && isConnected) {
      refreshBets();
    }
  }, [isConnected, account, isInitialized, refreshBets]);

  const createNewBet = async (matchId: string, teamId: string, amount: string, description: string): Promise<Bet | null> => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return null;
    }
    
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) {
        toast.error('Match not found');
        return null;
      }
      
      const newBet = await createBet(account, matchId, teamId, amount, description);
      
      // Manually update the state to ensure the bet appears immediately
      setUserBets(prevUserBets => [...prevUserBets, newBet]);
      
      // Refresh all bets to ensure everything is in sync
      // Use debounce to prevent rapid state changes
      debounce(() => refreshBets(), 500)();
      
      toast.success('Bet created successfully!');
      return newBet;
    } catch (error) {
      console.error('Error creating bet:', error);
      toast.error('Failed to create bet');
      return null;
    }
  };

  const settleBet = async (betId: string): Promise<boolean> => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return false;
    }
    
    try {
      // Implementation would call smart contract function
      // For MVP, just simulate success
      toast.success('Bet settled successfully!');
      debounce(() => refreshBets(), 500)();
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
  const acceptBet = async (bet: Bet): Promise<void> => {
    // In a real app, this would interact with a smart contract
    // For now, we'll just update the local state
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Add the bet to the user's bets
      setUserBets(prevBets => [...prevBets, bet]);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error accepting bet:', error);
      throw error;
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