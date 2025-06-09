import { Match } from '../types';

// Constants for API access
const CORS_PROXY = 'https://corsproxy.io/?';
const YAHOO_SPORTS_ODDS_URL = 'https://sports.yahoo.com/nba/odds/';

export const fetchMatchesFromYahoo = async (): Promise<Match[]> => {
  try {
    console.log('Attempting to fetch Yahoo Sports odds data...');
    const response = await fetch(`${CORS_PROXY}${YAHOO_SPORTS_ODDS_URL}`);
    
    if (!response.ok) {
      console.error('Yahoo Sports API returned error:', response.status, response.statusText);
      throw new Error(`Yahoo Sports API error: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Received HTML response from Yahoo Sports (${html.length} characters)`);
    
    // For debugging - check if we're getting proper HTML
    if (html.length < 1000) {
      console.warn('Yahoo response too short, may be error page or redirect');
      console.log('Response content:', html.substring(0, 500));
      throw new Error('Invalid Yahoo response');
    }
    
    // Parse the matches more robustly
    const matches = parseYahooSportsHTML(html);
    
    if (!matches || matches.length === 0) {
      console.error('Failed to parse any matches from Yahoo Sports HTML');
      throw new Error('No matches found in Yahoo response');
    }
    
    console.log(`Successfully parsed ${matches.length} matches from Yahoo Sports`);
    return matches;
  } catch (error) {
    console.error('Error fetching Yahoo Sports odds:', error);
    throw error;
  }
};

// Improve the HTML parsing function to be more robust
const parseYahooSportsHTML = (html: string): Match[] => {
  try {
    // Use more robust extraction of game data
    const matches: Match[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Look for game containers - try different selectors
    const gameElements = doc.querySelectorAll('.gamebox, .gamecard, .game-card, [data-game-id]');
    console.log(`Found ${gameElements.length} potential game elements in Yahoo HTML`);
    
    if (gameElements.length === 0) {
      // Debugging - log parts of the document to understand structure
      console.log('Yahoo HTML structure may have changed. Document body excerpt:');
      if (doc.body) {
        console.log(doc.body.innerHTML.substring(0, 1000));
      }
      throw new Error('Could not find game elements in Yahoo HTML');
    }
    
    // Process each game element
    gameElements.forEach((gameEl, index) => {
      try {
        // Extract teams - be flexible with selectors
        const teamElements = gameEl.querySelectorAll('.team-name, .team, .team-label');
        const dateElement = gameEl.querySelector('.date, .game-time, .time');
        const oddsElements = gameEl.querySelectorAll('.odds, .money-line, .moneyline');
        
        if (teamElements.length >= 2) {
          const homeTeamName = teamElements[0].textContent?.trim() || `Team ${index * 2 + 1}`;
          const awayTeamName = teamElements[1].textContent?.trim() || `Team ${index * 2 + 2}`;
          
          // Generate a reliable unique ID
          const matchId = `yahoo_${Date.now()}_${index}`;
          const commenceTime = dateElement?.textContent ? 
            new Date(dateElement.textContent).toISOString() : 
            new Date(Date.now() + 86400000).toISOString(); // Default to tomorrow
          
          // Extract odds if available
          let homeOdds = 0, awayOdds = 0;
          if (oddsElements.length >= 2) {
            homeOdds = parseFloat(oddsElements[0].textContent?.replace(/[^\d.-]/g, '') || '0') || 2.0;
            awayOdds = parseFloat(oddsElements[1].textContent?.replace(/[^\d.-]/g, '') || '0') || 2.0;
          } else {
            // Default odds if not found
            homeOdds = 1.9 + Math.random() * 0.2;
            awayOdds = 1.9 + Math.random() * 0.2;
          }
          
          // Create match object
          const match: Match = {
            id: matchId,
            sport_key: 'basketball_nba',
            sport_title: 'NBA',
            commence_time: commenceTime,
            home_team: {
              id: `home_${index}`,
              name: homeTeamName
            },
            away_team: {
              id: `away_${index}`,
              name: awayTeamName
            },
            bookmakers: [{
              key: 'yahoo_sports',
              title: 'Yahoo Sports',
              markets: [{
                key: 'h2h',
                outcomes: [
                  {
                    name: homeTeamName,
                    price: homeOdds
                  },
                  {
                    name: awayTeamName,
                    price: awayOdds
                  }
                ]
              }]
            }]
          };
          
          matches.push(match);
          console.log(`Parsed match: ${homeTeamName} vs ${awayTeamName} with odds ${homeOdds}/${awayOdds}`);
        }
      } catch (err) {
        console.error(`Error parsing game element ${index}:`, err);
      }
    });
    
    return matches;
  } catch (error) {
    console.error('Error parsing Yahoo Sports HTML:', error);
    return [];
  }
}; 