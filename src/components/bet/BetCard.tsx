import React, { useState } from 'react';
import { MessageSquare, TrendingUp, Calendar, Clock, AlertCircle, Hash, RefreshCw, DollarSign, ArrowUp, ArrowDown, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bet, BetStatus } from '../../types';
import { useBetting } from '../../context/BettingContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatDecimalOdds, decimalToAmerican } from '../../utils/oddsUtils';
import BetShareModal from './BetShareModal';
import { useWeb3 } from '../../context/Web3Context';

interface BetCardProps {
  bet: Bet;
  onSettle: (betId: string) => void;
  isSettling: boolean;
}

const BetCard: React.FC<BetCardProps> = ({ bet, onSettle, isSettling }) => {
  const { getMatchById, refreshMatches } = useBetting();
  const { account } = useWeb3();
  const match = getMatchById(bet.matchId);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  
  // Check if user is the creator of the bet
  const isCreator = bet.creator === account;
  
  // Function to handle share button click
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareModal(true);
  };
  
  // Function to close the share modal
  const handleCloseShareModal = () => {
    setShowShareModal(false);
  };
  
  // Get odds for a team from match bookmakers
  const getTeamOdds = (teamName: string) => {
    if (!match || !match.bookmakers || match.bookmakers.length === 0) {
      return null;
    }
    
    // Try to find odds from the first available bookmaker
    const bookmaker = match.bookmakers[0];
    if (!bookmaker.markets || bookmaker.markets.length === 0) {
      return null;
    }
    
    // Find the h2h (moneyline) market
    const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');
    if (!h2hMarket || !h2hMarket.outcomes) {
      return null;
    }
    
    // Find the team in outcomes
    const teamOutcome = h2hMarket.outcomes.find(outcome => 
      outcome.name.toLowerCase() === teamName.toLowerCase()
    );
    
    return teamOutcome ? teamOutcome.price : null;
  };
  
  // Get odds trend indicator (is this team favored or underdog)
  const getOddsTrend = (homeOdds: number | null, awayOdds: number | null) => {
    if (!homeOdds || !awayOdds) return null;
    
    if (homeOdds < awayOdds) {
      return {
        home: 'favorite',
        away: 'underdog'
      };
    } else if (awayOdds < homeOdds) {
      return {
        home: 'underdog',
        away: 'favorite'
      };
    } else {
      return {
        home: 'even',
        away: 'even'
      };
    }
  };
  
  const getStatusColor = (status: BetStatus) => {
    switch (status) {
      case BetStatus.OPEN:
        return {
          bg: 'bg-[#E5FF03]/20',
          border: 'border-[#E5FF03]',
          text: 'text-[#E5FF03]'
        };
      case BetStatus.ACTIVE:
        return {
          bg: 'bg-[#00A4FF]/20',
          border: 'border-[#00A4FF]',
          text: 'text-[#00A4FF]'
        };
      case BetStatus.COMPLETED:
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-500',
          text: 'text-green-500'
        };
      case BetStatus.CANCELLED:
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500',
          text: 'text-red-500'
        };
      default:
        return {
          bg: 'bg-console-gray-dark/80',
          border: 'border-console-blue-dim',
          text: 'text-console-white-muted'
        };
    }
  };
  
  const statusColors = getStatusColor(bet.status);
  
  // Function to handle manual refresh when match data is missing
  const handleRefreshMatchData = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await refreshMatches();
    } catch (error) {
      console.error('Error refreshing match data:', error);
    }
  };
  
  // If match data is not available, show a card with limited info
  if (!match) {
    return (
      <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden hover:shadow-glow transition-all group">
        <div className="bg-console-gray/70 backdrop-blur-xs p-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-console-white font-mono">Match ID: {bet.matchId.substring(0, 16)}...</span>
            </div>
            <div className={`text-xs px-2 py-0.5 ${statusColors.bg} backdrop-blur-xs border-1 ${statusColors.border} ${statusColors.text} font-mono`}>
              {bet.status}
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue p-3 mb-4">
            <div className="text-console-white-muted font-mono text-xs mb-2">AMOUNT:</div>
            <div className="text-[#E5FF03] font-mono text-sm">{bet.amount} ETH</div>
          </div>
          
          <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue p-3 mb-4">
            <div className="text-console-white-muted font-mono text-xs mb-2">YOUR BET ON:</div>
            <div className="text-[#00A4FF] font-mono text-sm">Team ID: {bet.teamId}</div>
          </div>
          
          {bet.id && (
            <div className="bg-console-black/50 backdrop-blur-xs border-1 border-[#E5FF03] p-3 mb-4">
              <div className="text-console-white-muted font-mono text-xs mb-2 flex items-center gap-1">
                <Hash className="h-3 w-3 text-[#E5FF03]" />
                <span>BET ID:</span>
              </div>
              <div className="text-[#E5FF03] font-mono text-xs overflow-x-auto whitespace-nowrap">{bet.id}</div>
            </div>
          )}
          
          {bet.description && (
            <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue p-3 mb-4">
              <div className="text-console-white-muted font-mono text-xs mb-2">MESSAGE:</div>
              <div className="text-console-white font-mono text-sm italic">"{bet.description}"</div>
            </div>
          )}
          
          <div className="bg-red-900/30 backdrop-blur-xs border-1 border-red-800 p-3 mb-4">
            <div className="text-red-500 font-mono text-xs mb-2">STATUS:</div>
            <div className="text-red-300 font-mono text-sm mb-3">Match data unavailable - This can happen when:</div>
            <ul className="text-red-300 font-mono text-xs list-disc list-inside space-y-1 mb-3">
              <li>The match is no longer in the current data feed</li>
              <li>The data source has changed since bet creation</li>
              <li>There was a temporary data loading issue</li>
            </ul>
            <button 
              onClick={handleRefreshMatchData}
              className="flex items-center gap-2 bg-red-800/50 border-1 border-red-500 px-3 py-1 text-red-300 hover:text-white transition-colors font-mono text-xs mt-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>ATTEMPT DATA RELOAD</span>
            </button>
          </div>
          
          <div className="flex justify-between items-center gap-4">
            {isCreator && (
              <button
                onClick={handleShare}
                className="flex-1 bg-[#E5FF03]/20 border-1 border-[#E5FF03] px-4 py-2 text-[#E5FF03] font-mono hover:shadow-button transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                <span>SHARE</span>
              </button>
            )}
            
            {bet.status === BetStatus.ACTIVE && (
              <Link
                to={`/chat/${bet.id}`}
                className="flex-1 bg-[#00A4FF]/90 backdrop-blur-xs border-1 border-[#00A4FF] px-4 py-2 text-white font-mono hover:shadow-button transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                <span>CHAT</span>
              </Link>
            )}
            
            {bet.status === BetStatus.ACTIVE && (
              <button
                onClick={() => onSettle(bet.id)}
                disabled={isSettling}
                className="flex-1 bg-[#E5FF03]/90 backdrop-blur-xs border-1 border-[#E5FF03] px-4 py-2 text-black font-mono hover:shadow-button transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSettling ? (
                  <>
                    <LoadingSpinner size={4} />
                    <span>SETTLING...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span>SETTLE</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Render the modal separately only when showShareModal is true */}
        {showShareModal && (
          <BetShareModal bet={bet} onClose={handleCloseShareModal} />
        )}
      </div>
    );
  }
  
  const getTeamName = (teamId: string) => {
    if (teamId === match.home_team.id) return match.home_team.name;
    if (teamId === match.away_team.id) return match.away_team.name;
    return 'Unknown Team';
  };
  
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
  
  // Format how long ago the bet was created
  const formatTimeElapsed = (timestamp: number): string => {
    try {
      const createdDate = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - createdDate.getTime();
      
      // Convert to seconds, minutes, hours, days
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      } else if (diffHours > 0) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      } else if (diffMins > 0) {
        return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
      } else {
        return 'Just now';
      }
    } catch (e) {
      return 'Unknown time';
    }
  };
  
  // Get odds for both teams
  const homeTeamOdds = getTeamOdds(match.home_team.name);
  const awayTeamOdds = getTeamOdds(match.away_team.name);
  const oddsTrend = getOddsTrend(homeTeamOdds, awayTeamOdds);
  
  // Get user's selected team
  const userTeam = getTeamName(bet.teamId);
  const userTeamOdds = userTeam === match.home_team.name ? homeTeamOdds : awayTeamOdds;
  
  // Calculate potential winnings based on bet amount and odds
  const calculatePotentialWinnings = (amount: string, odds: number | null): string => {
    if (!odds) return 'N/A';
    
    const betAmount = parseFloat(amount);
    if (isNaN(betAmount)) return 'N/A';
    
    // Decimal odds: potential winnings = stake * odds - stake
    const winnings = (betAmount * odds) - betAmount;
    return winnings.toFixed(4);
  };
  
  return (
    <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden hover:shadow-glow transition-all group">
      <div className="bg-console-gray/70 backdrop-blur-xs p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-console-blue-bright" />
            <span className="text-sm text-console-white font-mono">{formatDate(match.commence_time)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-[#E5FF03]" />
              <span className="text-sm text-[#E5FF03] font-mono font-bold">{bet.amount} ETH</span>
            </div>
            <div className={`text-xs px-2 py-0.5 ${statusColors.bg} backdrop-blur-xs border-1 ${statusColors.border} ${statusColors.text} font-mono`}>
              {bet.status}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue p-3 mb-4">
          <div className="text-console-white-muted font-mono text-xs mb-2">MATCH:</div>
          <div className="text-console-white font-mono text-sm">{match.home_team.name} vs {match.away_team.name}</div>
        </div>
        
        {/* Added odds section */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`bg-console-black/50 backdrop-blur-xs border-1 ${
            oddsTrend?.home === 'favorite' ? 'border-green-500' : oddsTrend?.home === 'underdog' ? 'border-red-500' : 'border-console-blue'
          } p-3`}>
            <div className="flex justify-between mb-2">
              <div className="text-console-white-muted font-mono text-xs">HOME ODDS:</div>
              {oddsTrend?.home === 'favorite' && <ArrowDown className="h-3 w-3 text-green-500" />}
              {oddsTrend?.home === 'underdog' && <ArrowUp className="h-3 w-3 text-red-500" />}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-console-white font-mono text-sm">{match.home_team.name}</div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${
                  oddsTrend?.home === 'favorite' ? 'text-green-500' : oddsTrend?.home === 'underdog' ? 'text-red-500' : 'text-console-white'
                }`}>
                  {homeTeamOdds ? formatDecimalOdds(homeTeamOdds) : 'N/A'}
                </span>
                <span className={`text-xs font-mono ${
                  oddsTrend?.home === 'favorite' ? 'text-green-500' : oddsTrend?.home === 'underdog' ? 'text-red-500' : 'text-console-white'
                }`}>
                  {homeTeamOdds ? decimalToAmerican(homeTeamOdds) : ''}
                </span>
              </div>
            </div>
          </div>
          
          <div className={`bg-console-black/50 backdrop-blur-xs border-1 ${
            oddsTrend?.away === 'favorite' ? 'border-green-500' : oddsTrend?.away === 'underdog' ? 'border-red-500' : 'border-console-blue'
          } p-3`}>
            <div className="flex justify-between mb-2">
              <div className="text-console-white-muted font-mono text-xs">AWAY ODDS:</div>
              {oddsTrend?.away === 'favorite' && <ArrowDown className="h-3 w-3 text-green-500" />}
              {oddsTrend?.away === 'underdog' && <ArrowUp className="h-3 w-3 text-red-500" />}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-console-white font-mono text-sm">{match.away_team.name}</div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${
                  oddsTrend?.away === 'favorite' ? 'text-green-500' : oddsTrend?.away === 'underdog' ? 'text-red-500' : 'text-console-white'
                }`}>
                  {awayTeamOdds ? formatDecimalOdds(awayTeamOdds) : 'N/A'}
                </span>
                <span className={`text-xs font-mono ${
                  oddsTrend?.away === 'favorite' ? 'text-green-500' : oddsTrend?.away === 'underdog' ? 'text-red-500' : 'text-console-white'
                }`}>
                  {awayTeamOdds ? decimalToAmerican(awayTeamOdds) : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`bg-console-black/50 backdrop-blur-xs border-1 ${userTeamOdds ? 'border-[#00A4FF]' : 'border-console-blue'} p-3 mb-4`}>
          <div className="text-console-white-muted font-mono text-xs mb-2 flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-[#00A4FF]" />
            <span>YOUR BET ON:</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[#00A4FF] font-mono text-sm">{getTeamName(bet.teamId)}</div>
            {userTeamOdds && (
              <div className="bg-[#00A4FF]/20 border-1 border-[#00A4FF] px-2 py-0.5 text-[#00A4FF] text-xs font-mono">
                {formatDecimalOdds(userTeamOdds)} ({decimalToAmerican(userTeamOdds)})
              </div>
            )}
          </div>
        </div>
        
        {/* Add potential winnings section */}
        {userTeamOdds && (
          <div className="bg-console-black/50 backdrop-blur-xs border-1 border-green-500 p-3 mb-4">
            <div className="text-console-white-muted font-mono text-xs mb-2 flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>POTENTIAL WINNINGS:</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-green-500 font-mono text-sm">
                +{calculatePotentialWinnings(bet.amount, userTeamOdds)} ETH
              </div>
              <div className="text-console-white-dim text-xs font-mono">
                (if {getTeamName(bet.teamId)} wins)
              </div>
            </div>
          </div>
        )}
        
        {/* Add bet creation time */}
        <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue p-3 mb-4">
          <div className="text-console-white-muted font-mono text-xs mb-2 flex items-center gap-2">
            <Clock className="h-3 w-3 text-console-blue-bright" />
            <span>BET CREATED:</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-console-white font-mono text-sm">
              {formatTimeElapsed(bet.timestamp)}
            </div>
            <div className="text-console-white-dim text-xs font-mono">
              {new Date(bet.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        
        {bet.id && (
          <div className="bg-console-black/50 backdrop-blur-xs border-1 border-[#E5FF03] p-3 mb-4">
            <div className="text-console-white-muted font-mono text-xs mb-2 flex items-center gap-1">
              <Hash className="h-3 w-3 text-[#E5FF03]" />
              <span>BET ID:</span>
            </div>
            <div className="text-[#E5FF03] font-mono text-xs overflow-x-auto whitespace-nowrap">{bet.id}</div>
          </div>
        )}
        
        {bet.description && (
          <div className="bg-console-black/50 backdrop-blur-xs border-1 border-console-blue p-3 mb-4">
            <div className="text-console-white-muted font-mono text-xs mb-2">MESSAGE:</div>
            <div className="text-console-white font-mono text-sm italic">"{bet.description}"</div>
          </div>
        )}
        
        <div className="flex justify-between items-center gap-2">
          {isCreator && (
            <button
              onClick={handleShare}
              className="flex-1 bg-[#E5FF03]/20 border-1 border-[#E5FF03] px-3 py-2 text-[#E5FF03] font-mono hover:shadow-button transition-all flex items-center justify-center gap-1"
            >
              <Share2 className="h-4 w-4" />
              <span>SHARE</span>
            </button>
          )}
          
          {bet.status === BetStatus.ACTIVE && (
            <Link
              to={`/chat/${bet.id}`}
              className="flex-1 bg-[#00A4FF]/90 backdrop-blur-xs border-1 border-[#00A4FF] px-3 py-2 text-white font-mono hover:shadow-button transition-all flex items-center justify-center gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              <span>CHAT</span>
            </Link>
          )}
          
          {bet.status === BetStatus.ACTIVE && (
            <button
              onClick={() => onSettle(bet.id)}
              disabled={isSettling}
              className="flex-1 bg-[#E5FF03]/90 backdrop-blur-xs border-1 border-[#E5FF03] px-3 py-2 text-black font-mono hover:shadow-button transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              {isSettling ? (
                <>
                  <LoadingSpinner size={4} />
                  <span>SETTLING...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>SETTLE</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Render the modal separately only when showShareModal is true */}
      {showShareModal && (
        <BetShareModal bet={bet} onClose={handleCloseShareModal} />
      )}
    </div>
  );
};

export default BetCard; 