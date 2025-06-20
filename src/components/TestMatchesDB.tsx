import { useState, useEffect } from 'react';
import { storeMatch, storeMatches, getMatchById, getUpcomingMatches } from '../services/supabaseService';
import { MOCK_MATCHES } from '../data/mockMatches';
import { Match } from '../types';

const TestMatchesDB = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testMatch, setTestMatch] = useState<Match | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Test 1: Store a single match
      addResult('Test 1: Storing a single match...');
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
      addResult(`Store match result: ${success ? 'Success' : 'Failed'}`);
      
      // Test 2: Retrieve the match we just stored
      addResult(`Test 2: Retrieving match with ID: ${testMatch.id}...`);
      const retrievedMatch = await getMatchById(testMatch.id);
      addResult(`Retrieved match: ${retrievedMatch ? 'Success' : 'Failed'}`);
      if (retrievedMatch) {
        setTestMatch(retrievedMatch);
        addResult(`Match details: ${JSON.stringify(retrievedMatch, null, 2)}`);
      }
      
      // Test 3: Store multiple matches
      addResult('Test 3: Storing multiple matches from mock data...');
      const count = await storeMatches(MOCK_MATCHES);
      addResult(`Stored ${count} of ${MOCK_MATCHES.length} mock matches`);
      
      // Test 4: Retrieve upcoming matches
      addResult('Test 4: Retrieving upcoming matches...');
      const matches = await getUpcomingMatches(5);
      addResult(`Retrieved ${matches.length} upcoming matches`);
      setUpcomingMatches(matches);
      if (matches.length > 0) {
        addResult(`First match: ${JSON.stringify(matches[0], null, 2)}`);
      }
      
      addResult('All tests completed!');
    } catch (error) {
      addResult(`Error running tests: ${error}`);
      console.error('Error running tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal">
      <h2 className="text-xl font-display text-console-white mb-4">Test Matches Database</h2>
      
      <button 
        onClick={runTests}
        disabled={isLoading}
        className="bg-console-blue hover:bg-console-blue-bright text-console-white font-mono py-2 px-4 border-1 border-console-blue-bright hover:border-console-white transition-colors mb-4"
      >
        {isLoading ? 'Running Tests...' : 'Run Tests'}
      </button>
      
      <div className="mt-4">
        <h3 className="text-lg font-display text-console-white mb-2">Test Results:</h3>
        <div className="bg-console-black/50 backdrop-blur-xs p-4 font-mono text-sm text-console-white-muted overflow-auto max-h-80">
          {testResults.length === 0 ? (
            <p>No tests run yet.</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-1">
                <span className="text-console-blue-bright">{`[${index + 1}] `}</span>
                <span>{result}</span>
              </div>
            ))
          )}
        </div>
      </div>
      
      {testMatch && (
        <div className="mt-4">
          <h3 className="text-lg font-display text-console-white mb-2">Test Match:</h3>
          <div className="bg-console-black/50 backdrop-blur-xs p-4 font-mono text-sm text-console-white-muted overflow-auto max-h-60">
            <pre>{JSON.stringify(testMatch, null, 2)}</pre>
          </div>
        </div>
      )}
      
      {upcomingMatches.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-display text-console-white mb-2">Upcoming Matches ({upcomingMatches.length}):</h3>
          <div className="bg-console-black/50 backdrop-blur-xs p-4 font-mono text-sm text-console-white-muted overflow-auto max-h-60">
            <pre>{JSON.stringify(upcomingMatches[0], null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestMatchesDB; 