import React, { useState } from 'react';
import { DollarSign, ChevronRight, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Match } from '../../types';
import { useBetting } from '../../context/BettingContext';
import { useWeb3 } from '../../context/Web3Context';
import LoadingSpinner from '../common/LoadingSpinner';

interface MatchBettingFormProps {
  match: Match;
  onClose: () => void;
}

const MatchBettingForm: React.FC<MatchBettingFormProps> = ({ match, onClose }) => {
  const navigate = useNavigate();
  const { createNewBet } = useBetting();
  const { isConnected } = useWeb3();
  
  const [selectedTeam, setSelectedTeam] = useState<string>(match.home_team.id);
  const [betAmount, setBetAmount] = useState<string>('0.01');
  const [description, setDescription] = useState<string>('');
  const [isCreatingBet, setIsCreatingBet] = useState(false);
  
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
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!match || !selectedTeam || !betAmount) {
      return;
    }
    
    setIsCreatingBet(true);
    try {
      const newBet = await createNewBet(match.id, selectedTeam, betAmount, description);
      if (newBet) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to create bet:', error);
    } finally {
      setIsCreatingBet(false);
    }
  };
  
  return (
    <div className="bg-console-gray-terminal/90 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden flex flex-col">
      {/* Form Header */}
      <div className="bg-[#E5FF03]/90 p-3 text-black flex items-center justify-between">
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
      
      <div className="p-6 bg-console-black/70 backdrop-blur-xs">
        {!isConnected ? (
          <div className="py-8">
            <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-4 text-center max-w-md mx-auto">
              <p className="text-console-white-dim font-mono mb-2">
                WALLET CONNECTION REQUIRED TO PLACE BETS
              </p>
              <p className="text-console-white-muted font-mono text-sm">
                CONNECT WALLET TO CONTINUE
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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
            
            {/* Bet Amount */}
            <div>
              <label htmlFor="betAmount" className="block text-console-white-dim font-mono text-sm mb-2">
                BET_AMOUNT (ETH):
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-console-blue" />
                </div>
                <input
                  type="number"
                  id="betAmount"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0.001"
                  step="0.001"
                  className="pl-10 block w-full bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-3 py-2 text-console-white font-mono focus:outline-none focus:border-console-blue-bright"
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
      <div className="p-4 bg-console-gray/90 backdrop-blur-xs border-t-1 border-console-blue flex justify-between">
        <button
          onClick={onClose}
          className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-4 py-2 text-console-white-dim font-mono hover:text-console-white transition-colors"
        >
          CANCEL
        </button>
        
        <button
          onClick={handleCreateBet}
          disabled={!isConnected || isCreatingBet}
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
              <span>PLACE_BET</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MatchBettingForm; 