import React from 'react';

const MatchesPage: React.FC = () => {
  // No matches, no fetching, just render empty state
  const matches: any[] = [];

  return (
    <div className="space-y-6">
      <div className="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
        <div className="bg-console-blue/90 p-2 text-black flex items-center justify-between">
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ SPORTS_TERMINAL ]</div>
        </div>
        <div className="p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <h1 className="text-2xl md:text-3xl font-display uppercase text-console-white tracking-widest">
              SPORTS BETTING SYSTEM
            </h1>
          </div>
        </div>
      </div>
      {/* No matches found */}
      <div className="text-console-white-dim font-mono text-center mt-10">
        No matches found.
      </div>
    </div>
  );
};

export default MatchesPage;