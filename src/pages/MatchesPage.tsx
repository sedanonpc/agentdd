import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Search, Wifi, WifiOff, ExternalLink, Terminal, MessageSquare, Zap, Database } from 'lucide-react';
import { useMatches } from '../context/MatchesContext';
import { Match } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { decimalToAmerican, formatDecimalOdds } from '../utils/oddsUtils';
import MatchChatRoom from '../components/match/MatchChatRoom';
import MatchBettingForm from '../components/match/MatchBettingForm';
import Modal from '../components/common/Modal';
import { SandboxMatchCard } from '../components/match/SandboxMatchCard';

const YAHOO_SPORTS_ODDS_URL = 'https://sports.yahoo.com/nba/odds/';

const MatchesPage: React.FC = () => {
  // Use the new MatchesContext instead of BettingContext for match data
  const { matches, loading: loadingMatches, error: matchesError, dataSource, isLiveData, refreshMatches: refreshMatchesData } = useMatches();
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for the selected match for chat
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  // State for the selected match for betting
  const [selectedMatchForBetting, setSelectedMatchForBetting] = useState<Match | null>(null);
  // State for showing betting modal
  const [showBettingModal, setShowBettingModal] = useState<boolean>(false);

  // Use the filtered matches even if they're empty
  const filteredMatches = matches ? matches.filter(match => 
    match.home_team.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    match.away_team.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];
  
  const formatDate = (dateString: string) => {
    try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    } catch (e) {
      console.error('Invalid date:', dateString);
      return 'Invalid date';
    }
  };
  
  const formatTime = (dateString: string) => {
    try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    } catch (e) {
      console.error('Invalid time:', dateString);
      return 'Invalid time';
    }
  };
  
  const handleRefresh = () => {
    // Use the MatchesContext refresh function
    refreshMatchesData();
  };

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
  
  // Handle selecting a match for chat
  const handleSelectMatchForChat = (match: Match) => {
    setSelectedMatch(match);
    // Close betting form if open
    setSelectedMatchForBetting(null);
  };
  
  // Handle selecting a match for betting
  const handleSelectMatchForBetting = (match: Match) => {
    setSelectedMatchForBetting(match);
    setShowBettingModal(true);
    // Close chat if open
    setSelectedMatch(null);
  };
  
  // Close the chat room
  const handleCloseChat = () => {
    setSelectedMatch(null);
  };
  
  // Close the betting form
  const handleCloseBetting = () => {
    setShowBettingModal(false);
    // After animation completes, clear the selected match
    setTimeout(() => {
      setSelectedMatchForBetting(null);
    }, 300);
  };
  
  // Determine if we should show the loading screen
  const shouldShowLoading = loadingMatches;
  
  // First, find the LiveDataIndicator component and enhance it to be more prominent for both states
  // Find the component that renders the data source indicator
  const LiveDataIndicator = () => {
    // Determine styling based on data source
    let iconColor = 'text-orange-400';
    let label = 'MOCK';
    let icon = <WifiOff className="w-3 h-3" />;
    let tooltip = 'Using mock data - no live connection';

    if (dataSource === 'database') {
      iconColor = 'text-green-400';
      label = 'DB DATA';
      icon = <Database className="w-3 h-3" />;
      tooltip = 'Using persisted data from database';
    } else if (dataSource === 'api') {
      iconColor = 'text-blue-400';
      label = 'API DATA';
      icon = <Wifi className="w-3 h-3" />;
      tooltip = 'Connected to The Odds API - live data';
    }

    return (
      <div className={`flex items-center gap-1 ${iconColor} cursor-help`} title={tooltip}>
        {icon}
        <span className="text-xs font-mono tracking-wide">{label}</span>
      </div>
    );
  };
  
  // Add a function to get a badge for the data source
  const getDataSourceBadge = () => {
    if (dataSource === 'database') {
      return (
        <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-mono ml-2">
          DB
        </span>
      );
    } else if (dataSource === 'api') {
      return (
        <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-mono ml-2">
          API
        </span>
      );
    } else if (dataSource === 'mock') {
      return (
        <span className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-mono ml-2">
          MOCK
        </span>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6">
      {/* Header with title and banner */}
      <div className="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
        <div className="bg-console-blue/90 p-2 text-black flex items-center justify-between">
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ SPORTS_TERMINAL ]</div>
          <div className="flex items-center gap-4">
            <LiveDataIndicator />
            <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ SESSION: {getSessionID()} ]</div>
          </div>
        </div>
        
        <div className="p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <Terminal className="text-console-blue-bright h-8 w-8 mr-2" />
            <h1 className="text-2xl md:text-3xl font-display uppercase text-console-white tracking-widest">
              SPORTS BETTING SYSTEM
            </h1>
          </div>
          <div className="font-mono text-console-white-muted text-sm flex flex-wrap justify-center items-center gap-2">
            <span>USER: AUTHORIZED</span>
            <span className="h-1.5 w-1.5 bg-console-blue-bright rounded-full animate-pulse"></span>
            <span>SYSTEM: ONLINE</span>
            <span className="h-1.5 w-1.5 bg-console-blue-bright rounded-full animate-pulse"></span>
            <span>TIME: {getTerminalTime()}</span>
          </div>
          
          {/* Add clear data source indicator */}
          {!loadingMatches && (
            <div className="mt-4 p-2 bg-console-gray-terminal/80 border-1 border-console-blue inline-block">
              <div className={`font-mono text-sm uppercase flex items-center ${
                dataSource === 'database' ? 'text-green-500' :
                dataSource === 'api' ? 'text-blue-500' : 
                'text-orange-500'
              }`}>
                {dataSource === 'database' ? (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    <span>DATABASE_DATA: Using persisted matches from database</span>
                  </>
                ) : dataSource === 'api' ? (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    <span>LIVE_API_DATA: Using real-time The Odds API</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 mr-2" />
                    <span>MOCK_DATA: Using generated mock matches</span>
                  </>
                )}
              </div>
              <div className="mt-2 text-xs text-console-white-dim font-mono">
                {matches.length > 0 ? (
                  <>DISPLAYING {matches.length} {isLiveData ? 'LIVE' : 'MOCK'} MATCHES</>
                ) : (
                  <>NO MATCHES AVAILABLE</>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Daredevil Banner - Added from photo */}
      <section className="w-full bg-console-blue-bright/90 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
        {/* Full-width image container */}
        <div className="relative w-full border-b-1 border-console-blue bg-console-blue-bright/80 backdrop-blur-xs overflow-hidden">
          <div className="relative w-full mx-auto px-0">
            <img 
              src="https://i.ibb.co/rGh18fww/nba-banner-v3.png"
              alt="Agent Daredevil - Wanna Bet?" 
              className="w-full h-auto object-cover mx-auto relative z-0"
            />
          </div>
        </div>
      </section>
      
      {/* Featured Matches Banner */}
      <div className="w-full bg-console-black/60 backdrop-blur-xs border-1 border-console-blue shadow-terminal">
        <div className="bg-console-blue/90 p-2 text-black flex items-center justify-between">
          <div className="text-xs text-console-white font-mono tracking-wide">[ FEATURED_MATCHES ]</div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-console-white font-mono tracking-wide">[ TOP_ODDS ]</div>
            <div className="text-xs text-console-white font-mono tracking-wide opacity-80">SYS_TIME: {getTerminalTime()}</div>
          </div>
        </div>
        
        <div className="relative py-8 w-full overflow-hidden min-h-[120px]">
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-console-blue/40 to-console-black/40 z-0"></div>
          
          {/* Banner content */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-display uppercase text-console-white tracking-widest mb-4 text-shadow-glow">
                UPCOMING MATCHUPS
              </div>
              <div className="bg-console-black/60 backdrop-blur-sm border-1 border-console-blue p-4 inline-block">
                <div className="text-console-white font-mono">
                  {matches && matches.length > 0 ? `${matches.length} AVAILABLE MATCHES` : 'LOADING MATCH DATA...'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom bar with stats */}
        <div className="bg-console-black/80 backdrop-blur-xs p-3 border-t border-console-blue/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 font-mono text-sm text-console-white-dim">
            <div className="flex items-center gap-4">
              <span className="text-console-blue-bright">TODAY'S MATCHES: {matches ? matches.filter(m => new Date(m.commence_time).toDateString() === new Date().toDateString()).length : 0}</span>
              <span>|</span>
              <span className="text-console-blue-bright">ACTIVE BETS: 12</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs">ODDS UPDATED</span>
              <button 
                onClick={handleRefresh}
                className="bg-yellow-500/90 text-black px-3 py-1 text-xs font-mono hover:bg-yellow-400 transition-colors"
              >
                REFRESH DATA
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search and Data Source Indicator */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-console-gray-terminal/70 backdrop-blur-xs p-4 border-1 border-console-blue shadow-terminal">
        <div className="w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-console-blue h-4 w-4" />
            <input
              type="text"
              placeholder="SEARCH_TEAMS.."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2 bg-console-black/50 backdrop-blur-xs border-1 border-console-blue rounded-none text-console-white font-mono uppercase focus:outline-none focus:shadow-button"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center md:justify-end items-center gap-3 mt-3 md:mt-0">
          <div className={`inline-flex items-center gap-2 px-3 py-1 font-mono text-sm ${
            dataSource === 'database' ? 'text-green-500' : 
            dataSource === 'api' ? 'text-blue-500' : 
            'text-orange-500'
          }`}>
            {dataSource === 'database' ? (
              <>
                <Database className="h-4 w-4" />
                <span>DB_DATA</span>
              </>
            ) : dataSource === 'api' ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>API_DATA</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>MOCK_DATA</span>
              </>
            )}
          </div>
          
          <button 
            onClick={handleRefresh}
            className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue p-2 hover:shadow-button transition-all"
            aria-label="Refresh matches"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-console-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </button>
          
          <a 
            href={YAHOO_SPORTS_ODDS_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-console-blue-bright font-mono hover:text-console-white transition-colors"
          >
            <span>[YAHOO_SPORTS]</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      
      {matchesError && (
        <div className="bg-red-900/30 backdrop-blur-xs border-1 border-red-800 text-red-300 px-4 py-3 font-mono">
          <span className="text-red-500 mr-2">ERROR:</span> {matchesError}
        </div>
      )}
      
      {shouldShowLoading ? (
        <div className="flex justify-center items-center py-12 bg-console-gray-terminal/60 backdrop-blur-xs border-1 border-console-blue shadow-terminal">
          <div className="text-console-white font-mono mr-3">LOADING_DATA</div>
          <LoadingSpinner size={6} color="text-console-blue-bright" />
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-12 bg-console-gray-terminal/60 backdrop-blur-xs border-1 border-console-blue shadow-terminal">
          <p className="text-console-white-muted font-mono">
            {searchTerm ? 'NO_MATCHES_FOUND. ADJUST_SEARCH_PARAMETERS.' : 'NO_UPCOMING_MATCHES_AVAILABLE.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => (
            match.sport_key === 'sandbox_metaverse' ? (
              <SandboxMatchCard 
                key={match.id} 
                match={match}
                onSelectForChat={handleSelectMatchForChat}
                onSelectForBetting={handleSelectMatchForBetting}
                isChatSelected={selectedMatch?.id === match.id}
                isBettingSelected={selectedMatchForBetting?.id === match.id}
              />
            ) : (
              <MatchCard 
                key={match.id} 
                match={match} 
                formatDate={formatDate} 
                formatTime={formatTime} 
                isLiveData={isLiveData}
                onSelectForChat={handleSelectMatchForChat}
                onSelectForBetting={handleSelectMatchForBetting}
                isChatSelected={selectedMatch?.id === match.id}
                isBettingSelected={selectedMatchForBetting?.id === match.id}
              />
            )
          ))}
        </div>
      )}
      
      {/* Chat Room Section */}
      {selectedMatch && (
        <div className="mt-8">
          <MatchChatRoom match={selectedMatch} onClose={handleCloseChat} />
        </div>
      )}
      
      {/* Betting Modal */}
      <Modal
        isOpen={showBettingModal && selectedMatchForBetting !== null}
        onClose={handleCloseBetting}
        width="max-w-3xl"
      >
        {selectedMatchForBetting && (
          <MatchBettingForm match={selectedMatchForBetting} onClose={handleCloseBetting} />
        )}
      </Modal>
    </div>
  );
};

interface MatchCardProps {
  match: Match;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
  isLiveData: boolean;
  onSelectForChat: (match: Match) => void;
  onSelectForBetting: (match: Match) => void;
  isChatSelected: boolean;
  isBettingSelected: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  formatDate, 
  formatTime, 
  isLiveData,
  onSelectForChat,
  onSelectForBetting,
  isChatSelected,
  isBettingSelected
}) => {
  const getMainOdds = (match: Match) => {
    try {
      if (!match.bookmakers || match.bookmakers.length === 0) {
        return { home: null, away: null };
      }
      
      const mainBookmaker = match.bookmakers[0];
      const h2hMarket = mainBookmaker.markets.find(m => m.key === 'h2h');
      
      if (!h2hMarket) {
        return { home: null, away: null };
      }
      
      // Log the team names and available outcomes for debugging
      console.log('=== MATCH CARD DEBUG: Team names vs outcomes ===');
      console.log('Home team:', match.home_team.name);
      console.log('Away team:', match.away_team.name);
      console.log('Available outcomes:', h2hMarket.outcomes.map(o => o.name));
      
      // First try exact match
      let homeOutcome = h2hMarket.outcomes.find(o => o.name === match.home_team.name);
      let awayOutcome = h2hMarket.outcomes.find(o => o.name === match.away_team.name);
      
      // If exact match fails, try contains match (case insensitive)
      if (!homeOutcome) {
        homeOutcome = h2hMarket.outcomes.find(o => 
          o.name.toLowerCase().includes(match.home_team.name.toLowerCase()) ||
          match.home_team.name.toLowerCase().includes(o.name.toLowerCase())
        );
        console.log('Using fuzzy match for home team:', homeOutcome?.name);
      }
      
      if (!awayOutcome) {
        awayOutcome = h2hMarket.outcomes.find(o => 
          o.name.toLowerCase().includes(match.away_team.name.toLowerCase()) ||
          match.away_team.name.toLowerCase().includes(o.name.toLowerCase())
        );
        console.log('Using fuzzy match for away team:', awayOutcome?.name);
      }
      
      // If we still have no matches, just take the first two outcomes in order
      if (!homeOutcome && !awayOutcome && h2hMarket.outcomes.length >= 2) {
        console.log('Using fallback outcome assignment');
        homeOutcome = h2hMarket.outcomes[0];
        awayOutcome = h2hMarket.outcomes[1];
      }
      
      return {
        home: homeOutcome ? homeOutcome.price : null,
        away: awayOutcome ? awayOutcome.price : null
      };
    } catch (e) {
      console.error('Error getting odds:', e);
      return { home: null, away: null };
    }
  };
  
  const odds = getMainOdds(match);
  
  const handleChatButtonClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    onSelectForChat(match);
  };
  
  const handleBetButtonClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    onSelectForBetting(match);
  };
  
  return (
    <div className={`bg-console-gray-terminal/70 backdrop-blur-xs border-1 ${
      isChatSelected || isBettingSelected ? 'border-console-blue-bright shadow-glow' : 'border-console-blue shadow-terminal'
    } overflow-hidden hover:shadow-glow transition-all group`}>
      <div className="bg-console-gray/70 backdrop-blur-xs p-3">
        <div className="flex flex-wrap justify-between items-center">
            <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-console-blue-bright" />
            <span className="text-sm text-console-white font-mono">{formatDate(match.commence_time)}</span>
            </div>
            <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-console-blue-bright" />
            <span className="text-sm text-console-white font-mono">{formatTime(match.commence_time)}</span>
            {match.bookmakers && match.bookmakers.length > 0 && (
              <span className={`text-xs font-mono px-1 py-0.5 ${
                match.bookmakers[0].key === 'yahoo_sports' ? 'bg-blue-600 text-white' :
                match.bookmakers[0].key === 'admin_created' ? 'bg-purple-600 text-white' :
                !isLiveData ? 'bg-yellow-600 text-black' : 'bg-green-600 text-white'
              } rounded`}>
                {match.bookmakers[0].key === 'yahoo_sports' ? 'YAHOO' : 
                 match.bookmakers[0].key === 'admin_created' ? 'ADMIN' :
                 !isLiveData ? 'MOCK' : 'API'}
              </span>
            )}
            </div>
          </div>
          
          {/* Sport title badge */}
          <div className="mt-1 flex justify-end">
            <span className="bg-console-black/40 px-2 py-0.5 text-xs font-mono text-console-blue-bright">
              {match.sport_title || (match.sport_name ? `${match.sport_name.toUpperCase()} ${match.league_name?.toUpperCase() || ''}` : 'SPORTS')}
            </span>
          </div>
        </div>
        
        <div className="p-4">
        <div className="grid grid-cols-3 gap-2 items-center">
            {/* Home Team */}
            <div className="text-center">
            <div className="font-mono text-console-white group-hover:text-console-blue-bright transition-colors text-sm sm:text-base truncate">{match.home_team.name}</div>
              {odds.home && (
              <div className="mt-2 flex flex-col gap-1">
                <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue px-2 py-1 font-mono text-xs sm:text-sm">
                  <span className="text-console-blue-bright">{formatDecimalOdds(odds.home)}</span>
                  <span className="text-console-white-muted ml-1">(EU)</span>
                </div>
                <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue px-2 py-1 font-mono text-xs sm:text-sm">
                  <span className="text-console-blue-bright">{decimalToAmerican(odds.home)}</span>
                  <span className="text-console-white-muted ml-1">(US)</span>
                </div>
                </div>
              )}
            </div>
            
            {/* VS */}
            <div className="text-center">
            <span className="text-console-blue-bright font-mono text-sm">VS</span>
            </div>
            
            {/* Away Team */}
            <div className="text-center">
            <div className="font-mono text-console-white group-hover:text-console-blue-bright transition-colors text-sm sm:text-base truncate">{match.away_team.name}</div>
              {odds.away && (
              <div className="mt-2 flex flex-col gap-1">
                <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue px-2 py-1 font-mono text-xs sm:text-sm">
                  <span className="text-console-blue-bright">{formatDecimalOdds(odds.away)}</span>
                  <span className="text-console-white-muted ml-1">(EU)</span>
                </div>
                <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue px-2 py-1 font-mono text-xs sm:text-sm">
                  <span className="text-console-blue-bright">{decimalToAmerican(odds.away)}</span>
                  <span className="text-console-white-muted ml-1">(US)</span>
                </div>
                </div>
              )}
            </div>
          </div>
          
        <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
          <button
            onClick={handleBetButtonClick}
            className={`flex items-center gap-1 px-3 py-1 ${
              isBettingSelected ? 'bg-[#E5FF03] text-black' : 'bg-console-black/50 text-[#E5FF03]'
            } border-1 ${isBettingSelected ? 'border-[#E5FF03]' : 'border-[#E5FF03]'} hover:bg-[#E5FF03]/70 hover:text-black transition-colors`}
          >
            <Zap className="h-4 w-4" />
            <span className="text-xs font-mono">BET NOW</span>
          </button>
          
          <button
            onClick={handleChatButtonClick}
            className={`flex items-center gap-1 px-2 py-1 ${
              isChatSelected ? 'bg-[#00A4FF] text-console-white' : 'bg-console-black/50 text-[#00A4FF]'
            } border-1 ${isChatSelected ? 'border-[#00A4FF]' : 'border-[#00A4FF]'} hover:bg-[#00A4FF]/70 hover:text-console-white transition-colors`}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-mono">COMMUNITY CHAT</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchesPage;