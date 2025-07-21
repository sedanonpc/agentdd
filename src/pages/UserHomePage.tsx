import React from 'react';
import { Construction } from 'lucide-react';

const UserHomePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header with title and banner */}
      <div className="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
        <div className="bg-console-blue/90 p-2 flex items-center justify-between">
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ USER_TERMINAL ]</div>
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ STATUS: DEVELOPMENT ]</div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-center mb-3">
            <Construction className="text-console-blue-bright h-8 w-8 mr-2" />
            <h1 className="text-2xl md:text-3xl font-display uppercase text-console-white tracking-widest">
              USER HOME
            </h1>
          </div>
          <div className="font-mono text-console-white-muted text-sm flex flex-wrap justify-center items-center gap-2">
            <span>STATUS: WORK IN PROGRESS</span>
            <span className="h-1.5 w-1.5 bg-console-blue-bright rounded-full animate-pulse"></span>
            <span>COMING SOON</span>
          </div>
        </div>
      </div>
      
      {/* Work in progress content */}
      <div className="bg-console-gray-terminal/60 backdrop-blur-xs border-1 border-console-blue shadow-terminal">
        <div className="p-8 text-center">
          <Construction className="h-16 w-16 text-console-blue-bright mx-auto mb-4" />
          <h2 className="text-xl font-mono text-console-white mb-4">WORK IN PROGRESS</h2>
          <p className="text-console-white-muted font-mono text-sm">
            This page is currently under development. Please check back later.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserHomePage; 