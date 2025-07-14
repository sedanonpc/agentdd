import React from 'react';
import { Match } from '../../types';
import { Zap, MessageSquare } from 'lucide-react';

interface SandboxMatchCardProps {
  match: Match;
  onSelectForChat: (match: Match) => void;
  onSelectForBetting: (match: Match) => void;
  isChatSelected: boolean;
  isBettingSelected: boolean;
}

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23374151'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

export const SandboxMatchCard: React.FC<SandboxMatchCardProps> = ({ 
  match, 
  onSelectForChat, 
  onSelectForBetting, 
  isChatSelected, 
  isBettingSelected 
}) => {
  const handleChatButtonClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    onSelectForChat(match);
  };
  
  const handleBetButtonClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    onSelectForBetting(match);
  };

  return (
    <div className={`bg-console-gray-terminal/70 backdrop-blur-xs border-1 ${
      isChatSelected || isBettingSelected ? 'border-console-blue-bright shadow-glow' : 'border-console-blue shadow-terminal'
    } overflow-hidden hover:shadow-glow transition-all group`}>
      <div className="bg-console-gray/70 backdrop-blur-xs p-3">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-console-white font-mono">
              {new Date(match.commence_time).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-console-white font-mono">
              {new Date(match.commence_time).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            <span className="bg-purple-600 text-white text-xs font-mono px-1 py-0.5 rounded">
              SANDBOX
            </span>
          </div>
        </div>
        
        {/* Sport title badge */}
        <div className="mt-1 flex justify-end">
          <span className="bg-console-black/40 px-2 py-0.5 text-xs font-mono text-console-blue-bright">
            THE SANDBOX METAVERSE
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Player 1 */}
          <div className="flex items-center space-x-3">
            <img 
              src={match.home_team.logo || DEFAULT_AVATAR}
              alt={match.home_team.name}
              className="w-12 h-12 rounded-full object-cover border border-console-blue-dark"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
            <div>
              <h3 className="text-console-white-bright font-mono text-lg">{match.home_team.name}</h3>
              {match.home_team.alias && (
                <p className="text-console-white-dim text-sm font-mono">{match.home_team.alias}</p>
              )}
            </div>
          </div>
          
          {/* VS */}
          <div className="text-console-blue-bright font-mono text-xl font-bold">VS</div>
          
          {/* Player 2 */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <h3 className="text-console-white-bright font-mono text-lg">{match.away_team.name}</h3>
              {match.away_team.alias && (
                <p className="text-console-white-dim text-sm font-mono">{match.away_team.alias}</p>
              )}
            </div>
            <img 
              src={match.away_team.logo || DEFAULT_AVATAR}
              alt={match.away_team.name}
              className="w-12 h-12 rounded-full object-cover border border-console-blue-dark"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
              }}
            />
          </div>
        </div>
        
        {/* Match Details */}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-2">
            <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-purple-400">
              ESPORTS
            </span>
            <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-green-400">
              1V1
            </span>
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
          <button
            onClick={handleBetButtonClick}
            className={`flex items-center gap-1 px-3 py-1 ${
              isBettingSelected ? 'bg-[#E5FF03] text-black' : 'bg-console-black/50 text-[#E5FF03]'
            } border-1 ${isBettingSelected ? 'border-[#E5FF03]' : 'border-[#E5FF03]'} hover:bg-[#E5FF03]/70 hover:text-black transition-colors`}
          >
            <Zap className="h-4 w-4" />
            <span className="text-xs font-mono">BET NOW</span>
          </button>
          
          <button
            onClick={handleChatButtonClick}
            className={`flex items-center gap-1 px-2 py-1 ${
              isChatSelected ? 'bg-[#00A4FF] text-console-white' : 'bg-console-black/50 text-[#00A4FF]'
            } border-1 ${isChatSelected ? 'border-[#00A4FF]' : 'border-[#00A4FF]'} hover:bg-[#00A4FF]/70 hover:text-console-white transition-colors`}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-mono">COMMUNITY CHAT</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 