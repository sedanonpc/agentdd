import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Match } from '../types';
import { getUpcomingMatches } from '../services/supabaseService';
import { fetchNBAMatches } from '../services/oddsApi';
import { DATA_SOURCE_CONFIG } from '../config/dataSource';
import { MOCK_MATCHES } from '../data/mockMatches';
import { useAuth } from './AuthContext';

interface MatchesContextType {
  matches: Match[];
  loading: boolean;
  error: string | null;
  dataSource: 'database' | 'api' | 'mock';
  isLiveData: boolean;
  refreshMatches: () => Promise<void>;
  getMatchById: (id: string) => Match | undefined;
}

const MatchesContext = createContext<MatchesContextType | undefined>(undefined);

export const MatchesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'database' | 'api' | 'mock'>('database');
  const [isLiveData, setIsLiveData] = useState<boolean>(true);

  const { USE_REMOTE_DATABASE } = DATA_SOURCE_CONFIG;
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  // Generate mock matches using configuration
  const generateMockMatches = useCallback((): Match[] => {
    const teams = [
      { id: '1', name: 'Los Angeles Lakers', logo: 'https://content.sportslogos.net/logos/6/237/thumbs/uig7aiht8jnpl1szbi57zzlsh.gif' },
      { id: '2', name: 'Boston Celtics', logo: 'https://content.sportslogos.net/logos/6/213/thumbs/slhg02hbef3j1ov4lsnwyol5o.gif' },
      { id: '3', name: 'Golden State Warriors', logo: 'https://content.sportslogos.net/logos/6/235/thumbs/23531522020.gif' },
      { id: '4', name: 'Miami Heat', logo: 'https://content.sportslogos.net/logos/6/214/thumbs/burm5gh2wvjti3xhei5h16k8e.gif' },
      { id: '5', name: 'Chicago Bulls', logo: 'https://content.sportslogos.net/logos/6/221/thumbs/hj3gmh82w9hffmeh3fjm5h874.gif' },
      { id: '6', name: 'New York Knicks', logo: 'https://content.sportslogos.net/logos/6/216/thumbs/2nn48xofg0hms8k326cqdmuis.gif' },
      { id: '7', name: 'Brooklyn Nets', logo: 'https://content.sportslogos.net/logos/6/3786/thumbs/hsuff5m3dgiv20kovde422r1f.gif' },
      { id: '8', name: 'Philadelphia 76ers', logo: 'https://content.sportslogos.net/logos/6/218/thumbs/qlpk0etqj8v07lrfhh9og3z9o.gif' },
      { id: '9', name: 'Milwaukee Bucks', logo: 'https://content.sportslogos.net/logos/6/225/thumbs/22582752016.gif' },
      { id: '10', name: 'Toronto Raptors', logo: 'https://content.sportslogos.net/logos/6/227/thumbs/22734062018.gif' },
    ];

    const bookmakers = ['DraftKings', 'FanDuel', 'BetMGM', 'PointsBet', 'Caesars'];
    const mockMatches: Match[] = [];

    // Generate matches based on configuration
    const { MOCK_MATCHES_COUNT, MOCK_MATCHES_DAYS_AHEAD, MOCK_ODDS_MIN, MOCK_ODDS_MAX } = DATA_SOURCE_CONFIG;
    
    for (let i = 0; i < MOCK_MATCHES_COUNT; i++) {
      const homeTeamIndex = Math.floor(Math.random() * teams.length);
      let awayTeamIndex = Math.floor(Math.random() * teams.length);
      
      // Ensure home and away teams are different
      while (awayTeamIndex === homeTeamIndex) {
        awayTeamIndex = Math.floor(Math.random() * teams.length);
      }
      
      const homeTeam = teams[homeTeamIndex];
      const awayTeam = teams[awayTeamIndex];
      
      // Generate random time based on configuration
      const randomTime = Date.now() + Math.random() * MOCK_MATCHES_DAYS_AHEAD * 24 * 60 * 60 * 1000;
      
      // Generate random odds based on configuration
      const oddsRange = MOCK_ODDS_MAX - MOCK_ODDS_MIN;
      const homeOdds = Number((Math.random() * oddsRange + MOCK_ODDS_MIN).toFixed(2));
      const awayOdds = Number((Math.random() * oddsRange + MOCK_ODDS_MIN).toFixed(2));
      
      const bookmaker = bookmakers[Math.floor(Math.random() * bookmakers.length)];
      
      const match: Match = {
        id: `mock_${i}_${Date.now()}`,
        sport_key: 'basketball_nba',
        sport_name: 'basketball',
        league_name: 'nba',
        sport_title: 'NBA',
        commence_time: new Date(randomTime).toISOString(),
        home_team: homeTeam,
        away_team: awayTeam,
        bookmakers: [
          {
            key: bookmaker.toLowerCase().replace(/\s+/g, ''),
            title: bookmaker,
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: homeTeam.name, price: homeOdds },
                  { name: awayTeam.name, price: awayOdds }
                ]
              }
            ]
          }
        ],
        completed: false
      };
      
      mockMatches.push(match);
    }
    
    // Sort by commence_time
    return mockMatches.sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());
  }, []);

  const refreshMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (USE_REMOTE_DATABASE) {
        console.log('=== MATCHES CONTEXT: Fetching from Supabase database ===');
        
        // Try to fetch from Supabase database
        const dbMatches = await getUpcomingMatches(50);
        
        if (dbMatches && dbMatches.length > 0) {
          console.log(`=== MATCHES CONTEXT: Successfully fetched ${dbMatches.length} matches from database ===`);
          setMatches(dbMatches);
          setDataSource('database');
          setIsLiveData(true);
        } else {
          console.log('=== MATCHES CONTEXT: No matches found in database ===');
          setMatches([]);
          setDataSource('database');
          setIsLiveData(true);
        }
      } else {
        console.log('=== MATCHES CONTEXT: USE_REMOTE_DATABASE is false, trying external APIs ===');
        
        try {
          // Try to fetch from The Odds API
          console.log('=== MATCHES CONTEXT: Fetching from The Odds API ===');
          const oddsApiResponse = await fetchNBAMatches();
          
          if (oddsApiResponse.matches && oddsApiResponse.matches.length > 0) {
            console.log(`=== MATCHES CONTEXT: Successfully fetched ${oddsApiResponse.matches.length} matches from The Odds API ===`);
            setMatches(oddsApiResponse.matches);
            setDataSource('api');
            setIsLiveData(oddsApiResponse.isLive);
          } else {
            throw new Error('No matches returned from The Odds API');
          }
        } catch (apiError) {
          console.log('=== MATCHES CONTEXT: The Odds API failed, using mock data ===');
          console.error('API Error:', apiError);
          
          // Fallback to mock data when API fails
          const mockMatches = generateMockMatches();
          setMatches(mockMatches);
          setDataSource('mock');
          setIsLiveData(false);
        }
      }
    } catch (error) {
      console.error('=== MATCHES CONTEXT: Error in refreshMatches ===', error);
      
      if (USE_REMOTE_DATABASE) {
        // When using remote database, show error instead of fallback
        setError(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setMatches([]);
      } else {
        // When not using remote database, fallback to mock data
        console.log('=== MATCHES CONTEXT: Falling back to mock data due to error ===');
        const mockMatches = generateMockMatches();
        setMatches(mockMatches);
        setDataSource('mock');
        setIsLiveData(false);
      }
    } finally {
      setLoading(false);
    }
  }, [USE_REMOTE_DATABASE, generateMockMatches]);

  const getMatchById = useCallback((id: string): Match | undefined => {
    return matches.find(match => match.id === id);
  }, [matches]);

  // Initial data loading - wait for authentication to complete
  useEffect(() => {
    // Only load data after authentication is complete
    if (!authLoading) {
      console.log('=== MATCHES CONTEXT: Auth loading complete, fetching matches ===', { 
        isAuthenticated, 
        authLoading 
      });
      refreshMatches();
    }
  }, [refreshMatches, authLoading, isAuthenticated]);

  const contextValue: MatchesContextType = {
    matches,
    loading,
    error,
    dataSource,
    isLiveData,
    refreshMatches,
    getMatchById
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