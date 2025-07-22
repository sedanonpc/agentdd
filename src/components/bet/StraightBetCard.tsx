import React, { useState } from 'react';
import { MatchWithDetails } from '../../types/match';
import { useAuth } from '../../context/AuthContext';
import { usePoints } from '../../context/PointsContext';
import { useStraightBets } from '../../context/StraightBetsContext';
import Modal from '../common/Modal';

interface StraightBetCardProps {
  bet: any; // Replace 'any' with the correct StraightBet type if available
  matchWithDetails: {
    id: string;
    eventType: string;
    details: any;
  } | null;
  status?: string;
}

const SPORT_LABELS: Record<string, string> = {
  basketball_nba: 'NBA',
  sandbox_metaverse: 'Sandbox Metaverse',
  // Add more as needed
};

const StraightBetCard: React.FC<StraightBetCardProps> = ({ bet, matchWithDetails, status }) => {
  const { user } = useAuth();
  const { userBalance } = usePoints();
  const { acceptBet } = useStraightBets();
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Debug logging
  console.log('🎯 StraightBetCard render:', {
    betId: bet?.id,
    creatorUsername: bet?.creatorUsername,
    matchWithDetails: !!matchWithDetails,
    eventType: matchWithDetails?.eventType,
    detailsAvailable: !!matchWithDetails?.details
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Determine if Accept button should be shown - use auth.users.id for comparison
  const isCreator = user && bet.creatorUserId === user.userId;
  const isOpen = bet.status === 'open';
  const canAccept = user && !isCreator && isOpen && userBalance >= bet.amount;

  // Get display information for the match
  const getMatchDisplayInfo = () => {
    if (!matchWithDetails) {
      return { sport: 'No Match Data', teams: 'Match details unavailable' };
    }
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const { homeTeamName, awayTeamName } = matchWithDetails.details;
      return {
        sport: SPORT_LABELS[matchWithDetails.eventType] || matchWithDetails.eventType,
        teams: `${homeTeamName} vs ${awayTeamName}`
      };
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const { player1Name, player2Name } = matchWithDetails.details;
      return {
        sport: SPORT_LABELS[matchWithDetails.eventType] || matchWithDetails.eventType,
        teams: `${player1Name} vs ${player2Name}`
      };
    }
    
    return { 
      sport: matchWithDetails.eventType || 'Unknown Event Type',
      teams: 'Match details unavailable'
    };
  };

  // Get pick names for display
  const getPickNames = () => {
    if (!matchWithDetails) return { creatorPick: 'Unknown', acceptorPick: 'Unknown' };
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const { homeTeamId, awayTeamId, homeTeamName, awayTeamName } = matchWithDetails.details;
      const creatorPick = bet.creatorsPickId;
      
      let creatorPickName = 'Unknown';
      let acceptorPickName = 'Unknown';
      
      if (creatorPick === homeTeamId) {
        creatorPickName = homeTeamName;
        acceptorPickName = awayTeamName;
      } else if (creatorPick === awayTeamId) {
        creatorPickName = awayTeamName;
        acceptorPickName = homeTeamName;
      }
      
      return { creatorPick: creatorPickName, acceptorPick: acceptorPickName };
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const { player1Id, player2Id, player1Name, player2Name } = matchWithDetails.details;
      const creatorPick = bet.creatorsPickId;
      
      let creatorPickName = 'Unknown';
      let acceptorPickName = 'Unknown';
      
      if (creatorPick === player1Id) {
        creatorPickName = player1Name;
        acceptorPickName = player2Name;
      } else if (creatorPick === player2Id) {
        creatorPickName = player2Name;
        acceptorPickName = player1Name;
      }
      
      return { creatorPick: creatorPickName, acceptorPick: acceptorPickName };
    }
    
    return { creatorPick: 'Unknown', acceptorPick: 'Unknown' };
  };

  // Auto-determine the acceptor's pick based on match details
  const getAcceptorsPick = (): string => {
    if (!matchWithDetails) return '';
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const creatorPick = bet.creatorsPickId;
      const { homeTeamId, awayTeamId } = matchWithDetails.details;
      
      if (creatorPick === homeTeamId) {
        return awayTeamId;
      } else if (creatorPick === awayTeamId) {
        return homeTeamId;
      }
      return awayTeamId;
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const creatorPick = bet.creatorsPickId;
      const { player1Id, player2Id } = matchWithDetails.details;
      
      if (creatorPick === player1Id) {
        return player2Id;
      } else if (creatorPick === player2Id) {
        return player1Id;
      }
      return player2Id;
    }
    
    return '';
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    setSuccess(false);
    
    const acceptorsPickId = getAcceptorsPick();
    if (!acceptorsPickId) {
      setError('Unable to determine your pick automatically. Please try again.');
      setAccepting(false);
      return;
    }
    
    try {
      const ok = await acceptBet(bet.id, acceptorsPickId);
      if (ok) {
        setSuccess(true);
        setShowAcceptModal(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to accept bet');
    } finally {
      setAccepting(false);
    }
  };

  const matchInfo = getMatchDisplayInfo();
  const pickNames = getPickNames();

  return (
    <div className="bg-console-gray-terminal/80 border border-console-blue shadow-terminal rounded-lg p-4 flex flex-col gap-2 relative">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono text-console-white-dim uppercase">
          {matchInfo.sport}
        </span>
        <span className="text-xs font-mono text-console-white-dim">{formatDate(bet.createdAt)}</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="text-lg font-display text-console-white mb-1">Bet Amount: <span className="text-[#E5FF03]">{bet.amount}</span></div>
        </div>
      </div>
      <div className="text-sm font-mono text-console-white-dim">
        {matchInfo.teams}
      </div>
      <div className="text-sm font-mono text-console-white-dim">
        Created by: <span className="text-console-white">{bet.creatorUsername || 'Unknown'}</span>
      </div>
      {bet.creatorsNote && (
        <div className="text-xs font-mono text-console-white-dim mt-2 italic">"{bet.creatorsNote}"</div>
      )}
      {!matchWithDetails && (
        <div className="text-xs font-mono text-console-red-400 mt-2">Match details unavailable.</div>
      )}
      {/* Accept button */}
      {canAccept && (
        <button
          className="mt-3 px-4 py-2 bg-console-blue-bright text-console-black font-mono rounded shadow hover:bg-console-blue transition-colors text-xs"
          onClick={() => setShowAcceptModal(true)}
          disabled={accepting || userBalance < bet.amount}
        >
          {userBalance < bet.amount ? 'Insufficient Points' : 'Accept Bet'}
        </button>
      )}
      {/* Accept Modal */}
      {showAcceptModal && (
        <Modal isOpen={showAcceptModal} onClose={() => setShowAcceptModal(false)}>
          <div className="bg-console-gray-terminal border border-console-blue p-6 max-w-md w-full">
            <h2 className="text-lg font-display text-console-white mb-4">Accept Bet</h2>
            <div className="mb-4 text-console-white font-mono text-sm space-y-2">
              <div>Amount: <span className="text-[#E5FF03]">{bet.amount} $DARE</span></div>
              <div>Your Points: <span className="text-[#E5FF03]">{userBalance}</span></div>
              <div>Match: {matchInfo.teams}</div>
              <div>Creator: <span className="text-console-white">{bet.creatorUsername || 'Unknown'}</span></div>
              <div>Creator's Pick: <span className="text-[#E5FF03]">{pickNames.creatorPick}</span></div>
            </div>
            
            {/* Prominent Your Pick section */}
            <div className="mb-4 p-3 bg-console-blue/20 border border-console-blue rounded">
              <div className="text-sm font-mono text-console-white mb-1">Your Pick:</div>
              <div className="text-lg font-display text-[#E5FF03] mb-2">{pickNames.acceptorPick}</div>
              <div className="text-xs font-mono text-console-white-dim">
                You will automatically pick the opposite team/player of what the creator picked.
              </div>
            </div>
            
            {error && <div className="text-red-400 font-mono text-xs mb-2">{error}</div>}
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-console-gray/20 text-console-white-dim font-mono rounded border border-console-blue/30 hover:bg-console-gray/40"
                onClick={() => setShowAcceptModal(false)}
                disabled={accepting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-console-blue-bright text-console-black font-mono rounded shadow hover:bg-console-blue transition-colors text-xs disabled:opacity-50"
                onClick={handleAccept}
                disabled={accepting || userBalance < bet.amount}
              >
                {accepting ? 'Accepting...' : 'Confirm Accept'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StraightBetCard; 