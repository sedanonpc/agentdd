import React, { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

const LoginButton: React.FC = () => {
  const { login, authenticated, logout, ready } = usePrivy();
  const { isAuthenticated } = useAuth();

  const handleClick = useCallback(async () => {
    if (!ready) return;
    if (!authenticated) {
      login();
      return;
    }
    // Privy says authenticated, but app is not -> retry: clear session and re-login
    if (authenticated && !isAuthenticated) {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        try {
          await logout();
        } finally {
          // small delay to ensure state resets in Privy
          setTimeout(() => login(), 50);
        }
      }
    }
  }, [ready, authenticated, isAuthenticated, login, logout]);

  const disabled = authenticated && isAuthenticated; // only disable when both stacks agree
  const label = authenticated
    ? isAuthenticated
      ? 'SIGNED IN'
      : 'RETRY SIGN IN'
    : 'SIGN IN';

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-4 py-3 shadow-button hover:shadow-glow transition-all duration-300 flex items-center justify-center disabled:opacity-50"
    >
      {label}
    </button>
  );
};

export default LoginButton;


