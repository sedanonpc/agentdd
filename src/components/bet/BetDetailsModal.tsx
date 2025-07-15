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
  const { cancelStraightBet, isCancellingBet } = useStraightBets();
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

  const handleCancelBet = async () => {
    if (!bet) return;
    
    try {
      const success = await cancelStraightBet(bet.id);
      if (success) {
        toast.success('Bet cancelled successfully');
        setShowCancelConfirmation(false);
        onClose();
      } else {
        toast.error('Failed to cancel bet');
      }
    } catch (error) {
      console.error('Error cancelling bet:', error);
      toast.error('Error cancelling bet');
    }
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
                    <span className="text-console-white-dim font-mono text-sm">Sport:</span>
                    <span className="text-console-white font-mono text-sm">
                      {match.sport_key === 'sandbox_metaverse' ? 'The Sandbox Metaverse' : 'NBA Basketball'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-console-white-dim font-mono text-sm">Scheduled:</span>
                    <span className="text-console-white font-mono text-sm">
                      {formatDate(match.commence_time)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bet Details */}
            <div className="bg-console-black/30 p-4 rounded border border-console-blue/30">
              <h3 className="text-console-white font-mono text-sm mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-console-blue" />
                BET DETAILS
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-console-white-dim font-mono text-sm">Your Pick:</span>
                  <span className="text-console-white font-mono text-sm">
                    {getPickName(userPickId)}
                  </span>
                </div>
                
                {opponentPickId && (
                  <div className="flex items-center justify-between">
                    <span className="text-console-white-dim font-mono text-sm">Opponent Pick:</span>
                    <span className="text-console-white font-mono text-sm">
                      {getPickName(opponentPickId)}
                    </span>
                  </div>
                )}
                
                {bet.creatorsNote && (
                  <div className="flex items-start justify-between">
                    <span className="text-console-white-dim font-mono text-sm">Note:</span>
                    <span className="text-console-white font-mono text-sm text-right max-w-[300px] break-words">
                      {bet.creatorsNote}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-console-black/30 p-4 rounded border border-console-blue/30">
              <h3 className="text-console-white font-mono text-sm mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-console-blue" />
                TIMELINE
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-console-white-dim font-mono text-sm">Created:</span>
                  <span className="text-console-white-dim font-mono text-sm">
                    {formatDate(bet.createdAt)}
                  </span>
                </div>
                
                {bet.acceptedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-console-white-dim font-mono text-sm">Accepted:</span>
                    <span className="text-console-white-dim font-mono text-sm">
                      {formatDate(bet.acceptedAt)}
                    </span>
                  </div>
                )}
                
                {bet.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-console-white-dim font-mono text-sm">Completed:</span>
                    <span className="text-console-white-dim font-mono text-sm">
                      {formatDate(bet.completedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Result (if completed) */}
            {bet.status === StraightBetStatus.COMPLETED && bet.winnerUserId && (
              <div className="bg-console-black/30 p-4 rounded border border-console-blue/30">
                <h3 className="text-console-white font-mono text-sm mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#E5FF03]" />
                  RESULT
                </h3>
                
                <div className="flex items-center justify-between">
                  <span className="text-console-white-dim font-mono text-sm">Outcome:</span>
                  <span className={`font-mono text-sm ${bet.winnerUserId === bet.creatorId ? 'text-green-400' : 'text-red-400'}`}>
                    {bet.winnerUserId === bet.creatorId ? 'YOU WON!' : 'YOU LOST'}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-console-blue/30">
              <button
                onClick={onClose}
                className="bg-console-gray/20 hover:bg-console-gray/30 text-console-white-dim font-mono text-sm py-2 px-4 border border-console-gray/50 hover:border-console-gray transition-colors"
              >
                CLOSE
              </button>
              
              {bet.status === StraightBetStatus.OPEN && (
                <button
                  onClick={() => setShowCancelConfirmation(true)}
                  disabled={isCancellingBet}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-mono text-sm py-2 px-4 border border-red-500/50 hover:border-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  CANCEL BET
                </button>
              )}
              
              {bet.status === StraightBetStatus.WAITING_RESULT && match && (
                <button
                  onClick={handleViewMatch}
                  className="bg-console-blue/20 hover:bg-console-blue/30 text-console-white font-mono text-sm py-2 px-4 border border-console-blue/50 hover:border-console-blue transition-colors"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  VIEW MATCH
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal isOpen={showCancelConfirmation} onClose={() => setShowCancelConfirmation(false)}>
        <div className="bg-console-gray-terminal border border-console-blue p-6 max-w-md w-full">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-console-blue/30">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <h2 className="text-lg font-display text-console-white uppercase tracking-wider">
              CONFIRM CANCELLATION
            </h2>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-console-white-dim font-mono text-sm mb-4">
              Are you sure you want to cancel this bet? This action cannot be undone.
            </p>
            
            <div className="bg-console-black/30 p-4 rounded border border-console-blue/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-console-white-dim font-mono text-sm">Bet Amount:</span>
                <span className="text-console-white font-mono text-sm">
                  {bet.amount} <span className="text-[#E5FF03]">$DARE</span>
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-console-white-dim font-mono text-sm">Your Pick:</span>
                <span className="text-console-white font-mono text-sm">
                  {getPickName(userPickId)}
                </span>
              </div>
            </div>
            
            <p className="text-console-white-dim font-mono text-xs mt-3">
              Your {bet.amount} $DARE points will be refunded to your account.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCancelConfirmation(false)}
              className="bg-console-gray/20 hover:bg-console-gray/30 text-console-white-dim font-mono text-sm py-2 px-4 border border-console-gray/50 hover:border-console-gray transition-colors"
            >
              KEEP BET
            </button>
            
            <button
              onClick={handleCancelBet}
              disabled={isCancellingBet}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-mono text-sm py-2 px-4 border border-red-500/50 hover:border-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancellingBet ? 'CANCELLING...' : 'CANCEL BET'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BetDetailsModal; 