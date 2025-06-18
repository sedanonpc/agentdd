import { Match } from '../types';
import { scrapeYahooSportsOdds } from './yahooSportsApi';
import { getMatchesWithAutoRefresh } from './dataRefreshService';

interface FeaturedMatchResponse {
  match: Match;
  isLive: boolean;
  dataSource: string;
  liveScore?: {
    home: number;
    away: number;
    quarter: string;
    timeRemaining: string;
  };
}

/**
 * Fetch a featured NBA match with auto-refresh
 */
export const fetchFeaturedMatch = async (): Promise<FeaturedMatchResponse> => {
  console.log('=== FEATURED MATCH SERVICE: Attempting to fetch featured match... ===');
  
  try {
    // Try to fetch with auto-refresh
    const response = await getMatchesWithAutoRefresh();
    
    // We should have at least one match
    if (response.matches && response.matches.length > 0) {
      const featuredMatch = response.matches[0]; // Take the first match
      
      console.log('=== FEATURED MATCH SERVICE: Successfully fetched match ===', 
        `${featuredMatch.away_team.name} vs ${featuredMatch.home_team.name}`);
      console.log(`=== FEATURED MATCH SERVICE: Data ${response.refreshed ? 'was refreshed' : 'came from cache'} ===`);
      
      return {
        match: featuredMatch,
        isLive: response.isLive,
        dataSource: response.dataSource,
        liveScore: {
          home: 59,
          away: 64,
          quarter: 'Q3',
          timeRemaining: '5:22'
        }
      };
    } else {
      throw new Error('No matches available in the response');
    }
  } catch (error) {
    console.error('=== FEATURED MATCH SERVICE: Error fetching featured match with auto-refresh ===', error);
    
    try {
      // Fall back to direct Yahoo scraper
      console.log('=== FEATURED MATCH SERVICE: Falling back to direct Yahoo scraper ===');
      const yahooResponse = await scrapeYahooSportsOdds();
      
      if (yahooResponse.matches && yahooResponse.matches.length > 0) {
        const featuredMatch = yahooResponse.matches[0];
        
        return {
          match: featuredMatch,
          isLive: yahooResponse.isLive,
          dataSource: 'yahoo',
          liveScore: {
            home: 59,
            away: 64,
            quarter: 'Q3',
            timeRemaining: '5:22'
          }
        };
      } else {
        throw new Error('No matches available from direct Yahoo scraper');
      }
    } catch (yahooError) {
      console.error('=== FEATURED MATCH SERVICE: Error with direct Yahoo scraper ===', yahooError);
      
      // Fallback to a hardcoded featured match
      return getFallbackFeaturedMatch();
    }
  }
};

/**
 * Provide a fallback featured match when fetch fails
 */
const getFallbackFeaturedMatch = (): FeaturedMatchResponse => {
  console.log('=== FEATURED MATCH SERVICE: Using fallback featured match ===');
  
  const now = new Date();
  const gameTime = new Date();
  gameTime.setHours(20, 30, 0); // 8:30 PM
  
  // Create a hardcoded match
  const fallbackMatch: Match = {
    id: `thunder_wolves_${Date.now()}`,
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: gameTime.toISOString(),
    home_team: {
      id: 'timberwolves',
      name: 'Minnesota Timberwolves'
    },
    away_team: {
      id: 'thunder',
      name: 'Oklahoma City Thunder'
    },
    bookmakers: [
      {
        key: 'mock_data',
        title: 'Mock Sportsbook',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Minnesota Timberwolves', price: 2.1 },
              { name: 'Oklahoma City Thunder', price: 1.8 }
            ]
          },
          {
            key: 'spreads',
            outcomes: [
              { name: 'Minnesota Timberwolves +2.5', price: 1.91 },
              { name: 'Oklahoma City Thunder -2.5', price: 1.91 }
            ]
          },
          {
            key: 'totals',
            outcomes: [
              { name: 'Over 221.5', price: 1.91 },
              { name: 'Under 221.5', price: 1.91 }
            ]
          }
        ]
      }
    ]
  };
  
  return {
    match: fallbackMatch,
    isLive: false,
    dataSource: 'mock',
    liveScore: {
      home: 59,
      away: 64,
      quarter: 'Q3',
      timeRemaining: '5:22'
    }
  };
}; 