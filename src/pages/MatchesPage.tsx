import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Search, Wifi, WifiOff, ExternalLink, Terminal, MessageSquare, Zap, Database } from 'lucide-react';
import { useBetting } from '../context/BettingContext';
import { Match } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { decimalToAmerican, formatDecimalOdds } from '../utils/oddsUtils';
import MatchChatRoom from '../components/match/MatchChatRoom';
import MatchBettingForm from '../components/match/MatchBettingForm';
import Modal from '../components/common/Modal';

const YAHOO_SPORTS_ODDS_URL = 'https://sports.yahoo.com/nba/odds/';

const MatchesPage: React.FC = () => {
  const { matches, loadingMatches, refreshMatches, isLiveData, dataSource } = useBetting();
  const [error, setError] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState<boolean>(false);
  
  // State for the selected match for chat
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  // State for the selected match for betting
  const [selectedMatchForBetting, setSelectedMatchForBetting] = useState<Match | null>(null);
  // State for showing betting modal
  const [showBettingModal, setShowBettingModal] = useState<boolean>(false);
  
  useEffect(() => {
    // Load data when component mounts
    const loadData = async () => {
      try {
        await refreshMatches();
      } catch (err) {
        setError('Failed to load matches. Please try again.');
        console.error('Error loading matches:', err);
      }
    };
    
    loadData();
    
    // Set a timeout to force render content even if loading doesn't complete properly
    const timer = setTimeout(() => {
      setForceRender(true);
    }, 3000); // Force render after 3 seconds no matter what
    
    // Cleanup function
    return () => {
      clearTimeout(timer);
      setForceRender(false);
    };
  }, []); // Empty dependency array to ensure it only runs once when mounted
  
  // Use matches directly since search functionality was removed
  const filteredMatches = matches || [];
  
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
    setError(null);
    refreshMatches().catch(err => {
      setError('Failed to load matches. Please try again.');
      console.error('Error refreshing matches:', err);
    });
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
  
  // Determine if we should show the loading screen - add forceRender check
  const shouldShowLoading = !forceRender && loadingMatches;
  
  // First, find the LiveDataIndicator component and enhance it to be more prominent for both states
  // Find the component that renders the data source indicator
  const LiveDataIndicator = () => {
    // Determine styling based on data source
    let iconColor = 'text-yellow-400';
    let label = 'OFFLINE';
    let icon = <WifiOff className="w-3 h-3" />;
    let tooltip = 'Using mock data - no live connection';

    if (isLiveData) {
      if (dataSource === 'the_odds_api') {
        iconColor = 'text-green-400';
        label = 'API DATA';
        icon = <Wifi className="w-3 h-3" />;
        tooltip = 'Connected to The Odds API - live data';
      } else if (dataSource === 'yahoo') {
        iconColor = 'text-blue-400';
        label = 'YAHOO DATA';
        icon = <Database className="w-3 h-3" />;
        tooltip = 'Connected to Yahoo Sports - live data';
      }
    }

    return (
      <div className={`flex items-center gap-1 ${iconColor} cursor-help`} title={tooltip}>
        {icon}
        <span className="text-xs font-mono tracking-wide">{label}</span>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Header with title and banner */}
      <div className="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
        <div className="bg-console-blue/90 p-2 text-black flex items-center justify-between">
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ NBA_TERMINAL ]</div>
          <div className="flex items-center gap-4">
            <LiveDataIndicator />
            <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ SESSION: {getSessionID()} ]</div>
          </div>
        </div>
        
        <div className="p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <Terminal className="text-console-blue-bright h-8 w-8 mr-2" />
            <h1 className="text-2xl md:text-3xl font-display uppercase text-console-white tracking-widest">
              NBA BETTING SYSTEM
            </h1>
          </div>
          <div className="font-mono text-console-white-muted text-sm flex flex-wrap justify-center items-center gap-2">
            <span>USER: AUTHORIZED</span>
            <span className="h-1.5 w-1.5 bg-console-blue-bright rounded-full animate-pulse"></span>
            <span>SYSTEM: ONLINE</span>
            <span className="h-1.5 w-1.5 bg-console-blue-bright rounded-full animate-pulse"></span>
            <span>TIME: {getTerminalTime()}</span>
          </div>
          
          {/* Data source indicator removed */}
        </div>
      </div>
      
      {/* Daredevil Banner - Added from photo */}
      <section className="w-full bg-console-blue-bright/90 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
        {/* Full-width image container */}
        <div className="relative w-full border-b-1 border-console-blue bg-console-blue-bright/80 backdrop-blur-xs overflow-hidden">
          <div className="relative max-w-6xl mx-auto">
            <img 
              src="https://i.ibb.co/Q7mKsRBc/nba-banner.png"
              alt="Agent Daredevil - Wanna Bet?" 
              className="w-full h-auto object-contain mx-auto relative z-0"
            />
          </div>
        </div>
      </section>
      
      {/* Featured Matches Banner removed */}
      
      {/* Search and Data Source Indicator section removed */}
      
      {error && (
        <div className="bg-red-900/30 backdrop-blur-xs border-1 border-red-800 text-red-300 px-4 py-3 font-mono">
          <span className="text-red-500 mr-2">ERROR:</span> {error}
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
            NO_UPCOMING_MATCHES_AVAILABLE.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => (
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
                !isLiveData ? 'bg-yellow-600 text-black' : 'bg-green-600 text-white'
              } rounded`}>
                {match.bookmakers[0].key === 'yahoo_sports' ? 'YAHOO' : !isLiveData ? 'MOCK' : 'API'}
              </span>
            )}
            </div>
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