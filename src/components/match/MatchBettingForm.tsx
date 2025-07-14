import React, { useState } from 'react';
import { DollarSign, ChevronRight, X, Zap, Trophy, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Match } from '../../types';
import { useStraightBets } from '../../context/StraightBetsContext';
import { useWeb3 } from '../../context/Web3Context';
import { usePoints } from '../../context/PointsContext';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';

interface MatchBettingFormProps {
  match: Match;
  onClose: () => void;
}

const MatchBettingForm: React.FC<MatchBettingFormProps> = ({ match, onClose }) => {
  const navigate = useNavigate();
  const { createStraightBet, isCreatingBet } = useStraightBets();
  const { isConnected } = useWeb3();
  const { isAuthenticated, authMethod } = useAuth();
  const { userBalance } = usePoints();
  
  const [selectedTeam, setSelectedTeam] = useState<string>(match.home_team.id);
  const [betAmount, setBetAmount] = useState<string>('100');
  const [description, setDescription] = useState<string>('');
  
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
      
      const homeOutcome = h2hMarket.outcomes.find(o => o.name === match.home_team.name);
      const awayOutcome = h2hMarket.outcomes.find(o => o.name === match.away_team.name);
      
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
  
  const handleCreateBet = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in first to place bets');
      return;
    }
    
    if (!match || !selectedTeam || !betAmount) {
      toast.error('Please complete all required fields');
      return;
    }

    // Check if user has enough $DARE points
    const betAmountNumber = parseInt(betAmount);
    if (isNaN(betAmountNumber) || betAmountNumber <= 0) {
      toast.error('Please enter a valid bet amount');
      return;
    }
    
    if (betAmountNumber > userBalance) {
      toast.error('Insufficient $DARE points balance');
      return;
    }
    
    try {
      // Create the straight bet using the new StraightBetsContext
      // The context handles deducting points and showing success/error toasts
      const newBet = await createStraightBet(match.id, selectedTeam, betAmountNumber, description);
      
      if (newBet) {
        // Success! Navigate to dashboard
        navigate('/dashboard');
        onClose(); // Close the modal
      }
    } catch (error) {
      console.error('Failed to create bet:', error);
      // Error handling is done in the context, but we can log it here
    }
  };
  
  return (
    <div className="bg-console-gray-terminal/90 backdrop-blur-xs border-1 border-console-blue shadow-terminal flex flex-col h-full max-h-[90vh] md:max-h-[80vh]">
      {/* Form Header */}
      <div className="bg-[#E5FF03]/90 p-3 text-black flex items-center justify-between flex-shrink-0">
        <div className="font-mono tracking-wide flex items-center">
          <Zap className="h-5 w-5 mr-2" />
          <span className="text-sm font-semibold">CREATE_NEW_BET</span>
          <span className="mx-2">|</span>
          <span className="text-xs opacity-80">{match.home_team.name} vs {match.away_team.name}</span>
        </div>
        <button 
          onClick={onClose} 
          className="text-black hover:text-gray-800 transition-colors"
          aria-label="Close betting form"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-6 bg-console-black/70 backdrop-blur-xs overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {!isAuthenticated ? (
          <div className="py-8">
            <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-4 text-center max-w-md mx-auto">
              <p className="text-console-white-dim font-mono mb-2">
                SIGN IN REQUIRED TO PLACE BETS
              </p>
              <p className="text-console-white-muted font-mono text-sm">
                SIGN IN WITH EMAIL OR CONNECT WALLET TO CONTINUE
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Auth Method Display */}
            {authMethod && (
              <div className="bg-console-blue/10 border border-console-blue px-3 py-2 text-center">
                <p className="text-xs text-console-white-dim font-mono">
                  SIGNED IN VIA: <span className="text-console-blue-bright font-bold">{authMethod.toUpperCase()}</span>
                </p>
              </div>
            )}
            
            {/* Balance Display */}
            <div className="flex items-center justify-between bg-console-gray-terminal/40 p-3 border-1 border-[#E5FF03]">
              <div className="flex items-center">
                <Trophy className="h-5 w-5 text-[#E5FF03] mr-2" />
                <span className="text-console-white font-mono text-sm">YOUR BALANCE:</span>
              </div>
              <div className="text-[#E5FF03] font-mono text-lg">{userBalance} $DARE</div>
            </div>
            
            {/* Team Selection */}
            <div>
              <label className="block text-console-white-dim font-mono text-sm mb-2">
                SELECT_TEAM:
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className={`border-1 p-4 flex flex-col items-center ${
                    selectedTeam === match.home_team.id
                      ? 'bg-console-blue/20 border-console-blue-bright text-console-white'
                      : 'bg-console-black/50 border-console-blue text-console-white-dim hover:text-console-white hover:border-console-blue-dim'
                  }`}
                  onClick={() => setSelectedTeam(match.home_team.id)}
                >
                  <span className="font-mono">{match.home_team.name}</span>
                  {odds.home && (
                    <div className="mt-2 flex flex-col gap-1">
                      <div className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-2 py-1 font-mono text-sm">
                        <span className="text-console-blue-bright">{odds.home}</span>
                        <span className="text-console-white-muted ml-1">(ODDS)</span>
                      </div>
                    </div>
                  )}
                </button>
                
                <button
                  type="button"
                  className={`border-1 p-4 flex flex-col items-center ${
                    selectedTeam === match.away_team.id
                      ? 'bg-console-blue/20 border-console-blue-bright text-console-white'
                      : 'bg-console-black/50 border-console-blue text-console-white-dim hover:text-console-white hover:border-console-blue-dim'
                  }`}
                  onClick={() => setSelectedTeam(match.away_team.id)}
                >
                  <span className="font-mono">{match.away_team.name}</span>
                  {odds.away && (
                    <div className="mt-2 flex flex-col gap-1">
                      <div className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-2 py-1 font-mono text-sm">
                        <span className="text-console-blue-bright">{odds.away}</span>
                        <span className="text-console-white-muted ml-1">(ODDS)</span>
                      </div>
                    </div>
                  )}
                </button>
              </div>
            </div>
            
            {/* $DARE Points Bet Amount */}
            <div>
              <label htmlFor="betAmount" className="block text-console-white-dim font-mono text-sm mb-2">
                BET_AMOUNT ($DARE POINTS):
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Trophy className="h-5 w-5 text-[#E5FF03]" />
                </div>
                <input
                  type="number"
                  id="betAmount"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="10"
                  step="10"
                  className="pl-10 block w-full bg-console-black/70 backdrop-blur-xs border-1 border-[#E5FF03] px-3 py-2 text-console-white font-mono focus:outline-none focus:border-[#E5FF03]"
                />
              </div>
              <div className="mt-1 flex justify-between text-xs font-mono">
                <span className="text-console-white-dim">MIN: 10 $DARE</span>
                <span className={parseInt(betAmount) > userBalance ? 'text-red-500' : 'text-[#E5FF03]'}>
                  {parseInt(betAmount) > userBalance ? 'INSUFFICIENT BALANCE' : 'AVAILABLE: ' + userBalance + ' $DARE'}
                </span>
              </div>
            </div>
            
            {/* ETH Bet Amount (Disabled) */}
            <div>
              <label htmlFor="ethAmount" className="block text-console-white-dim font-mono text-sm mb-2 flex items-center">
                BET WITH CRYPTO:
                <span className="ml-2 bg-gray-800 text-yellow-400 text-xs px-2 py-0.5 rounded">COMING SOON</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  id="ethAmount"
                  disabled
                  placeholder="COMING SOON"
                  className="pl-10 block w-full bg-console-black/40 backdrop-blur-xs border-1 border-gray-700 px-3 py-2 text-gray-500 font-mono cursor-not-allowed"
                />
              </div>
            </div>
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-console-white-dim font-mono text-sm mb-2">
                DESCRIPTION (OPTIONAL):
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="ADD_TRASH_TALK..."
                className="block w-full bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-3 py-2 text-console-white font-mono focus:outline-none focus:border-console-blue-bright"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="bg-console-gray-terminal/50 backdrop-blur-xs p-4 flex justify-between flex-shrink-0 border-t border-console-blue">
        <button
          onClick={onClose}
          className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-4 py-2 text-console-white-dim font-mono hover:text-console-white transition-colors"
        >
          CANCEL
        </button>
        
        <button
          onClick={handleCreateBet}
          disabled={!isAuthenticated || isCreatingBet || parseInt(betAmount) > userBalance}
          className="bg-[#E5FF03]/90 backdrop-blur-xs border-1 border-[#E5FF03] px-4 py-2 text-black font-mono hover:shadow-button transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isCreatingBet ? (
            <>
              <LoadingSpinner size={4} />
              <span>PROCESSING...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>PLACE_BET WITH $DARE</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MatchBettingForm; 