import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

const LoginButton: React.FC = () => {
  const { login, authenticated } = usePrivy();
  return (
    <button
      onClick={!authenticated ? login : undefined}
      disabled={authenticated}
      className="bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-4 py-3 shadow-button hover:shadow-glow transition-all duration-300 flex items-center justify-center"
    >
      {authenticated ? 'SIGNED IN' : 'SIGN IN'}
    </button>
  );
};

export default LoginButton;


