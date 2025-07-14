import React from 'react';
import { Match } from '../../types';

interface SandboxMatchCardProps {
  match: Match;
}

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23374151'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

export const SandboxMatchCard: React.FC<SandboxMatchCardProps> = ({ match }) => {
  return (
    <div className="bg-console-gray-terminal/30 border border-console-blue p-4 rounded-md shadow-terminal">
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
        <div>
          <p className="text-console-white-dim text-sm font-mono">
            {new Date(match.commence_time).toLocaleString()}
          </p>
          <p className="text-console-blue-bright text-sm font-mono">
            The Sandbox Metaverse
          </p>
        </div>
        
        <div className="flex gap-2">
          <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-purple-400">
            ESPORTS
          </span>
          <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-green-400">
            1V1
          </span>
        </div>
      </div>
    </div>
  );
}; 