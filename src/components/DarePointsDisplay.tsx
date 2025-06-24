import React from 'react';
import { useDarePoints } from '../context/DarePointsContext';

interface DarePointsDisplayProps {
  variant?: 'default' | 'compact' | 'large';
  className?: string;
  showProvisioned?: boolean;
}

const DarePointsDisplay: React.FC<DarePointsDisplayProps> = ({ 
  variant = 'default',
  className = '',
  showProvisioned = true
}) => {
  const { userBalance, unprovisionedBalance, provisionedBalance, loadingBalance } = useDarePoints();

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
        
        {showProvisioned && provisionedBalance > 0 && (
          <div className="mt-2">
            <span className="text-console-yellow text-sm font-display">PROVISIONED:</span>
            <span className="ml-2 text-console-yellow-dim text-lg">{provisionedBalance.toLocaleString()}</span>
          </div>
        )}
        
        <div className="mt-1">
          <span className="text-console-green text-sm font-display">AVAILABLE:</span>
          <span className="ml-2 text-console-green-dim text-lg">{unprovisionedBalance.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="inline-flex items-center">
        <span className="text-console-blue-bright font-display">$DARE:</span>
        <span className="ml-2 text-xl text-console-white">{userBalance?.toLocaleString() || '0'}</span>
      </div>
      
      {showProvisioned && provisionedBalance > 0 && (
        <div className="inline-flex items-center mt-1">
          <span className="text-console-yellow text-xs font-display">PROVISIONED:</span>
          <span className="ml-1 text-sm text-console-yellow-dim">{provisionedBalance.toLocaleString()}</span>
        </div>
      )}
      
      <div className="inline-flex items-center mt-1">
        <span className="text-console-green text-xs font-display">AVAILABLE:</span>
        <span className="ml-1 text-sm text-console-green-dim">{unprovisionedBalance.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default DarePointsDisplay; 