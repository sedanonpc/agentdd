import React from 'react';
import { Match } from '../../types/match';

interface StraightBetCardProps {
  bet: any; // Replace 'any' with the correct StraightBet type if available
  match: Match | null;
}

const SPORT_LABELS: Record<string, string> = {
  basketball_nba: 'NBA',
  sandbox_metaverse: 'Sandbox Metaverse',
  // Add more as needed
};

const StraightBetCard: React.FC<StraightBetCardProps> = ({ bet, match }) => {
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="bg-console-gray-terminal/80 border border-console-blue shadow-terminal rounded-lg p-4 flex flex-col gap-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono text-console-white-dim uppercase">
          {match ? SPORT_LABELS[match.event_type] || match.event_type : 'Unknown Sport'}
        </span>
        <span className="text-xs font-mono text-console-white-dim">{formatDate(bet.createdAt)}</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="text-lg font-display text-console-white mb-1">Bet Amount: <span className="text-[#E5FF03]">{bet.amount}</span></div>
        </div>
        <div className="text-sm font-mono text-console-white-dim">Match ID: <span className="text-console-white">{bet.matchId}</span></div>
      </div>
      {bet.creatorsNote && (
        <div className="text-xs font-mono text-console-white-dim mt-2 italic">"{bet.creatorsNote}"</div>
      )}
      {!match && (
        <div className="text-xs font-mono text-console-red-400 mt-2">Match details unavailable.</div>
      )}
    </div>
  );
};

export default StraightBetCard; 