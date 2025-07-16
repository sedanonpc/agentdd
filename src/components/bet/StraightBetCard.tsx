import React, { useState } from 'react';
import { MatchWithDetails } from '../../types/match';
import { useAuth } from '../../context/AuthContext';
import { usePoints } from '../../context/PointsContext';
import { useBets } from '../../context/BetsContext';
import Modal from '../common/Modal';

interface StraightBetCardProps {
  bet: any; // Replace 'any' with the correct StraightBet type if available
  matchWithDetails: MatchWithDetails | null;
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
  const { acceptBet } = useBets();
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Determine if Accept button should be shown - use auth.users.id for comparison
  const isCreator = user && bet.creatorAuthId === user.id;
  const isOpen = bet.status === 'open';
  const canAccept = user && !isCreator && isOpen;

  // Auto-determine the acceptor's pick based on match details
  const getAcceptorsPick = (): string => {
    if (!matchWithDetails) return '';
    
    if (matchWithDetails.event_type === 'basketball_nba') {
      // For NBA, the acceptor picks the opposite team of what the creator picked
      const creatorPick = bet.creatorsPickId;
      const homeTeamId = matchWithDetails.details.home_team_id;
      const awayTeamId = matchWithDetails.details.away_team_id;
      
      if (creatorPick === homeTeamId) {
        return awayTeamId;
      } else if (creatorPick === awayTeamId) {
        return homeTeamId;
      }
      // If creator's pick doesn't match either team, default to away team
      return awayTeamId;
    } else if (matchWithDetails.event_type === 'sandbox_metaverse') {
      // For Sandbox, the acceptor picks the opposite player of what the creator picked
      const creatorPick = bet.creatorsPickId;
      const player1Id = matchWithDetails.details.player1_id;
      const player2Id = matchWithDetails.details.player2_id;
      
      if (creatorPick === player1Id) {
        return player2Id;
      } else if (creatorPick === player2Id) {
        return player1Id;
      }
      // If creator's pick doesn't match either player, default to player2
      return player2Id;
    }
    
    return '';
  };

  // Get pick names for display
  const getPickNames = () => {
    if (!matchWithDetails) return { creatorPick: 'Unknown', acceptorPick: 'Unknown' };
    
    if (matchWithDetails.event_type === 'basketball_nba') {
      const creatorPick = bet.creatorsPickId;
      const homeTeamId = matchWithDetails.details.home_team_id;
      const awayTeamId = matchWithDetails.details.away_team_id;
      const homeTeamName = matchWithDetails.details.home_team_name;
      const awayTeamName = matchWithDetails.details.away_team_name;
      
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
    } else if (matchWithDetails.event_type === 'sandbox_metaverse') {
      const creatorPick = bet.creatorsPickId;
      const player1Id = matchWithDetails.details.player1_id;
      const player2Id = matchWithDetails.details.player2_id;
      const player1Name = matchWithDetails.details.player1_name;
      const player2Name = matchWithDetails.details.player2_name;
      
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

  // Get display information for the match
  const getMatchDisplayInfo = () => {
    if (!matchWithDetails) return { sport: 'Unknown Sport', teams: 'Match details unavailable' };
    
    if (matchWithDetails.event_type === 'basketball_nba') {
      const homeTeam = matchWithDetails.details.home_team_name;
      const awayTeam = matchWithDetails.details.away_team_name;
      return {
        sport: SPORT_LABELS[matchWithDetails.match.event_type] || matchWithDetails.match.event_type,
        teams: `${homeTeam} vs ${awayTeam}`
      };
    } else if (matchWithDetails.event_type === 'sandbox_metaverse') {
      const player1 = matchWithDetails.details.player1_name;
      const player2 = matchWithDetails.details.player2_name;
      return {
        sport: SPORT_LABELS[matchWithDetails.match.event_type] || matchWithDetails.match.event_type,
        teams: `${player1} vs ${player2}`
      };
    }
    
    return { sport: 'Unknown Sport', teams: 'Match details unavailable' };
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
        Created by: <span className="text-console-white">{bet.creatorName || 'Unknown'}</span>
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
              <div>Creator: <span className="text-console-white">{bet.creatorName || 'Unknown'}</span></div>
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