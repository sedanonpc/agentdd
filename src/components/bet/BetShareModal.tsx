import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, Copy, Check, Download, Calendar, Clock, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Bet } from '../../types';
import { useBetting } from '../../context/BettingContext';
import { formatDecimalOdds, decimalToAmerican } from '../../utils/oddsUtils';
import { createPortal } from 'react-dom';

interface BetShareModalProps {
  bet: Bet;
  onClose: () => void;
}

const BetShareModal: React.FC<BetShareModalProps> = ({ bet, onClose }) => {
  const { getMatchById } = useBetting();
  const match = getMatchById(bet.matchId);
  const [copied, setCopied] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  
  // Get team name from team ID
  const getTeamName = (teamId: string) => {
    if (!match) return teamId;
    if (teamId === match.home_team.id) return match.home_team.name;
    if (teamId === match.away_team.id) return match.away_team.name;
    return teamId;
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
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Format time
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid time';
    }
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
  
  // Calculate potential winnings based on bet amount and odds
  const calculatePotentialWinnings = (amount: string | number, odds: number | null): string => {
    if (!odds) return 'N/A';
    
    const betAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(betAmount)) return 'N/A';
    
    // Decimal odds: potential winnings = stake * odds - stake
    const winnings = (betAmount * odds) - betAmount;
    return winnings.toFixed(4);
  };
  
  // Create a sharing URL that includes bet details
  useEffect(() => {
    // Create base URL (current domain)
    const baseUrl = window.location.origin;
    
    // Create a URL with bet details as query parameters
    const url = new URL(`${baseUrl}/accept-bet`);
    url.searchParams.append('id', bet.id);
    url.searchParams.append('creator', bet.creator);
    url.searchParams.append('match', bet.matchId);
    url.searchParams.append('team', bet.teamId);
    url.searchParams.append('amount', bet.amount);
    
    // Add additional match details if available
    if (match) {
      // Add team names
      url.searchParams.append('home_team', match.home_team.name);
      url.searchParams.append('away_team', match.away_team.name);
      
      // Add match time
      url.searchParams.append('match_time', match.commence_time);
      
      // Add team logos if available
      if (match.home_team.logo) {
        url.searchParams.append('home_logo', match.home_team.logo);
      }
      if (match.away_team.logo) {
        url.searchParams.append('away_logo', match.away_team.logo);
      }
      
      // Add odds if available
      const homeTeamOdds = getTeamOdds(match.home_team.name);
      const awayTeamOdds = getTeamOdds(match.away_team.name);
      
      if (homeTeamOdds) {
        url.searchParams.append('home_odds', homeTeamOdds.toString());
      }
      if (awayTeamOdds) {
        url.searchParams.append('away_odds', awayTeamOdds.toString());
      }
    }
    
    // Add description if available
    if (bet.description) {
      url.searchParams.append('description', bet.description);
    }
    
    setShareUrl(url.toString());
  }, [bet, match, getTeamOdds]);
  
  // Copy URL to clipboard
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  };
  
  // Download QR code as PNG
  const handleDownloadQr = () => {
    const canvas = document.getElementById('bet-qr-code')?.querySelector('canvas');
    if (!canvas) return;
    
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `bet-${bet.id.substring(0, 8)}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };
  
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  // Handle click outside
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Get team odds info
  const teamName = getTeamName(bet.teamId);
  const teamOdds = match ? getTeamOdds(teamName) : null;
  const homeTeamOdds = match ? getTeamOdds(match.home_team.name) : null;
  const awayTeamOdds = match ? getTeamOdds(match.away_team.name) : null;
  const oddsTrend = getOddsTrend(homeTeamOdds, awayTeamOdds);
  
  // Helper function to convert amount for display
  const convertAmount = (amount: number | string): string => {
    return typeof amount === 'number' ? amount.toString() : amount;
  };
  
  // Calculate potential winnings
  const potentialWinnings = teamOdds ? calculatePotentialWinnings(convertAmount(bet.amount), teamOdds) : 'N/A';
  
  // Determine if the bet's team is favorite or underdog
  const betTeamStatus = 
    match && oddsTrend && teamName === match.home_team.name ? oddsTrend.home :
    match && oddsTrend && teamName === match.away_team.name ? oddsTrend.away :
    null;
  
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 overflow-y-auto"
      onClick={handleOutsideClick}
    >
      <div className="w-full max-w-md bg-console-gray-terminal border-1 border-console-blue shadow-terminal my-4 animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-console-blue/90 p-2 flex justify-between items-center z-50 border-b border-console-blue">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-white" />
            <h2 className="text-white font-mono text-sm font-bold">SHARE BET INVITATION</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-red-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Unified Bet Details and QR Code */}
          <div className="bg-console-black/70 border-1 border-console-blue p-3 rounded">
            <div className="pt-2 pb-3">
              <h3 className="text-[#E5FF03] font-mono text-4xl sm:text-5xl md:text-4xl font-bold text-center tracking-wide leading-tight">
                INVITE YOUR<br className="md:hidden" /> FRIENDS TO BET!
              </h3>
            </div>
            
            {/* Matchup details at the top */}
            {match && (
              <div className="mb-3 bg-console-blue/10 p-2 border-1 border-console-blue/30 rounded">
                <div className="text-center mb-1">
                  <div className="text-white font-mono text-base font-bold">
                    {match.home_team.name} vs {match.away_team.name}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-console-white-dim text-xs mt-0.5">
                    <Calendar className="h-3 w-3" /> 
                    <span>{formatDate(match.commence_time)}</span>
                    <span className="mx-1">•</span>
                    <Clock className="h-3 w-3" /> 
                    <span>{formatTime(match.commence_time)}</span>
                  </div>
                </div>
                
                <div className="flex justify-center gap-6 mt-1">
                  {homeTeamOdds && (
                    <div className="text-center">
                      <div className="text-console-white-dim text-xs">
                        {match.home_team.name}
                      </div>
                      <div className={`px-2 py-0.5 rounded mt-0.5 text-center ${
                        oddsTrend?.home === 'favorite' ? 'bg-green-900/30 text-green-400' : 
                        oddsTrend?.home === 'underdog' ? 'bg-red-900/30 text-red-400' : 
                        'bg-console-blue/20 text-console-blue-bright'
                      } font-mono text-xs`}>
                        {formatDecimalOdds(homeTeamOdds)} ({decimalToAmerican(homeTeamOdds)})
                      </div>
                    </div>
                  )}
                  
                  {awayTeamOdds && (
                    <div className="text-center">
                      <div className="text-console-white-dim text-xs">
                        {match.away_team.name}
                      </div>
                      <div className={`px-2 py-0.5 rounded mt-0.5 text-center ${
                        oddsTrend?.away === 'favorite' ? 'bg-green-900/30 text-green-400' : 
                        oddsTrend?.away === 'underdog' ? 'bg-red-900/30 text-red-400' : 
                        'bg-console-blue/20 text-console-blue-bright'
                      } font-mono text-xs`}>
                        {formatDecimalOdds(awayTeamOdds)} ({decimalToAmerican(awayTeamOdds)})
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Two-column layout for desktop, stack on mobile */}
            <div className="flex flex-col md:flex-row md:gap-3">
              {/* Left column - Bet details */}
              <div className="md:w-1/2 space-y-2 text-console-white font-mono text-sm mb-3 md:mb-0">
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium">Amount:</span>
                  <div className="bg-[#E5FF03]/10 px-3 py-1.5 rounded-md border-1 border-[#E5FF03]/70 shadow-[0_0_10px_rgba(229,255,3,0.6)] animate-pulse">
                    <span className="text-[#E5FF03] font-bold text-2xl md:text-3xl">{String(bet.amount)} <span className="text-lg md:text-xl">$DARE points</span></span>
                  </div>
                </div>
                
                {/* Team with status indicator */}
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium">Your Selected Team:</span>
                  <div className="flex items-center gap-2">
                    {betTeamStatus === 'favorite' && <ArrowDown className="h-3 w-3 text-green-500" />}
                    {betTeamStatus === 'underdog' && <ArrowUp className="h-3 w-3 text-red-500" />}
                    <span className="text-[#00A4FF] font-bold">{teamName}</span>
                  </div>
                </div>
                
                {/* Add odds */}
                {teamOdds && (
                  <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                    <span className="text-console-white-dim font-medium">Odds:</span>
                    <div className={`px-2 py-0.5 rounded ${
                      betTeamStatus === 'favorite' ? 'bg-green-900/30 text-green-400' : 
                      betTeamStatus === 'underdog' ? 'bg-red-900/30 text-red-400' : 
                      'bg-console-blue/20 text-console-blue-bright'
                    } font-mono`}>
                      {formatDecimalOdds(teamOdds)} ({decimalToAmerican(teamOdds)})
                    </div>
                  </div>
                )}
                
                {/* Add local timestamp */}
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Timestamp:
                  </span>
                  <span className="text-console-white-bright text-xs">
                    {new Date().toLocaleString()}
                  </span>
                </div>
                
                {/* Message - Make it stand out with larger text */}
                {bet.description && (
                  <div className="mt-2 p-2 bg-console-blue/10 border-1 border-console-blue/30 rounded">
                    <div className="text-center">
                      <span className="text-console-white-dim font-medium text-xs block">Message:</span>
                      <div className="text-console-white-bright italic text-sm font-medium">{bet.description}</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right column - QR Code (Maximize size) */}
              <div className="md:w-1/2 flex flex-col items-center justify-center">
                <div 
                  id="bet-qr-code" 
                  className="w-full bg-console-black/30 p-2 shadow-inner border-1 border-console-blue/30 rounded-lg overflow-hidden relative"
                >
                  <div className="mb-1 text-center">
                    <h4 className="text-[#E5FF03] font-mono text-sm font-bold">SCAN TO ACCEPT</h4>
                  </div>
                  
                  <div className="flex justify-center">
                    <QRCodeSVG 
                      value={shareUrl} 
                      size={180} 
                      level="H"
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                      className="rounded-md"
                      imageSettings={{
                        src: '/logo.svg',
                        excavate: true,
                        width: 30,
                        height: 30
                      }}
                    />
                  </div>
                  
                  <div className="text-console-white-dim font-mono text-xs text-center mt-1">
                    <div className="text-[#00A4FF] text-xs font-bold">All match details included</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Share URL */}
          <div className="relative">
            <input 
              type="text" 
              value={shareUrl}
              readOnly
              className="w-full bg-console-black/70 border-1 border-console-blue p-2 pr-10 text-console-white-dim font-mono text-xs rounded"
            />
            <button
              onClick={handleCopyUrl}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-console-white hover:text-[#00A4FF] transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          
          {/* Actions */}
          <div className="flex justify-between items-center gap-3">
            <button
              onClick={handleDownloadQr}
              className="flex-1 bg-console-gray-dark border-1 border-console-blue p-2 text-console-white font-mono text-sm font-bold hover:bg-console-gray transition-colors flex items-center justify-center gap-2 rounded"
            >
              <Download className="h-4 w-4" />
              <span>DOWNLOAD QR</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-[#00A4FF]/90 border-1 border-[#00A4FF] p-2 text-white font-mono text-sm font-bold hover:shadow-glow transition-all rounded"
            >
              DONE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Use createPortal to render the modal outside the normal DOM hierarchy
  return createPortal(modalContent, document.body);
};

export default BetShareModal; 