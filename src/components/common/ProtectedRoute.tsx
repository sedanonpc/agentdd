import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isConnected } = useWeb3();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    console.log('ProtectedRoute: isConnected =', isConnected);
    
    if (!isConnected) {
      // Small delay to show message before redirecting
      setIsRedirecting(true);
    }
  }, [isConnected]);

  if (!isConnected) {
    if (isRedirecting) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-6 max-w-md text-center">
            <h2 className="text-xl font-display uppercase text-console-white mb-4">ACCESS_DENIED</h2>
            <p className="text-console-white-dim font-mono mb-4">
              WALLET CONNECTION REQUIRED TO ACCESS THIS AREA
            </p>
            <p className="text-console-white-dim font-mono text-sm">
              REDIRECTING TO HOMEPAGE...
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;