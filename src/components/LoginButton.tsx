import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

const LoginButton: React.FC = () => {
  const appId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;
  if (!appId) {
    return (
      <button disabled className="bg-console-blue/40 text-white/70 px-4 py-2 cursor-not-allowed">
        Configure VITE_PRIVY_APP_ID to enable Sign in
      </button>
    );
  }
  const { login, authenticated } = usePrivy();
  return (
    <button onClick={login} className="bg-console-blue/90 text-white px-4 py-2">
      {authenticated ? 'Signed in' : 'Sign in'}
    </button>
  );
};

export default LoginButton;


