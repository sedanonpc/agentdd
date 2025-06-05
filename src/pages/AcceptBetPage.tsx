import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, X, AlertTriangle, Loader2, ShieldCheck, Calendar, Clock, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useBetting } from '../context/BettingContext';
import { useWeb3 } from '../context/Web3Context';
import { Bet, BetStatus } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDecimalOdds, decimalToAmerican } from '../utils/oddsUtils';
import { QRCodeSVG } from 'qrcode.react';

const AcceptBetPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getMatchById, acceptBet } = useBetting();
  const { account, connectWallet } = useWeb3();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [accepting, setAccepting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [betDetails, setBetDetails] = useState<{
    id: string;
    creator: string;
    matchId: string;
    teamId: string;
    amount: string;
    homeTeam?: string;
    awayTeam?: string;
    matchTime?: string;
    homeLogo?: string;
    awayLogo?: string;
    homeOdds?: number | null;
    awayOdds?: number | null;
    description?: string;
  } | null>(null);
  
  // Extract parameters from URL
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams(location.search);
      const id = params.get('id');
      const creator = params.get('creator');
      const matchId = params.get('match');
      const teamId = params.get('team');
      const amount = params.get('amount');
      
      // Get additional match details from URL if available
      const homeTeam = params.get('home_team') || undefined;
      const awayTeam = params.get('away_team') || undefined;
      const matchTime = params.get('match_time') || undefined;
      const homeLogo = params.get('home_logo') || undefined;
      const awayLogo = params.get('away_logo') || undefined;
      const homeOdds = params.get('home_odds');
      const awayOdds = params.get('away_odds');
      const description = params.get('description') || undefined;
      
      if (!id || !creator || !matchId || !teamId || !amount) {
        throw new Error('Missing required bet details');
      }
      
      setBetDetails({
        id,
        creator,
        matchId,
        teamId,
        amount,
        // Store additional details
        homeTeam,
        awayTeam,
        matchTime,
        homeLogo,
        awayLogo,
        homeOdds: homeOdds ? parseFloat(homeOdds) : null,
        awayOdds: awayOdds ? parseFloat(awayOdds) : null,
        description
      });
      
    } catch (err) {
      setError('Invalid bet invitation URL');
    } finally {
      setLoading(false);
    }
  }, [location.search]);
  
  // Get match details
  const match = betDetails ? getMatchById(betDetails.matchId) : null;
  
  // Create a derived match object that combines API data with URL data
  const derivedMatch = React.useMemo(() => {
    if (match) {
      // We have full match data from the API
      return match;
    } else if (betDetails?.homeTeam && betDetails?.awayTeam) {
      // Create a minimal match object from URL parameters
      return {
        id: betDetails.matchId,
        sport_key: 'basketball_nba',
        sport_title: 'NBA',
        commence_time: betDetails.matchTime || new Date().toISOString(),
        home_team: {
          id: 'home-team-id',
          name: betDetails.homeTeam,
          logo: betDetails.homeLogo
        },
        away_team: {
          id: 'away-team-id',
          name: betDetails.awayTeam,
          logo: betDetails.awayLogo
        },
        bookmakers: betDetails.homeOdds && betDetails.awayOdds ? [
          {
            key: 'embedded',
            title: 'Embedded Odds',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: betDetails.homeTeam, price: betDetails.homeOdds },
                  { name: betDetails.awayTeam, price: betDetails.awayOdds }
                ]
              }
            ]
          }
        ] : []
      };
    }
    
    return null;
  }, [match, betDetails]);
  
  // Use derivedMatch throughout the component instead of just 'match'
  
  // Determine which team was bet on
  const teamName = derivedMatch && betDetails ? 
    (betDetails.teamId === derivedMatch.home_team.id ? derivedMatch.home_team.name : 
     betDetails.teamId === derivedMatch.away_team.id ? derivedMatch.away_team.name : 
     betDetails.teamId === 'home-team-id' ? derivedMatch.home_team.name :
     betDetails.teamId === 'away-team-id' ? derivedMatch.away_team.name :
     betDetails.homeTeam && betDetails.teamId === 'home-team-id' ? betDetails.homeTeam :
     betDetails.awayTeam && betDetails.teamId === 'away-team-id' ? betDetails.awayTeam :
     betDetails.teamId) 
    : betDetails?.teamId;
    
  // Get odds for a team from match bookmakers
  const getTeamOdds = (teamName: string) => {
    if (!derivedMatch || !derivedMatch.bookmakers || derivedMatch.bookmakers.length === 0) {
      return null;
    }
    
    // Try to find odds from the first available bookmaker
    const bookmaker = derivedMatch.bookmakers[0];
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
  
  // Calculate potential winnings based on bet amount and odds
  const calculatePotentialWinnings = (amount: string, odds: number | null): string => {
    if (!odds) return 'N/A';
    
    const betAmount = parseFloat(amount);
    if (isNaN(betAmount)) return 'N/A';
    
    // Decimal odds: potential winnings = stake * odds - stake
    const winnings = (betAmount * odds) - betAmount;
    return winnings.toFixed(4);
  };
  
  // Get team odds info
  const teamOdds = derivedMatch && teamName ? getTeamOdds(teamName) : null;
  const homeTeamOdds = derivedMatch ? getTeamOdds(derivedMatch.home_team.name) : null;
  const awayTeamOdds = derivedMatch ? getTeamOdds(derivedMatch.away_team.name) : null;
  const oddsTrend = getOddsTrend(homeTeamOdds, awayTeamOdds);
  
  // Determine if the bet's team is favorite or underdog
  const betTeamStatus = 
    derivedMatch && oddsTrend && teamName === derivedMatch.home_team.name ? oddsTrend.home :
    derivedMatch && oddsTrend && teamName === derivedMatch.away_team.name ? oddsTrend.away :
    null;
  
  // Handle accepting the bet
  const handleAcceptBet = async () => {
    if (!betDetails || !account) return;
    
    setAccepting(true);
    setError(null);
    
    try {
      // Create a bet object based on the current Bet type structure
      const bet: Bet = {
        id: betDetails.id,
        creator: betDetails.creator,
        acceptor: account,
        matchId: betDetails.matchId,
        teamId: betDetails.teamId,
        amount: betDetails.amount,
        status: BetStatus.ACTIVE,
        timestamp: Date.now(),
        description: betDetails.description || "Accepted via shared bet invitation"
      };
      
      // Call acceptBet function from BettingContext
      await acceptBet(bet);
      
      // Navigate to My Bets page after successful acceptance
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to accept bet. Please try again.');
      console.error('Error accepting bet:', err);
    } finally {
      setAccepting(false);
    }
  };
  
  // Connect wallet if not connected
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      setError('Failed to connect wallet. Please try again.');
      console.error('Error connecting wallet:', err);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-console-black flex items-center justify-center p-4">
        <div className="bg-console-gray-terminal border-1 border-console-blue shadow-terminal p-6 max-w-md w-full">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 text-console-blue animate-spin" />
            <h2 className="text-console-white font-mono text-lg">Loading Bet Details</h2>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !betDetails) {
    return (
      <div className="min-h-screen bg-console-black flex items-center justify-center p-4">
        <div className="bg-console-gray-terminal border-1 border-console-blue shadow-terminal p-6 max-w-md w-full">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <h2 className="text-console-white font-mono text-lg">Error Loading Bet</h2>
            <p className="text-console-white-dim font-mono text-center">{error || 'Invalid bet invitation'}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-console-blue border-1 border-console-blue px-6 py-3 text-white font-mono hover:shadow-glow transition-all"
            >
              GO TO DASHBOARD
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-console-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-console-gray-terminal border-1 border-console-blue shadow-terminal animate-fadeIn">
        {/* Header */}
        <div className="bg-console-blue/90 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-white" />
            <h2 className="text-white font-mono text-base">BET INVITATION</h2>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Bet details */}
          <div className="bg-console-black/80 border-1 border-console-blue p-6">
            <h3 className="text-[#E5FF03] font-mono text-4xl mb-8 text-center tracking-wider">YOU'VE BEEN INVITED TO BET!</h3>
            
            <div className="space-y-5 text-console-white font-mono">
              <div className="flex justify-between items-center">
                <span className="text-console-white-dim">Amount:</span>
                <span className="text-[#E5FF03] font-bold">{betDetails.amount} ETH</span>
              </div>
              
              {derivedMatch && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-console-white-dim">Match:</span>
                    <span className="text-console-white-bright">{derivedMatch.home_team.name} vs {derivedMatch.away_team.name}</span>
                  </div>
                  
                  {/* Add match date and time */}
                  <div className="flex justify-between items-center">
                    <span className="text-console-white-dim flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Date:
                    </span>
                    <span className="text-console-white-bright">{formatDate(derivedMatch.commence_time)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-console-white-dim flex items-center gap-1">
                      <Clock className="h-4 w-4" /> Time:
                    </span>
                    <span className="text-console-white-bright">{formatTime(derivedMatch.commence_time)}</span>
                  </div>
                </>
              )}
              
              {/* Team with status indicator */}
              <div className="flex justify-between items-center">
                <span className="text-console-white-dim">Team:</span>
                <div className="flex items-center gap-2">
                  {betTeamStatus === 'favorite' && (
                    <span className="px-2 py-0.5 text-xs bg-green-900/30 text-green-400 rounded-sm">FAVORITE</span>
                  )}
                  {betTeamStatus === 'underdog' && (
                    <span className="px-2 py-0.5 text-xs bg-red-900/30 text-red-400 rounded-sm">UNDERDOG</span>
                  )}
                  <span className="text-[#00A4FF]">{teamName}</span>
                </div>
              </div>
              
              {/* Add odds details in a specific highlighted section */}
              {teamOdds && (
                <div className="bg-console-black border-1 border-console-blue p-4 rounded-md mt-6">
                  <div className="flex justify-between items-center mb-3 border-b border-console-blue/30 pb-3">
                    <span className="text-console-white-dim flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#00A4FF]" /> 
                      <span>Odds:</span>
                    </span>
                    <div className={`px-3 py-1 rounded font-bold ${
                      betTeamStatus === 'favorite' ? 'bg-green-900/30 text-green-400' : 
                      betTeamStatus === 'underdog' ? 'bg-red-900/30 text-red-400' : 
                      'bg-console-blue/20 text-[#00A4FF]'
                    }`}>
                      {formatDecimalOdds(teamOdds)} ({decimalToAmerican(teamOdds)})
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-console-white-dim">Potential Win:</span>
                    <span className="text-green-500 font-bold">+{calculatePotentialWinnings(betDetails.amount, teamOdds)} ETH</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center border-t border-console-blue/50 pt-3 mt-3">
                <span className="text-console-white-dim">Created by:</span>
                <span className="text-console-white-bright">{`${betDetails.creator.substring(0, 6)}...${betDetails.creator.substring(betDetails.creator.length - 4)}`}</span>
              </div>
            </div>
          </div>
          
          {/* Warning */}
          <div className="bg-yellow-500/20 border-1 border-yellow-500 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-console-white-dim font-mono text-sm">
                By accepting this bet, you agree to place {betDetails.amount} ETH on this match. The funds will be held in escrow until the match is settled.
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="space-y-4">
            {!account ? (
              <button
                onClick={handleConnectWallet}
                className="w-full bg-console-blue border-1 border-console-blue p-4 text-white font-mono hover:shadow-glow transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-5 w-5" />
                <span>CONNECT WALLET TO CONTINUE</span>
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleAcceptBet}
                  disabled={accepting}
                  className="w-full bg-[#00A4FF] border-1 border-[#00A4FF] p-4 text-white font-mono hover:shadow-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {accepting ? (
                    <>
                      <LoadingSpinner size={5} />
                      <span>ACCEPTING BET...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>ACCEPT BET</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => navigate('/dashboard')}
                  disabled={accepting}
                  className="w-full bg-console-gray-dark border-1 border-console-blue p-4 text-console-white font-mono hover:bg-console-gray transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <X className="h-5 w-5" />
                  <span>DECLINE</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const QrCodeDarkMode = ({ url, match, bet }: { 
  url: string; 
  match?: any; 
  bet?: { 
    amount: string; 
    teamId: string;
    teamName?: string;
    odds?: number | null;
  }; 
}) => (
  <div className="w-full max-w-xs mx-auto">
    <div className="bg-console-black p-6 shadow-terminal border-1 border-console-blue rounded-lg overflow-hidden relative">
      {/* Add enhanced details around the QR code */}
      <div className="mb-4 text-center">
        <h4 className="text-[#E5FF03] font-mono text-sm mb-2">SCAN TO ACCEPT BET</h4>
        {match && (
          <div className="text-console-white-bright font-mono text-xs">
            {match.home_team?.name} vs {match.away_team?.name}
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <QRCodeSVG 
          value={url} 
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
      {bet && (
        <div className="mt-4 bg-console-blue/10 p-3 rounded-md border-1 border-console-blue/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-console-white-dim font-mono text-xs">Amount:</span>
            <span className="text-[#E5FF03] font-mono text-sm font-bold">{bet.amount} ETH</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-console-white-dim font-mono text-xs">Team:</span>
            <span className="text-[#00A4FF] font-mono text-sm">{bet.teamName}</span>
          </div>
          {bet.odds && (
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-console-blue/30">
              <span className="text-console-white-dim font-mono text-xs">Odds:</span>
              <span className="text-console-white-bright font-mono text-xs">
                {formatDecimalOdds(bet.odds)} ({decimalToAmerican(bet.odds)})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

export default AcceptBetPage; 