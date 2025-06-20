// Test script for matches database functions
const { storeMatch, storeMatches, getMatchById, getUpcomingMatches } = require('./src/services/supabaseService');
const { MOCK_MATCHES } = require('./src/data/mockMatches');

// Test storing a single match
async function testStoreMatch() {
  console.log('Testing storeMatch function...');
  const testMatch = {
    id: 'test_match_' + Date.now(),
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    home_team: {
      id: 'test_home_team',
      name: 'Test Home Team',
      logo: 'https://example.com/home_logo.png'
    },
    away_team: {
      id: 'test_away_team',
      name: 'Test Away Team',
      logo: 'https://example.com/away_logo.png'
    },
    bookmakers: [
      {
        key: 'test_bookmaker',
        title: 'Test Bookmaker',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Test Home Team', price: 1.9 },
              { name: 'Test Away Team', price: 1.9 }
            ]
          }
        ]
      }
    ]
  };

  const success = await storeMatch(testMatch);
  console.log('Store match result:', success ? 'Success' : 'Failed');
  return testMatch.id;
}

// Test storing multiple matches
async function testStoreMatches() {
  console.log('Testing storeMatches function with mock data...');
  const count = await storeMatches(MOCK_MATCHES);
  console.log(`Stored ${count} of ${MOCK_MATCHES.length} mock matches`);
}

// Test retrieving a match by ID
async function testGetMatchById(id) {
  console.log(`Testing getMatchById function with ID: ${id}...`);
  const match = await getMatchById(id);
  console.log('Retrieved match:', match ? 'Success' : 'Failed');
  if (match) {
    console.log('Match details:', JSON.stringify(match, null, 2));
  }
}

// Test retrieving upcoming matches
async function testGetUpcomingMatches() {
  console.log('Testing getUpcomingMatches function...');
  const matches = await getUpcomingMatches(5);
  console.log(`Retrieved ${matches.length} upcoming matches`);
  if (matches.length > 0) {
    console.log('First match:', JSON.stringify(matches[0], null, 2));
  }
}

// Run all tests
async function runTests() {
  try {
    // Test storing a single match
    const matchId = await testStoreMatch();
    
    // Test retrieving the match we just stored
    await testGetMatchById(matchId);
    
    // Test storing multiple matches
    await testStoreMatches();
    
    // Test retrieving upcoming matches
    await testGetUpcomingMatches();
    
    console.log('All tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests(); 