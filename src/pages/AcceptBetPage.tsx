import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, X, AlertTriangle, Loader2, ShieldCheck, Calendar, Clock, TrendingUp, ArrowUp, ArrowDown, User } from 'lucide-react';
import { useBetting } from '../context/BettingContext';
import { useMatches } from '../context/MatchesContext';
import { useWeb3 } from '../context/Web3Context';
import { useAuth } from '../context/AuthContext';
import { usePoints } from '../context/PointsContext';
import { Bet, BetStatus } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDecimalOdds, decimalToAmerican } from '../utils/oddsUtils';
import { QRCodeSVG } from 'qrcode.react';

const AcceptBetPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { acceptBet } = useBetting();
  const { getMatchById } = useMatches();
  const { account, connectWallet } = useWeb3();
  const { isAuthenticated, loginWithEmail, authMethod } = useAuth();
  const { userBalance, deductPoints, createBetEscrow } = usePoints();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [accepting, setAccepting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginForm, setShowLoginForm] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [processingEscrow, setProcessingEscrow] = useState<boolean>(false);
  const [escrowSuccess, setEscrowSuccess] = useState<boolean>(false);
  
  // Bet details state, extracted from URL
  const [betId, setBetId] = useState<string>('');
  const [creator, setCreator] = useState<string>('');
  const [matchId, setMatchId] = useState<string>('');
  const [teamId, setTeamId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('');
  const [homeTeam, setHomeTeam] = useState<string | undefined>(undefined);
  const [awayTeam, setAwayTeam] = useState<string | undefined>(undefined);
  const [matchTime, setMatchTime] = useState<string | undefined>(undefined);
  const [homeLogo, setHomeLogo] = useState<string | undefined>(undefined);
  const [awayLogo, setAwayLogo] = useState<string | undefined>(undefined);
  const [homeOdds, setHomeOdds] = useState<number | null>(null);
  const [awayOdds, setAwayOdds] = useState<number | null>(null);
  const [betDescription, setBetDescription] = useState<string | undefined>(undefined);
  
  // Extract parameters from URL
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams(location.search);
      const id = params.get('id');
      const creatorParam = params.get('creator');
      const matchIdParam = params.get('match');
      const teamIdParam = params.get('team');
      const amount = params.get('amount');
      
      // Get additional match details from URL if available
      const homeTeamParam = params.get('home_team');
      const awayTeamParam = params.get('away_team');
      const matchTimeParam = params.get('match_time');
      const homeLogoParam = params.get('home_logo');
      const awayLogoParam = params.get('away_logo');
      const homeOddsParam = params.get('home_odds');
      const awayOddsParam = params.get('away_odds');
      const descriptionParam = params.get('description');
      
      if (!id || !creatorParam || !matchIdParam || !teamIdParam || !amount) {
        throw new Error('Missing required bet details');
      }
      
      // Set all the state values individually
      setBetId(id);
      setCreator(creatorParam);
      setMatchId(matchIdParam);
      setTeamId(teamIdParam);
      setBetAmount(amount);
      
      if (homeTeamParam) setHomeTeam(homeTeamParam);
      if (awayTeamParam) setAwayTeam(awayTeamParam);
      if (matchTimeParam) setMatchTime(matchTimeParam);
      if (homeLogoParam) setHomeLogo(homeLogoParam);
      if (awayLogoParam) setAwayLogo(awayLogoParam);
      if (homeOddsParam) setHomeOdds(parseFloat(homeOddsParam));
      if (awayOddsParam) setAwayOdds(parseFloat(awayOddsParam));
      if (descriptionParam) setBetDescription(descriptionParam);
      
    } catch (err) {
      setError('Invalid bet invitation URL');
    } finally {
      setLoading(false);
    }
  }, [location.search]);
  
  // Get match details
  const match = matchId ? getMatchById(matchId) : null;
  
  // Create a derived match object that combines API data with URL data
  const derivedMatch = React.useMemo(() => {
    if (match) {
      // We have full match data from the API
      return match;
    } else if (homeTeam && awayTeam) {
      // Create a minimal match object from URL parameters
      return {
        id: matchId,
        sport_key: 'basketball_nba',
        sport_title: 'NBA',
        commence_time: matchTime || new Date().toISOString(),
        home_team: {
          id: 'home-team-id',
          name: homeTeam,
          logo: homeLogo
        },
        away_team: {
          id: 'away-team-id',
          name: awayTeam,
          logo: awayLogo
        },
        bookmakers: homeOdds && awayOdds ? [
          {
            key: 'embedded',
            title: 'Embedded Odds',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: homeTeam, price: homeOdds },
                  { name: awayTeam, price: awayOdds }
                ]
              }
            ]
          }
        ] : []
      };
    }
    
    return null;
  }, [match, homeTeam, awayTeam, matchId, matchTime, homeLogo, awayLogo, homeOdds, awayOdds]);
  
  // Determine which team was bet on
  const teamName = derivedMatch && teamId ? 
    (teamId === derivedMatch.home_team.id ? derivedMatch.home_team.name : 
     teamId === derivedMatch.away_team.id ? derivedMatch.away_team.name : 
     teamId === 'home-team-id' ? derivedMatch.home_team.name :
     teamId === 'away-team-id' ? derivedMatch.away_team.name :
     homeTeam && teamId === 'home-team-id' ? homeTeam :
     awayTeam && teamId === 'away-team-id' ? awayTeam :
     teamId) 
    : teamId;
    
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
    if (!betId || !isAuthenticated) {
      // If not authenticated, prompt login
      setShowLoginForm(true);
      return;
    }
    
    // Check if user has enough DARE points
    if (userBalance < parseFloat(betAmount)) {
      setError(`Insufficient $DARE points. You need ${betAmount} $DARE points to accept this bet.`);
      return;
    }
    
    setAccepting(true);
    setError(null);
    setProcessingEscrow(true);
    
    try {
      // Create a new bet object
      const bet: Bet = {
        id: betId,
        creator: creator,
        acceptor: account,
        matchId: matchId,
        teamId: teamId,
        amount: parseFloat(betAmount),
        status: BetStatus.ACTIVE,
        timestamp: Date.now(),
        description: "Accepted via shared bet invitation"
      };
      
      // Create escrow for the bet but disable toast notification
      const escrowResult = await createBetEscrow(betId, parseFloat(betAmount), true);
      
      if (!escrowResult) {
        throw new Error("Failed to create escrow");
      }
      
      // Silently deduct DARE points without additional notification
      await deductPoints(parseFloat(betAmount), betId, "Bet acceptance", true);
      
      // Call acceptBet function from BettingContext
      await acceptBet(bet);
      
      // Show success message before redirect (in-page UI)
      setEscrowSuccess(true);
      
      // Navigate to My Bets page after successful acceptance
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Failed to accept bet. Please try again.');
      console.error('Error accepting bet:', err);
    } finally {
      setAccepting(false);
      setProcessingEscrow(false);
    }
  };
  
  // Handle form login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await loginWithEmail(email, password);
      // If login successful, continue with bet acceptance
      handleAcceptBet();
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
      console.error('Error logging in:', err);
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
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 overflow-y-auto">
        {/* Dynamic HUD background elements */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(#00255510_1px,transparent_1px)] bg-[size:8px_8px]"></div>
        <div className="fixed inset-0 z-[-1] bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_right,transparent,rgba(0,102,255,0.05)_10%,rgba(0,102,255,0.05)_90%,transparent)]"></div>
        <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_bottom,transparent,rgba(0,102,255,0.05)_10%,rgba(0,102,255,0.05)_90%,transparent)]"></div>
        
        <div className="border-1 border-console-blue shadow-terminal max-w-md w-full">
          <div className="bg-console-black/95 rounded-sm">
            {/* Banner image at the top */}
            <div className="relative w-full border-b-1 border-console-blue bg-console-blue-bright/80 backdrop-blur-xs overflow-hidden">
              <div className="relative">
                <img 
                  src="https://i.ibb.co/Q7mKsRBc/nba-banner.png"
                  alt="Agent Daredevil - Wanna Bet?" 
                  className="w-full h-auto object-contain mx-auto relative z-0"
                />
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center space-y-4 p-6">
              <Loader2 className="h-12 w-12 text-console-blue animate-spin" />
              <h2 className="text-console-white font-mono text-lg">Loading Bet Details</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !betId) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 overflow-y-auto">
        {/* Dynamic HUD background elements */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(#00255510_1px,transparent_1px)] bg-[size:8px_8px]"></div>
        <div className="fixed inset-0 z-[-1] bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_right,transparent,rgba(0,102,255,0.05)_10%,rgba(0,102,255,0.05)_90%,transparent)]"></div>
        <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_bottom,transparent,rgba(0,102,255,0.05)_10%,rgba(0,102,255,0.05)_90%,transparent)]"></div>
        
        <div className="border-1 border-console-blue shadow-terminal max-w-md w-full">
          <div className="bg-console-black/95 rounded-sm">
            {/* Banner image at the top */}
            <div className="relative w-full border-b-1 border-console-blue bg-console-blue-bright/80 backdrop-blur-xs overflow-hidden">
              <div className="relative">
                <img 
                  src="https://i.ibb.co/Q7mKsRBc/nba-banner.png"
                  alt="Agent Daredevil - Wanna Bet?" 
                  className="w-full h-auto object-contain mx-auto relative z-0"
                />
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center space-y-4 p-6">
              <AlertTriangle className="h-12 w-12 text-red-500" />
              <h2 className="text-console-white font-mono text-lg">Error Loading Bet</h2>
              <p className="text-console-white-dim font-mono text-center">{error || 'Invalid bet invitation'}</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-console-blue border-1 border-console-blue px-6 py-3 text-white font-mono hover:shadow-glow transition-all rounded"
              >
                GO TO DASHBOARD
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 overflow-y-auto">
      {/* Dynamic HUD background elements */}
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(#00255510_1px,transparent_1px)] bg-[size:8px_8px]"></div>
      <div className="fixed inset-0 z-[-1] bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_right,transparent,rgba(0,102,255,0.05)_10%,rgba(0,102,255,0.05)_90%,transparent)]"></div>
      <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_bottom,transparent,rgba(0,102,255,0.05)_10%,rgba(0,102,255,0.05)_90%,transparent)]"></div>
      
      <div className="w-full max-w-md border-1 border-console-blue shadow-terminal my-4 animate-fadeIn overflow-hidden">
        <div className="bg-console-black/95 rounded-sm">
          {/* Banner image at the top */}
          <div className="relative w-full border-b-1 border-console-blue bg-console-blue-bright/80 backdrop-blur-xs overflow-hidden">
            <div className="relative">
              <img 
                src="https://i.ibb.co/Q7mKsRBc/nba-banner.png"
                alt="Agent Daredevil - Wanna Bet?" 
                className="w-full h-auto object-contain mx-auto relative z-0"
              />
            </div>
          </div>
          
          {/* Content without header */}
          <div className="p-3 space-y-3">
            {/* Bet details */}
            <div className="bg-console-black/70 border-1 border-console-blue p-3 rounded">
              <div className="pt-2 pb-3">
                <h3 className="text-[#E5FF03] font-mono text-4xl sm:text-4xl md:text-3xl font-bold text-center tracking-wide leading-tight">
                  YOU'VE BEEN<br className="md:hidden" /> INVITED TO BET!
                </h3>
              </div>
              
              {/* Matchup details at the top */}
              {derivedMatch && (
                <div className="mb-3 bg-console-blue/10 p-2 border-1 border-console-blue/30 rounded">
                  <div className="text-center mb-1">
                    <div className="text-white font-mono text-base font-bold">
                      {derivedMatch.home_team.name} vs {derivedMatch.away_team.name}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-console-white-dim text-xs mt-0.5">
                      <Calendar className="h-3 w-3" /> 
                      <span>{formatDate(derivedMatch.commence_time)}</span>
                      <span className="mx-1">•</span>
                      <Clock className="h-3 w-3" /> 
                      <span>{formatTime(derivedMatch.commence_time)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-center gap-6 mt-1">
                    {homeTeamOdds && (
                      <div className="text-center">
                        <div className="text-console-white-dim text-xs">
                          {derivedMatch.home_team.name}
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
                          {derivedMatch.away_team.name}
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
              
              {/* Condensed betting details */}
              <div className="space-y-2 text-console-white font-mono text-sm">
                {/* Amount with glowing highlight box */}
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium">Amount:</span>
                  <div className="bg-[#E5FF03]/10 px-3 py-1.5 rounded-md border-1 border-[#E5FF03]/70 shadow-[0_0_10px_rgba(229,255,3,0.6)] animate-pulse">
                    <span className="text-[#E5FF03] font-bold text-2xl md:text-3xl">{String(betAmount)} <span className="text-lg md:text-xl">$DARE points</span></span>
                  </div>
                </div>
                
                {/* Team with status indicator - improved formatting */}
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium">Your Opponent's Team:</span>
                  <div className="flex items-center gap-2 max-w-[65%]">
                    {betTeamStatus === 'favorite' && <ArrowDown className="h-3 w-3 text-green-500 shrink-0" />}
                    {betTeamStatus === 'underdog' && <ArrowUp className="h-3 w-3 text-red-500 shrink-0" />}
                    <span className="text-[#00A4FF] font-bold text-right break-normal whitespace-normal">
                      {teamName ? teamName.toLowerCase().replace(/\s+/g, '') : ''}
                    </span>
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
                    <Clock className="h-3 w-3" /> Local time:
                  </span>
                  <span className="text-console-white-bright text-xs">
                    {new Date().toLocaleString()}
                  </span>
                </div>
                
                {/* Creator info */}
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium">Created by:</span>
                  <span className="text-console-white-bright">{`${creator.substring(0, 6)}...${creator.substring(creator.length - 4)}`}</span>
                </div>
                
                {/* Message if exists */}
                {betDescription && (
                  <div className="mt-2 p-2 bg-console-blue/10 border-1 border-console-blue/30 rounded">
                    <div className="text-center">
                      <span className="text-console-white-dim font-medium text-xs block">Message:</span>
                      <div className="text-console-white-bright italic text-sm font-medium">{betDescription}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Warning - more compact */}
            <div className="bg-yellow-500/20 border-1 border-yellow-500 p-2 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-console-white-dim font-mono text-xs">
                  By accepting this bet, you agree to place {betAmount} $DARE points on this match. The funds will be held in escrow until the match is settled.
                </p>
              </div>
            </div>
            
            {/* Actions - more compact */}
            <div className="space-y-2 mt-4">
              {!isAuthenticated ? (
                <>
                  {showLoginForm ? (
                    <div className="bg-console-black/80 p-3 border-1 border-console-blue rounded">
                      <h4 className="text-console-white-bright font-mono mb-3 text-center">LOGIN TO ACCEPT BET</h4>
                      {error && (
                        <div className="bg-red-900/30 border-1 border-red-500 p-2 rounded mb-3">
                          <p className="text-red-400 font-mono text-xs text-center">{error}</p>
                        </div>
                      )}
                      <form onSubmit={handleLogin} className="space-y-3">
                        <div>
                          <label className="text-console-white-dim text-xs mb-1 block">Email:</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-console-black border-1 border-console-blue p-2 text-console-white font-mono rounded"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-console-white-dim text-xs mb-1 block">Password:</label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-console-black border-1 border-console-blue p-2 text-console-white font-mono rounded"
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 bg-[#00A4FF] border-1 border-[#00A4FF] p-2 text-white font-mono font-bold hover:shadow-glow transition-all flex items-center justify-center gap-2 rounded"
                          >
                            <User className="h-4 w-4" />
                            <span>LOGIN</span>
                          </button>
                          <button
                            type="button"
                            onClick={connectWallet}
                            className="flex-1 bg-[#E5FF03]/10 border-1 border-[#E5FF03] p-2 text-[#E5FF03] font-mono font-bold hover:shadow-glow transition-all flex items-center justify-center gap-2 rounded"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>METAMASK</span>
                          </button>
                        </div>
                        <p className="text-console-white-dim text-xs text-center mt-2">
                          Don't have an account? <a href="/register" className="text-[#00A4FF] hover:underline">Register</a>
                        </p>
                      </form>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLoginForm(true)}
                      className="w-full bg-[#00A4FF] border-1 border-[#00A4FF] p-3 text-white font-mono font-bold hover:shadow-glow transition-all flex items-center justify-center gap-2 rounded"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>LOGIN TO CONTINUE</span>
                    </button>
                  )}
                </>
              ) : escrowSuccess ? (
                // Success state
                <div className="bg-green-900/30 border-1 border-green-500 p-4 rounded">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Check className="h-12 w-12 text-green-400 mb-2" />
                    <h3 className="text-green-400 font-mono text-lg font-bold">Bet Accepted!</h3>
                    <p className="text-console-white-dim font-mono text-sm mt-2">
                      {betAmount} $DARE points have been locked in escrow.
                    </p>
                    <p className="text-console-white-dim font-mono text-sm mt-1">
                      Your bet is now active and locked in.
                    </p>
                    <p className="text-console-white-dim font-mono text-sm mt-1">
                      Redirecting to My Bets in 2 seconds...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleAcceptBet}
                    disabled={accepting || processingEscrow}
                    className="w-full bg-[#00A4FF] border-1 border-[#00A4FF] p-3 text-white font-mono font-bold hover:shadow-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded"
                  >
                    {accepting || processingEscrow ? (
                      <>
                        <LoadingSpinner size={4} />
                        <span>{processingEscrow ? "CREATING ESCROW..." : "ACCEPTING BET..."}</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>ACCEPT BET ({betAmount} $DARE)</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => navigate('/dashboard')}
                    disabled={accepting || processingEscrow}
                    className="w-full bg-transparent border-1 border-console-blue p-3 text-console-white font-mono hover:bg-console-gray-dark/30 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded"
                  >
                    <X className="h-4 w-4" />
                    <span>DECLINE</span>
                  </button>
                </div>
              )}
            </div>
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
            <span className="text-[#E5FF03] font-mono text-sm font-bold">{bet.amount} $DARE points</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-console-white-dim font-mono text-xs">Team:</span>
            <span className="text-[#00A4FF] font-mono text-sm">{bet.teamName ? bet.teamName.toLowerCase().replace(/\s+/g, '') : ''}</span>
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