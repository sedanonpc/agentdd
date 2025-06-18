import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Terminal, Cpu, Code, MessageSquare } from 'lucide-react';
import { Conference, Division, StandingsTeam, Match } from '../types';
import { fetchNBAStandings } from '../services/standingsService';
import { fetchFeaturedMatch } from '../services/featuredMatchService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DareDevilChatModal from '../components/chat/DareDevilChatModal';

const HomePage: React.FC = () => {
  const [activeConference, setActiveConference] = useState<'Eastern' | 'Western'>('Eastern');
  const [standings, setStandings] = useState<{ eastern: Conference, western: Conference } | null>(null);
  const [loadingStandings, setLoadingStandings] = useState<boolean>(true);
  const [isLiveData, setIsLiveData] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('mock');
  const [isDareDevilModalOpen, setIsDareDevilModalOpen] = useState<boolean>(false);
  
  // Featured match state
  const [featuredMatch, setFeaturedMatch] = useState<Match | null>(null);
  const [loadingFeaturedMatch, setLoadingFeaturedMatch] = useState<boolean>(true);
  const [matchIsLive, setMatchIsLive] = useState<boolean>(false);
  const [matchDataSource, setMatchDataSource] = useState<string>('mock');
  const [liveScore, setLiveScore] = useState<{
    home: number;
    away: number;
    quarter: string;
    timeRemaining: string;
  } | null>(null);

  useEffect(() => {
    // Fetch standings data when component mounts
    const loadStandings = async () => {
      try {
        setLoadingStandings(true);
        const response = await fetchNBAStandings();
        setStandings({
          eastern: response.eastern,
          western: response.western
        });
        setIsLiveData(response.isLive);
        setDataSource(response.dataSource);
        console.log('=== HOME PAGE: Loaded standings data ===', response.dataSource);
      } catch (error) {
        console.error('Error loading standings:', error);
      } finally {
        setLoadingStandings(false);
      }
    };
    
    // Fetch featured match data
    const loadFeaturedMatch = async () => {
      try {
        setLoadingFeaturedMatch(true);
        const response = await fetchFeaturedMatch();
        setFeaturedMatch(response.match);
        setMatchIsLive(response.isLive);
        setMatchDataSource(response.dataSource);
        setLiveScore(response.liveScore || null);
        console.log('=== HOME PAGE: Loaded featured match ===', response.dataSource);
      } catch (error) {
        console.error('Error loading featured match:', error);
      } finally {
        setLoadingFeaturedMatch(false);
      }
    };

    loadStandings();
    loadFeaturedMatch();
  }, []);

  const getTerminalTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getSessionID = () => {
    // Generate a random session ID that remains consistent during the session
    if (!window.sessionStorage.getItem('session_id')) {
      const sessionId = Math.floor(Math.random() * 900000) + 100000;
      window.sessionStorage.setItem('session_id', sessionId.toString());
    }
    return window.sessionStorage.getItem('session_id');
  };
  
  // Format date for game time
  const formatGameTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Format win percentage to display as .XXX
  const formatPct = (pct: number): string => {
    return pct.toFixed(3).slice(1); // Remove the leading 0
  };
  
  // Get team record string (e.g. "49-33")
  const getTeamRecord = (teamName: string) => {
    if (!standings) return '';
    
    // Search through both conferences for the team
    for (const conference of [standings.eastern, standings.western]) {
      for (const division of conference.divisions) {
        for (const team of division.teams) {
          if (team.name.toLowerCase().includes(teamName.toLowerCase()) || 
              teamName.toLowerCase().includes(team.name.toLowerCase())) {
            return `${team.wins}-${team.losses}`;
          }
        }
      }
    }
    
    return '';
  };

  // Function to render team row with clinched indicators
  const renderTeamRow = (team: StandingsTeam) => {
    return (
      <tr key={team.name} className="border-b border-console-blue/20 hover:bg-console-blue/5">
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-left">
          <div className="flex items-center">
            <span>{team.name}</span>
            {team.clinched === 'playoff' && <span className="ml-1 text-xs text-console-blue-bright">x</span>}
            {team.clinched === 'division' && <span className="ml-1 text-xs text-yellow-300">y</span>}
            {team.clinched === 'homeCourt' && <span className="ml-1 text-xs text-green-400">z</span>}
          </div>
        </td>
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-center text-console-white">{team.wins}</td>
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-center text-console-white-dim">{team.losses}</td>
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-center">{formatPct(team.winPercentage)}</td>
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-center">{team.last10}</td>
        <td className={`px-2 sm:px-3 py-1 sm:py-2 text-center ${team.streak.startsWith('W') ? 'text-green-400' : 'text-red-400'}`}>{team.streak}</td>
      </tr>
    );
  };

  // Function to render a division
  const renderDivision = (division: Division) => {
    return (
      <React.Fragment key={division.name}>
        <tr className="bg-console-blue/10 border-b border-t border-console-blue/30">
          <td colSpan={6} className="px-2 sm:px-3 py-1 text-console-blue-bright font-bold">{division.name.toUpperCase()}</td>
        </tr>
        {division.teams.map(team => renderTeamRow(team))}
      </React.Fragment>
    );
  };
  
  // Extract spread for a team from bookmakers
  const getSpread = (teamName: string) => {
    if (!featuredMatch || !featuredMatch.bookmakers || featuredMatch.bookmakers.length === 0) {
      return '+2.5'; // Default fallback
    }
    
    // Try to find the spread market
    const bookmaker = featuredMatch.bookmakers[0];
    const spreadMarket = bookmaker.markets.find(m => m.key === 'spreads');
    
    if (!spreadMarket) return '';
    
    // Find the outcome for this team
    const outcome = spreadMarket.outcomes.find(o => o.name.includes(teamName));
    if (!outcome) return '';
    
    // Extract just the spread value (e.g. "+2.5" from "Team Name +2.5")
    const spreadRegex = /([+-]\d+\.?\d*)/;
    const match = outcome.name.match(spreadRegex);
    
    return match ? match[0] : '';
  };
  
  // Extract the total points (over/under) from bookmakers
  const getTotalPoints = () => {
    if (!featuredMatch || !featuredMatch.bookmakers || featuredMatch.bookmakers.length === 0) {
      return '221.5'; // Default fallback
    }
    
    // Try to find the totals market
    const bookmaker = featuredMatch.bookmakers[0];
    const totalsMarket = bookmaker.markets.find(m => m.key === 'totals');
    
    if (!totalsMarket || totalsMarket.outcomes.length === 0) return '221.5';
    
    // Get the first outcome (usually "Over X")
    const outcome = totalsMarket.outcomes[0];
    
    // Extract just the total value (e.g. "221.5" from "Over 221.5")
    const totalRegex = /(\d+\.?\d*)/;
    const match = outcome.name.match(totalRegex);
    
    return match ? match[0] : '221.5';
  };

  return (
    <div className="space-y-6">
      {/* Original Image Banner Section - Optimized for transparency */}
      <section className="w-full bg-transparent overflow-hidden">
        {/* Full-width image container with transparent background */}
        <div className="relative w-full flex justify-center">
          <img 
            src="https://i.ibb.co/JRf70N7Z/daredevil-png.png" 
            alt="NBA Betting Agent" 
            className="w-full max-w-5xl h-auto object-contain relative z-0"
          />
        </div>
      </section>
      
      {/* Daredevil Banner - Optimized for transparency */}
      <section className="w-full bg-transparent overflow-hidden">
        {/* Full-width image container with transparent background */}
        <div className="relative w-full flex justify-center">
          <img 
            src="https://i.ibb.co/rGh18fww/nba-banner-v3.png"
            alt="Agent Daredevil - Wanna Bet?" 
            className="w-full max-w-5xl h-auto object-contain relative z-0"
          />
        </div>
      </section>
      
      {/* Game Banner Section - Updated with dynamic data */}
      <div className="w-full bg-console-black/60 backdrop-blur-xs border-1 border-console-blue shadow-terminal">
        <div className="bg-console-blue/90 p-1 text-black flex items-center justify-between flex-wrap gap-1">
          <div className="text-xs text-console-white font-mono tracking-wide">[ FEATURED_MATCH ]</div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <div className="text-xs text-console-white font-mono tracking-wide">
              {matchDataSource === 'yahoo' && matchIsLive && (
                <span className="px-1 py-0.5 bg-blue-600 text-white text-[10px] font-mono rounded mr-1">YAHOO DATA</span>
              )}
              {!matchIsLive && (
                <span className="px-1 py-0.5 bg-yellow-600 text-black text-[10px] font-mono rounded mr-1">MOCK DATA</span>
              )}
              [ {featuredMatch?.sport_title || 'NBA'} ]
            </div>
            <div className="text-xs text-console-white font-mono tracking-wide opacity-80">SYS_TIME: {getTerminalTime()}</div>
          </div>
        </div>
        
        {loadingFeaturedMatch ? (
          <div className="flex justify-center items-center h-24">
            <LoadingSpinner size={5} color="text-console-blue-bright" />
          </div>
        ) : featuredMatch ? (
          <div className="relative w-full overflow-hidden">
            {/* Teams logo display - more compact */}
            <div className="flex justify-center items-center py-2 bg-gradient-to-r from-console-blue/20 to-console-black/20">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm py-2 px-6 border-1 border-console-blue/50 rounded-sm">
                <div className="text-xl font-bold text-console-blue-bright">{featuredMatch.home_team.name.substring(0, 3).toUpperCase()}</div>
                <span className="text-lg text-console-white-dim">VS</span>
                <div className="text-xl font-bold text-console-blue-bright">{featuredMatch.away_team.name.substring(0, 3).toUpperCase()}</div>
              </div>
            </div>
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-console-blue/40 to-console-black/40 z-10"></div>
            
            {/* Game info overlay - more compact */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-console-black/90 to-transparent p-2 sm:p-3 z-20">
              <div className="flex flex-row justify-between items-center gap-2 max-w-4xl mx-auto">
                <div className="font-mono text-console-white">
                  <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                    <span className="text-xs text-console-blue-bright">PLAYOFF SERIES</span>
                    <span className="bg-yellow-500/80 text-black text-[10px] px-1 py-0.5">FEATURED GAME</span>
                  </div>
                  <div className="text-sm sm:text-base mb-1">
                    {featuredMatch.home_team.name} vs {featuredMatch.away_team.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-console-white-dim flex-wrap">
                    <span>Game 1</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Series tied 0-0</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                    <div className="bg-console-black/50 px-1 py-0.5 border-1 border-console-blue">
                      <span className="text-console-white-dim text-[10px]">{featuredMatch.home_team.name.substring(0, 3).toUpperCase()}</span>
                      <span className="text-console-white ml-1 text-xs">{getSpread(featuredMatch.home_team.name)}</span>
                    </div>
                    <div className="bg-console-black/50 px-1 py-0.5 border-1 border-console-blue">
                      <span className="text-console-white-dim text-[10px]">{featuredMatch.away_team.name.substring(0, 3).toUpperCase()}</span>
                      <span className="text-console-white ml-1 text-xs">{getSpread(featuredMatch.away_team.name)}</span>
                    </div>
                    <div className="bg-console-black/50 px-1 py-0.5 border-1 border-console-blue">
                      <span className="text-console-white-dim text-[10px]">O/U</span>
                      <span className="text-console-white ml-1 text-xs">{getTotalPoints()}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-2 text-console-white font-mono">
                  <div className="text-[10px] text-console-white-dim mb-0.5">TIPOFF</div>
                  <div className="text-base text-yellow-300">{formatGameTime(featuredMatch.commence_time)}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-console-white-dim font-mono">
            No featured match available
          </div>
        )}
        
        {/* Bottom bar with quick stats - more compact */}
        <div className="bg-console-black/80 backdrop-blur-xs p-2 border-t border-console-blue/50">
          <div className="flex flex-row justify-between items-center gap-2 font-mono text-xs text-console-white-dim max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              {featuredMatch && (
                <>
                  <span className="text-console-blue-bright">
                    {featuredMatch.home_team.name.substring(0, 3).toUpperCase()} {getTeamRecord(featuredMatch.home_team.name)}
                  </span>
                  <span>|</span>
                  <span className="text-console-blue-bright">
                    {featuredMatch.away_team.name.substring(0, 3).toUpperCase()} {getTeamRecord(featuredMatch.away_team.name)}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span className="px-1 py-0.5 bg-red-900/30 text-red-400 text-[10px]">LIVE</span>
              <Link 
                to="/matches" 
                className="bg-red-600/90 text-white px-2 py-0.5 text-[10px] font-mono hover:bg-red-500 transition-colors flex items-center gap-1"
              >
                <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                <span>WATCH LIVE</span>
              </Link>
              <Link 
                to="/matches"
                className="bg-yellow-500/90 text-black px-2 py-0.5 text-[10px] font-mono hover:bg-yellow-400 transition-colors"
              >
                BET NOW
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* DareDevil Chat Button */}
      <div className="flex justify-center my-4">
        <button
          onClick={() => setIsDareDevilModalOpen(true)}
          className="bg-red-600/90 text-white px-4 py-2 font-mono text-sm hover:bg-red-500 transition-colors flex items-center gap-2 border-1 border-red-800 shadow-glow-red"
        >
          <MessageSquare className="h-5 w-5" />
          <span>CHAT WITH AGENT DAREDEVIL</span>
        </button>
      </div>

      {/* DareDevil Chat Modal */}
      <DareDevilChatModal 
        isOpen={isDareDevilModalOpen} 
        onClose={() => setIsDareDevilModalOpen(false)} 
      />
      
      {/* Features Section */}
      <section className="py-4 sm:py-6 max-w-6xl mx-auto px-2 sm:px-0">
        <div className="bg-console-gray-terminal/30 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-3 sm:p-4 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-display uppercase text-console-white tracking-wider text-center">SYSTEM_FEATURES</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-console-gray-terminal/50 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-3 sm:p-4 flex flex-col items-center text-center transition-all duration-300 hover:bg-console-blue/10">
            <div className="bg-console-blue/10 backdrop-blur-xs border-1 border-console-blue p-2 rounded-full mb-2 sm:mb-3">
              <Code className="h-4 w-4 sm:h-5 sm:w-5 text-console-blue-bright" />
            </div>
            <h3 className="text-base sm:text-lg font-display uppercase text-console-white mb-1">P2P_BETTING</h3>
            <p className="text-console-white-muted font-mono text-xs">
              CREATE SECURE BETS ON NBA GAMES AND MATCH WITH USERS ON THE OPPOSITE SIDE.
            </p>
          </div>
          
          <div className="bg-console-gray-terminal/50 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-3 sm:p-4 flex flex-col items-center text-center transition-all duration-300 hover:bg-console-blue/10">
            <div className="bg-console-blue/10 backdrop-blur-xs border-1 border-console-blue p-2 rounded-full mb-2 sm:mb-3">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-console-blue-bright" />
            </div>
            <h3 className="text-base sm:text-lg font-display uppercase text-console-white mb-1">SECURE_ESCROW</h3>
            <p className="text-console-white-muted font-mono text-xs">
              FUNDS HELD IN SMART CONTRACT ESCROW UNTIL GAME COMPLETION FOR SECURE PAYOUTS.
            </p>
          </div>
          
          <div className="bg-console-gray-terminal/50 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-3 sm:p-4 flex flex-col items-center text-center transition-all duration-300 hover:bg-console-blue/10">
            <div className="bg-console-blue/10 backdrop-blur-xs border-1 border-console-blue p-2 rounded-full mb-2 sm:mb-3">
              <Cpu className="h-4 w-4 sm:h-5 sm:w-5 text-console-blue-bright" />
            </div>
            <h3 className="text-base sm:text-lg font-display uppercase text-console-white mb-1">AI_ANALYTICS</h3>
            <p className="text-console-white-muted font-mono text-xs">
              ADVANCED ALGORITHMS PROVIDE REAL-TIME INSIGHTS ON GAMES AND BETTING PATTERNS.
            </p>
          </div>
        </div>
      </section>

      {/* League Stats Section - Updated with dynamic data */}
      <section className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 sm:p-6 max-w-6xl mx-auto px-2 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 pb-2 border-b border-console-blue/50 gap-2">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase text-console-white tracking-wider">LEAGUE_STATS</h2>
          <div className="text-xs text-console-white-dim font-mono bg-console-blue/20 px-3 py-1 flex items-center gap-2">
            <span>2024/2025 SEASON</span>
            {dataSource === 'yahoo' && isLiveData && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-mono rounded">YAHOO DATA</span>
            )}
            {!isLiveData && (
              <span className="px-2 py-0.5 bg-yellow-600 text-black text-[10px] font-mono rounded">MOCK DATA</span>
            )}
          </div>
        </div>
        
        {/* Conference Tabs */}
        <div className="flex mb-4 border-b border-console-blue/30">
          <button 
            className={`px-3 sm:px-4 py-1 sm:py-2 font-mono text-sm ${
              activeConference === 'Eastern' 
                ? 'text-console-white bg-console-blue/90 border-t border-l border-r border-console-blue' 
                : 'text-console-white-dim hover:text-console-white transition-colors'
            }`}
            onClick={() => setActiveConference('Eastern')}
          >
            EASTERN
          </button>
          <button 
            className={`px-3 sm:px-4 py-1 sm:py-2 font-mono text-sm ${
              activeConference === 'Western' 
                ? 'text-console-white bg-console-blue/90 border-t border-l border-r border-console-blue' 
                : 'text-console-white-dim hover:text-console-white transition-colors'
            }`}
            onClick={() => setActiveConference('Western')}
          >
            WESTERN
          </button>
        </div>
        
        {/* Standings Table */}
        <div className="overflow-x-auto custom-scrollbar">
          {loadingStandings ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size={6} color="text-console-blue-bright" />
            </div>
          ) : standings ? (
            <table className="w-full text-xs sm:text-sm font-mono">
              <thead className="bg-console-black/70 text-console-white-dim">
                <tr>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">TEAM</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">W</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">L</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">PCT</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">LAST 10</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">STREAK</th>
                </tr>
              </thead>
              <tbody>
                {/* Render divisions for the active conference */}
                {activeConference === 'Eastern' 
                  ? standings.eastern.divisions.map(division => renderDivision(division))
                  : standings.western.divisions.map(division => renderDivision(division))
                }
              </tbody>
            </table>
          ) : (
            <div className="text-center py-6 text-console-white-dim font-mono">
              Failed to load standings data. Please try again later.
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 sm:mt-6 pt-2 border-t border-console-blue/50 gap-3">
          <div className="text-xs text-console-white-dim flex flex-col gap-1">
            <div>
              <span className="text-console-blue-bright">*</span> Stats provided by Yahoo Sports
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-green-400"></span> Win</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-red-400"></span> Loss</span>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-1">
              <span className="flex items-center gap-1"><span className="text-console-blue-bright text-xs">x</span> Clinched Playoff</span>
              <span className="flex items-center gap-1"><span className="text-yellow-300 text-xs">y</span> Clinched Division</span>
              <span className="flex items-center gap-1"><span className="text-green-400 text-xs">z</span> Clinched Home Court</span>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <Link
              to="/matches"
              className="bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-3 sm:px-4 py-1 sm:py-2 shadow-button hover:shadow-glow transition-all duration-300 text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <span>VIEW MATCHES</span>
            </Link>
            <Link
              to="/matches"
              className="bg-black/50 backdrop-blur-xs border-1 border-yellow-400 text-yellow-300 font-mono uppercase tracking-wider px-3 sm:px-4 py-1 sm:py-2 hover:shadow-yellow transition-all text-xs sm:text-sm flex items-center justify-center gap-2 shadow-yellow-glow animate-pulse-subtle"
            >
              <span>PLACE BETS</span>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Session ID indicator at bottom */}
      <div className="fixed bottom-16 sm:bottom-20 left-2 sm:left-4 bg-console-black/60 backdrop-blur-xs border-1 border-console-blue px-1 sm:px-2 py-0.5 text-console-white-dim font-mono text-[10px] sm:text-xs z-[40]">
        SESSION: {getSessionID()}
      </div>
    </div>
  );
};

export default HomePage;