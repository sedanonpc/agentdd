import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Match, MatchWithDetails, NBAMatchDetail, SandboxMetaverseMatchDetail } from '../types/match';
import { getUpcomingMatches } from '../services/supabaseService';
import { useAuth } from './AuthContext';
import { supabaseClient } from '../services/supabaseService';

interface MatchesContextType {
  matchesWithDetails: MatchWithDetails[];
  loading: boolean;
  error: string | null;
  refreshMatches: () => Promise<void>;
  getMatchByIdWithDetails: (id: string) => MatchWithDetails | undefined;
}

const MatchesContext = createContext<MatchesContextType | undefined>(undefined);

export const MatchesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [matchesWithDetails, setMatchesWithDetails] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const fetchDetailsForMatch = async (match: Match): Promise<MatchWithDetails | null> => {
    if (match.event_type === 'basketball_nba') {
      const { data, error } = await supabaseClient
        .from('match_details_basketball_nba')
        .select('*')
        .eq('id', match.details_id)
        .single();
      if (error || !data) return null;
      return { match, details: data as NBAMatchDetail, event_type: 'basketball_nba' };
    } else if (match.event_type === 'sandbox_metaverse') {
      const { data, error } = await supabaseClient
        .from('match_details_sandbox_metaverse')
        .select('*')
        .eq('id', match.details_id)
        .single();
      if (error || !data) return null;
      return { match, details: data as SandboxMetaverseMatchDetail, event_type: 'sandbox_metaverse' };
    }
    return null;
  };

  const refreshMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dbMatches = await getUpcomingMatches(100);
      const detailsPromises = dbMatches.map(fetchDetailsForMatch);
      const detailsResults = await Promise.all(detailsPromises);
      setMatchesWithDetails(detailsResults.filter(Boolean) as MatchWithDetails[]);
    } catch (err) {
      setError(`Failed to fetch matches: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setMatchesWithDetails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMatchByIdWithDetails = useCallback((id: string): MatchWithDetails | undefined => {
    return matchesWithDetails.find(m => m.match.id === id);
  }, [matchesWithDetails]);

  useEffect(() => {
    if (!authLoading) {
      refreshMatches();
    }
  }, [refreshMatches, authLoading, isAuthenticated]);

  const contextValue: MatchesContextType = {
    matchesWithDetails,
    loading,
    error,
    refreshMatches,
    getMatchByIdWithDetails
  };

  return (
    <MatchesContext.Provider value={contextValue}>
      {children}
    </MatchesContext.Provider>
  );
};

export const useMatches = (): MatchesContextType => {
  const context = useContext(MatchesContext);
  if (context === undefined) {
    throw new Error('useMatches must be used within a MatchesProvider');
  }
  return context;
}; 