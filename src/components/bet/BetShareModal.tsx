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
  const calculatePotentialWinnings = (amount: string, odds: number | null): string => {
    if (!odds) return 'N/A';
    
    const betAmount = parseFloat(amount);
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
  
  // Determine if the bet's team is favorite or underdog
  const betTeamStatus = 
    match && oddsTrend && teamName === match.home_team.name ? oddsTrend.home :
    match && oddsTrend && teamName === match.away_team.name ? oddsTrend.away :
    null;
  
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 overflow-y-auto"
      onClick={handleOutsideClick}
    >
      <div className="w-full max-w-md bg-console-gray-terminal border-1 border-console-blue shadow-terminal my-8 animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-console-blue/90 p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-white" />
            <h2 className="text-white font-mono text-sm">SHARE BET INVITATION</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-red-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Bet details */}
          <div className="bg-console-black/50 border-1 border-console-blue p-4">
            <h3 className="text-[#E5FF03] font-mono text-5xl mb-3">YOU'VE BEEN INVITED TO BET!</h3>
            <div className="space-y-3 text-console-white font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-console-white-dim">Amount:</span>
                <span className="text-[#E5FF03]">{bet.amount} ETH</span>
              </div>
              
              {match && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-console-white-dim">Match:</span>
                    <span className="text-console-white-bright">{match.home_team.name} vs {match.away_team.name}</span>
                  </div>
                  
                  {/* Add match date and time */}
                  <div className="flex justify-between items-center">
                    <span className="text-console-white-dim flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Date:
                    </span>
                    <span className="text-console-white-bright">{formatDate(match.commence_time)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-console-white-dim flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Time:
                    </span>
                    <span className="text-console-white-bright">{formatTime(match.commence_time)}</span>
                  </div>
                </>
              )}
              
              {/* Team with status indicator */}
              <div className="flex justify-between items-center">
                <span className="text-console-white-dim">Team:</span>
                <div className="flex items-center gap-2">
                  {betTeamStatus === 'favorite' && <ArrowDown className="h-3 w-3 text-green-500" />}
                  {betTeamStatus === 'underdog' && <ArrowUp className="h-3 w-3 text-red-500" />}
                  <span className="text-[#00A4FF]">{teamName}</span>
                </div>
              </div>
              
              {/* Add odds */}
              {teamOdds && (
                <div className="flex justify-between items-center">
                  <span className="text-console-white-dim">Odds:</span>
                  <div className={`px-2 py-0.5 rounded ${
                    betTeamStatus === 'favorite' ? 'bg-green-900/30 text-green-400' : 
                    betTeamStatus === 'underdog' ? 'bg-red-900/30 text-red-400' : 
                    'bg-console-blue/20 text-console-blue-bright'
                  }`}>
                    {formatDecimalOdds(teamOdds)} ({decimalToAmerican(teamOdds)})
                  </div>
                </div>
              )}
              
              {/* Add potential winnings */}
              {teamOdds && (
                <div className="flex justify-between items-center">
                  <span className="text-console-white-dim flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" /> Potential Win:
                  </span>
                  <span className="text-green-500">+{calculatePotentialWinnings(bet.amount, teamOdds)} ETH</span>
                </div>
              )}
              
              {bet.description && (
                <div className="mt-2 pt-2 border-t border-console-blue/50">
                  <span className="text-console-white-dim">Message:</span>
                  <div className="text-console-white-bright italic mt-1">"{bet.description}"</div>
                </div>
              )}
            </div>
          </div>
          
          {/* QR Code with enhanced details */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-full max-w-xs">
              <div 
                id="bet-qr-code" 
                className="bg-console-black p-6 shadow-terminal border-1 border-console-blue rounded-lg overflow-hidden relative"
              >
                {/* Add enhanced details around the QR code */}
                <div className="mb-4 text-center">
                  <h4 className="text-[#E5FF03] font-mono text-sm mb-2">SCAN TO ACCEPT BET</h4>
                  {match && (
                    <div className="text-console-white-bright font-mono text-xs">
                      {match.home_team.name} vs {match.away_team.name}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center">
                  <QRCodeSVG 
                    value={shareUrl} 
                    size={200} 
                    level="H"
                    bgColor="#121212"
                    fgColor="#00A4FF"
                    className="rounded-md"
                    imageSettings={{
                      src: '/logo.svg',
                      excavate: true,
                      width: 40,
                      height: 40
                    }}
                  />
                </div>
                
                {/* Display bet amount and team below QR */}
                <div className="mt-4 bg-console-blue/10 p-3 rounded-md border-1 border-console-blue/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-console-white-dim font-mono text-xs">Amount:</span>
                    <span className="text-[#E5FF03] font-mono text-sm font-bold">{bet.amount} ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-console-white-dim font-mono text-xs">Team:</span>
                    <span className="text-[#00A4FF] font-mono text-sm">{teamName}</span>
                  </div>
                  {teamOdds && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-console-white-dim font-mono text-xs">Odds:</span>
                      <span className="text-console-white-bright font-mono text-xs">
                        {formatDecimalOdds(teamOdds)} ({decimalToAmerican(teamOdds)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-console-white-dim font-mono text-xs text-center">
              <div>Scan this QR code to accept the bet</div>
              <div className="text-[#00A4FF] text-xs mt-1">All match details included</div>
            </div>
          </div>
          
          {/* Share URL */}
          <div className="relative">
            <input 
              type="text" 
              value={shareUrl}
              readOnly
              className="w-full bg-console-black/70 border-1 border-console-blue p-3 pr-12 text-console-white-dim font-mono text-xs"
            />
            <button
              onClick={handleCopyUrl}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-console-white hover:text-[#00A4FF] transition-colors"
            >
              {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          
          {/* Actions */}
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={handleDownloadQr}
              className="flex-1 bg-console-gray-dark border-1 border-console-blue p-3 text-console-white font-mono text-sm hover:bg-console-gray transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span>DOWNLOAD QR</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-[#00A4FF]/90 border-1 border-[#00A4FF] p-3 text-white font-mono text-sm hover:shadow-glow transition-all"
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