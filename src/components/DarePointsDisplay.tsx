import React from 'react';
import { useDarePoints } from '../context/DarePointsContext';

interface DarePointsDisplayProps {
  variant?: 'default' | 'compact' | 'large';
  className?: string;
  showEscrowed?: boolean;
}

const DarePointsDisplay: React.FC<DarePointsDisplayProps> = ({ 
  variant = 'default',
  className = '',
  showEscrowed = true
}) => {
  const { userBalance, loadingBalance, escrowedPoints } = useDarePoints();

  if (loadingBalance) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className="animate-pulse h-4 w-16 bg-console-blue-dim/30 rounded"></div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center text-sm ${className}`}>
        <span className="text-console-blue-bright">$DARE:</span>
        <span className="ml-1 text-console-white">{userBalance?.toLocaleString() || '0'}</span>
      </div>
    );
  }

  if (variant === 'large') {
    return (
      <div className={`flex flex-col ${className}`}>
        <span className="text-console-blue-bright text-lg font-display">$DARE POINTS</span>
        <span className="text-3xl font-bold text-console-white">{userBalance?.toLocaleString() || '0'}</span>
        
        {showEscrowed && escrowedPoints > 0 && (
          <div className="mt-2">
            <span className="text-console-yellow text-sm font-display">IN ESCROW:</span>
            <span className="ml-2 text-console-yellow-dim text-lg">{escrowedPoints.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="inline-flex items-center">
        <span className="text-console-blue-bright font-display">$DARE:</span>
        <span className="ml-2 text-xl text-console-white">{userBalance?.toLocaleString() || '0'}</span>
      </div>
      
      {showEscrowed && escrowedPoints > 0 && (
        <div className="inline-flex items-center mt-1">
          <span className="text-console-yellow text-xs font-display">ESCROW:</span>
          <span className="ml-1 text-sm text-console-yellow-dim">{escrowedPoints.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default DarePointsDisplay; 