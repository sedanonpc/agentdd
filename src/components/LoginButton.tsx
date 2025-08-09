import React, { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

const LoginButton: React.FC = () => {
  const { login, authenticated, logout, ready } = usePrivy();
  const { isAuthenticated } = useAuth();

  const handleClick = useCallback(async () => {
    try {
      console.log('[LoginButton] click', { ready, authenticated, appAuthenticated: isAuthenticated });
      // Always ensure Supabase is signed out before attempting a fresh Privy flow when app is not authenticated
      if (!isAuthenticated) {
        await supabase.auth.signOut();
      }

      if (!authenticated) {
        console.log('[LoginButton] starting Privy login');
        await login();
        return;
      }

      // Privy says authenticated, but app is not -> retry: force Privy logout then login
      if (authenticated && !isAuthenticated) {
        const { data } = await supabase.auth.getSession();
        console.log('[LoginButton] retry path. Supabase session present?', !!data?.session);
        if (!data?.session) {
          console.log('[LoginButton] logging out of Privy to retry');
          await logout();
          console.log('[LoginButton] re-opening Privy login');
          await login();
        }
      }
    } catch (e) {
      console.error('[LoginButton] click error', e);
    }
  }, [authenticated, isAuthenticated, login, logout, ready]);

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


