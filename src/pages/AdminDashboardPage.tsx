import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createMatch, updateMatchScoresAdmin, deleteMatch } from '../services/adminService';
import { Match, Team } from '../types';
import { toast } from 'react-toastify';
import { getUpcomingMatches } from '../services/supabaseService';
import { useBetting } from '../context/BettingContext';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshMatches } = useBetting();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [isCustomMatch, setIsCustomMatch] = useState(false);
  
  // Form state for creating a new match
  const [newMatch, setNewMatch] = useState({
    sport_key: '',
    sport_name: '',
    league_name: '',
    sport_title: '',
    commence_time: '',
    home_team: {
      id: '',
      name: ''
    },
    away_team: {
      id: '',
      name: ''
    },
    homeOdds: 2.0,
    awayOdds: 2.0
  });

  // Custom match templates
  const matchTemplates = [
    { 
      name: "NBA Basketball", 
      sport_name: "basketball", 
      league_name: "nba", 
      sport_title: "NBA",
      sport_key: "basketball_nba"
    },
    { 
      name: "NFL Football", 
      sport_name: "football", 
      league_name: "nfl", 
      sport_title: "NFL",
      sport_key: "football_nfl"
    },
    { 
      name: "MLB Baseball", 
      sport_name: "baseball", 
      league_name: "mlb", 
      sport_title: "MLB",
      sport_key: "baseball_mlb"
    },
    { 
      name: "NHL Hockey", 
      sport_name: "hockey", 
      league_name: "nhl", 
      sport_title: "NHL",
      sport_key: "hockey_nhl"
    },
    { 
      name: "Custom Match", 
      sport_name: "", 
      league_name: "", 
      sport_title: "",
      sport_key: ""
    }
  ];
  
  // Load existing matches from database
  const loadExistingMatches = async () => {
    try {
      setLoadingMatches(true);
      const dbMatches = await getUpcomingMatches(20);
      
      if (dbMatches && dbMatches.length > 0) {
        // Sort by creation date (newest first)
        const sortedMatches = [...dbMatches].sort((a, b) => {
          return new Date(b.commence_time).getTime() - new Date(a.commence_time).getTime();
        });
        setMatches(sortedMatches);
      }
    } catch (error) {
      console.error('Error loading existing matches:', error);
      toast.error('Failed to load existing matches');
    } finally {
      setLoadingMatches(false);
    }
  };

  // Redirect non-admin users and load existing matches
  useEffect(() => {
    // Load existing matches
    loadExistingMatches();
  }, []);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
      if (parent === 'home_team') {
        setNewMatch(prev => ({
          ...prev,
          home_team: {
            ...prev.home_team,
            [child]: value
          }
        }));
      } else if (parent === 'away_team') {
        setNewMatch(prev => ({
          ...prev,
          away_team: {
            ...prev.away_team,
            [child]: value
          }
        }));
      }
    } else {
      setNewMatch(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle template selection
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTemplate = matchTemplates.find(template => template.name === e.target.value);
    
    if (selectedTemplate) {
      // Set custom match flag
      setIsCustomMatch(selectedTemplate.name === "Custom Match");
      
      // Update form with template values
      setNewMatch(prev => ({
        ...prev,
        sport_name: selectedTemplate.sport_name,
        league_name: selectedTemplate.league_name,
        sport_title: selectedTemplate.sport_title,
        sport_key: selectedTemplate.sport_key
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Generate team IDs if not provided
      if (!newMatch.home_team.id) {
        newMatch.home_team.id = newMatch.home_team.name.toLowerCase().replace(/\s+/g, '');
      }
      
      if (!newMatch.away_team.id) {
        newMatch.away_team.id = newMatch.away_team.name.toLowerCase().replace(/\s+/g, '');
      }
      
      // Create bookmakers array with odds
      const bookmakers = [{
        key: 'admin_created',
        title: 'Admin Created',
        markets: [{
          key: 'h2h',
          outcomes: [
            {
              name: newMatch.home_team.name,
              price: parseFloat(newMatch.homeOdds.toString())
            },
            {
              name: newMatch.away_team.name,
              price: parseFloat(newMatch.awayOdds.toString())
            }
          ]
        }]
      }];
      
      // Prepare match data
      const matchData: Omit<Match, 'id'> = {
        sport_key: newMatch.sport_key || `${newMatch.sport_name.toLowerCase()}_${newMatch.league_name.toLowerCase()}`,
        sport_name: newMatch.sport_name,
        league_name: newMatch.league_name,
        sport_title: newMatch.sport_title,
        commence_time: newMatch.commence_time,
        home_team: newMatch.home_team,
        away_team: newMatch.away_team,
        bookmakers
      };
      
      // Create the match
      const result = await createMatch(matchData);
      
      if (result) {
        toast.success('Match created successfully!');
        
        // Reset form
        setNewMatch({
          sport_key: '',
          sport_name: '',
          league_name: '',
          sport_title: '',
          commence_time: '',
          home_team: {
            id: '',
            name: ''
          },
          away_team: {
            id: '',
            name: ''
          },
          homeOdds: 2.0,
          awayOdds: 2.0
        });
        setIsCustomMatch(false);
        
        // Add to matches list
        setMatches(prev => [result, ...prev]);
        
        // Refresh matches in the BettingContext to make it visible in MatchesPage
        try {
          await refreshMatches();
          toast.info('Match added to the betting system');
        } catch (refreshError) {
          console.error('Error refreshing matches:', refreshError);
          // Don't show error to user since the match was created successfully
        }
      } else {
        toast.error('Failed to create match');
      }
    } catch (error) {
      console.error('Error creating match:', error);
      toast.error('Error creating match');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-mono text-console-white mb-4">ADMIN DASHBOARD</h1>
        <div className="bg-console-gray-terminal/30 border border-console-blue p-4 rounded-md shadow-terminal">
          <h2 className="text-xl font-mono text-console-white-bright mb-4">CREATE NEW MATCH</h2>
          
          {/* Match template selector */}
          <div className="mb-6">
            <label className="block text-console-white-dim text-sm font-mono mb-2">
              Select Match Template
            </label>
            <select 
              onChange={handleTemplateChange}
              className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono focus:border-console-blue-bright focus:outline-none"
            >
              <option value="">-- Select a template --</option>
              {matchTemplates.map((template, index) => (
                <option key={index} value={template.name}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sport Information */}
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  Sport Name
                  <input
                    type="text"
                    name="sport_name"
                    value={newMatch.sport_name}
                    onChange={handleInputChange}
                    placeholder="basketball"
                    required
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
              
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  League Name
                  <input
                    type="text"
                    name="league_name"
                    value={newMatch.league_name}
                    onChange={handleInputChange}
                    placeholder="nba"
                    required
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
              
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  Sport Title
                  <input
                    type="text"
                    name="sport_title"
                    value={newMatch.sport_title}
                    onChange={handleInputChange}
                    placeholder="NBA"
                    required
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
              
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  Match Date/Time
                  <input
                    type="datetime-local"
                    name="commence_time"
                    value={newMatch.commence_time}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
              
              {/* Home Team */}
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  {isCustomMatch ? "Competitor 1 Name" : "Home Team Name"}
                  <input
                    type="text"
                    name="home_team.name"
                    value={newMatch.home_team.name}
                    onChange={handleInputChange}
                    placeholder={isCustomMatch ? "Player/Team 1" : "Lakers"}
                    required
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
              
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  {isCustomMatch ? "Competitor 1 ID (optional)" : "Home Team ID (optional)"}
                  <input
                    type="text"
                    name="home_team.id"
                    value={newMatch.home_team.id}
                    onChange={handleInputChange}
                    placeholder="Auto-generated if empty"
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
              
              {/* Away Team */}
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  {isCustomMatch ? "Competitor 2 Name" : "Away Team Name"}
                  <input
                    type="text"
                    name="away_team.name"
                    value={newMatch.away_team.name}
                    onChange={handleInputChange}
                    placeholder={isCustomMatch ? "Player/Team 2" : "Celtics"}
                    required
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
              
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  {isCustomMatch ? "Competitor 2 ID (optional)" : "Away Team ID (optional)"}
                  <input
                    type="text"
                    name="away_team.id"
                    value={newMatch.away_team.id}
                    onChange={handleInputChange}
                    placeholder="Auto-generated if empty"
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
              
              {/* Odds */}
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  {isCustomMatch ? "Competitor 1 Odds" : "Home Team Odds"}
                  <input
                    type="number"
                    name="homeOdds"
                    value={newMatch.homeOdds}
                    onChange={handleInputChange}
                    step="0.01"
                    min="1.01"
                    required
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
              
              <div className="space-y-2">
                <label className="block text-console-white-dim text-sm font-mono">
                  {isCustomMatch ? "Competitor 2 Odds" : "Away Team Odds"}
                  <input
                    type="number"
                    name="awayOdds"
                    value={newMatch.awayOdds}
                    onChange={handleInputChange}
                    step="0.01"
                    min="1.01"
                    required
                    className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                  />
                </label>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-console-blue hover:bg-console-blue-bright text-console-white font-mono py-2 px-4 rounded-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'CREATING...' : 'CREATE MATCH'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Recently created matches section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-mono text-console-white">EXISTING MATCHES</h2>
          <button 
            onClick={loadExistingMatches}
            className="bg-console-blue hover:bg-console-blue-bright text-console-white font-mono py-1 px-3 rounded-sm transition-colors text-sm"
          >
            REFRESH
          </button>
        </div>
        
        {loadingMatches ? (
          <div className="bg-console-gray-terminal/30 border border-console-blue p-6 rounded-md shadow-terminal flex justify-center items-center">
            <div className="animate-pulse text-console-blue-bright font-mono">LOADING MATCHES...</div>
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map(match => (
              <div key={match.id} className="bg-console-gray-terminal/30 border border-console-blue p-4 rounded-md shadow-terminal">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-console-white-bright font-mono">{match.home_team.name} vs {match.away_team.name}</h3>
                    <p className="text-console-white-dim text-sm mb-1">
                      {new Date(match.commence_time).toLocaleString()} | {match.sport_title}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-console-blue-bright">
                        {(match.sport_name || 'sport').toUpperCase()}
                      </span>
                      <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-console-blue-bright">
                        {(match.league_name || 'league').toUpperCase()}
                      </span>
                      {match.bookmakers && match.bookmakers.length > 0 && (
                        <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-green-400">
                          ODDS AVAILABLE
                        </span>
                      )}
                      {match.completed && (
                        <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-yellow-400">
                          COMPLETED
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this match?')) {
                          deleteMatch(match.id).then(async success => {
                            if (success) {
                              setMatches(prev => prev.filter(m => m.id !== match.id));
                              toast.success('Match deleted');
                              
                              // Refresh matches in the BettingContext
                              try {
                                await refreshMatches();
                              } catch (refreshError) {
                                console.error('Error refreshing matches after deletion:', refreshError);
                              }
                            } else {
                              toast.error('Failed to delete match');
                            }
                          });
                        }
                      }}
                      className="bg-red-700 hover:bg-red-600 text-white font-mono py-1 px-2 rounded-sm text-sm"
                    >
                      DELETE
                    </button>
                    {!match.completed && (
                      <button
                        onClick={() => {
                          const homeScore = prompt('Enter home team score:', '0');
                          const awayScore = prompt('Enter away team score:', '0');
                          if (homeScore !== null && awayScore !== null) {
                            updateMatchScoresAdmin(
                              match.id, 
                              parseInt(homeScore) || 0, 
                              parseInt(awayScore) || 0, 
                              true
                            ).then(async success => {
                              if (success) {
                                toast.success('Match scores updated');
                                await loadExistingMatches();
                                await refreshMatches();
                              } else {
                                toast.error('Failed to update match scores');
                              }
                            });
                          }
                        }}
                        className="bg-yellow-600 hover:bg-yellow-500 text-black font-mono py-1 px-2 rounded-sm text-sm"
                      >
                        SET SCORES
                      </button>
                    )}
                  </div>
                </div>
                {match.scores && (
                  <div className="mt-2 bg-console-black/30 p-2 inline-block">
                    <span className="text-console-white-bright font-mono">
                      SCORE: {match.home_team.name} {match.scores.home} - {match.scores.away} {match.away_team.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-console-gray-terminal/30 border border-console-blue p-4 rounded-md shadow-terminal text-console-white-dim">
            No matches found. Create a match above to see it here.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage; 