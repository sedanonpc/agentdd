import React, { useState } from 'react';
import { X, Clock, CheckCircle, XCircle, Timer, Trophy, DollarSign, Calendar, Users, MessageSquare, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StraightBet, StraightBetStatus } from '../../services/straightBetsService';
import { useMatches } from '../../context/MatchesContext';
import { useStraightBets } from '../../context/StraightBetsContext';
import Modal from '../common/Modal';
import { toast } from 'react-toastify';

interface BetDetailsModalProps {
  bet: StraightBet | null;
  isOpen: boolean;
  onClose: () => void;
}

const BetDetailsModal: React.FC<BetDetailsModalProps> = ({ bet, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { getMatchById } = useMatches();
  const { isCancellingBet } = useStraightBets();
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  
  if (!bet) return null;
  
  const match = getMatchById(bet.matchId);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusDisplay = (status: StraightBetStatus) => {
    switch (status) {
      case StraightBetStatus.OPEN:
        return {
          label: 'OPEN',
          icon: Clock,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          borderColor: 'border-yellow-400/30',
          description: 'Waiting for someone to accept your bet'
        };
      case StraightBetStatus.WAITING_RESULT:
        return {
          label: 'WAITING RESULT',
          icon: Timer,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          borderColor: 'border-blue-400/30',
          description: 'Match is in progress, waiting for final result'
        };
      case StraightBetStatus.COMPLETED:
        return {
          label: 'COMPLETED',
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/30',
          description: 'Bet has been settled'
        };
      case StraightBetStatus.CANCELLED:
        return {
          label: 'CANCELLED',
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/30',
          description: 'Bet was cancelled'
        };
      default:
        return {
          label: String(status).toUpperCase(),
          icon: Clock,
          color: 'text-console-white-dim',
          bgColor: 'bg-console-gray/10',
          borderColor: 'border-console-gray/30',
          description: 'Unknown status'
        };
    }
  };

  const statusInfo = getStatusDisplay(bet.status);
  const StatusIcon = statusInfo.icon;

  const isUserCreator = true; // Since this is from user's bet list
  const userRole = isUserCreator ? 'Creator' : 'Acceptor';
  const userPickId = isUserCreator ? bet.creatorsPickId : bet.acceptorsPickId;
  const opponentPickId = isUserCreator ? bet.acceptorsPickId : bet.creatorsPickId;

  // Helper function to get team/player name from ID
  const getPickName = (pickId: string | undefined): string => {
    if (!pickId) return 'N/A';
    if (!match) return pickId; // Fallback to ID if no match data
    
    // For Sandbox matches, check if it's a player
    if (match.sport_key === 'sandbox_metaverse') {
      if (pickId === match.home_team.id) return match.home_team.name;
      if (pickId === match.away_team.id) return match.away_team.name;
      return pickId; // Fallback
    }
    
    // For NBA matches, check if it's a team
    if (pickId === match.home_team.id) return match.home_team.name;
    if (pickId === match.away_team.id) return match.away_team.name;
    
    return pickId; // Fallback to ID if not found
  };

  const handleViewMatch = () => {
    if (match) {
      onClose();
      navigate(`/matches`);
      // TODO: In the future, we could navigate to a specific match detail page
      // navigate(`/match/${bet.matchId}`);
    }
  };

  return (
    <>
      {/* Main Bet Details Modal */}
      <Modal isOpen={isOpen && !showCancelConfirmation} onClose={onClose}>
        <div className="bg-console-gray-terminal border border-console-blue p-6 max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-console-blue/30">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-[#E5FF03]" />
              <h2 className="text-lg font-display text-console-white uppercase tracking-wider">
                BET DETAILS
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-console-white-dim hover:text-console-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Status and Amount */}
            <div className="bg-console-black/30 p-4 rounded border border-console-blue/30">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 px-3 py-1 rounded ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
                  <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                  <span className={`text-sm font-mono ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                
                <div className="text-right">
                  <div className="text-console-white font-mono text-2xl">
                    {bet.amount} <span className="text-[#E5FF03] text-lg">$DARE</span>
                  </div>
                  <div className="text-console-white-dim text-xs font-mono">
                    {userRole}
                  </div>
                </div>
              </div>
              
              <p className="text-console-white-dim font-mono text-sm">
                {statusInfo.description}
              </p>
            </div>

            {/* Match Information */}
            {match && (
              <div className="bg-console-black/30 p-4 rounded border border-console-blue/30">
                <h3 className="text-console-white font-mono text-sm mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-console-blue" />
                  MATCH DETAILS
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-console-white-dim font-mono text-sm">Match:</span>
                    <span className="text-console-white font-mono text-sm">
                      {match.home_team.name} vs {match.away_team.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-console-white-dim font-mono text-sm">Your Pick:</span>
                    <span className="text-console-white font-mono text-sm">
                      {getPickName(userPickId)}
                    </span>
                  </div>
                  
                  {opponentPickId && (
                    <div className="flex items-center justify-between">
                      <span className="text-console-white-dim font-mono text-sm">Opponent's Pick:</span>
                      <span className="text-console-white font-mono text-sm">
                        {getPickName(opponentPickId)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-console-white-dim font-mono text-sm">Start Time:</span>
                    <span className="text-console-white font-mono text-sm">
                      {formatDate(match.commence_time)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handleViewMatch}
                className="flex-1 bg-console-blue/10 hover:bg-console-blue/20 text-console-blue border border-console-blue/30 py-2 px-4 rounded font-mono text-sm transition-colors"
              >
                View Match
              </button>
              
              {bet.status === StraightBetStatus.OPEN && (
                <button
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-2 px-4 rounded font-mono text-sm transition-colors"
                  disabled={isCancellingBet}
                >
                  Cancel Bet
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BetDetailsModal; 