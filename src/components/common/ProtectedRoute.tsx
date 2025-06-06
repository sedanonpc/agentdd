import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Small delay to show message before redirecting
      setIsRedirecting(true);
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-6 max-w-md text-center">
          <h2 className="text-xl font-display uppercase text-console-white mb-4">VERIFYING_ACCESS</h2>
          <p className="text-console-white-dim font-mono mb-4">
            AUTHENTICATING USER...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (isRedirecting) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-6 max-w-md text-center">
            <h2 className="text-xl font-display uppercase text-console-white mb-4">ACCESS_DENIED</h2>
            <p className="text-console-white-dim font-mono mb-4">
              AUTHENTICATION REQUIRED TO ACCESS THIS AREA
            </p>
            <p className="text-console-white-dim font-mono text-sm">
              REDIRECTING TO LOGIN...
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;