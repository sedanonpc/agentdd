import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

const LoginButton: React.FC = () => {
  const { login, authenticated } = usePrivy();
  return (
    <button onClick={login} className="bg-console-blue/90 text-white px-4 py-2">
      {authenticated ? 'Signed in' : 'Sign in'}
    </button>
  );
};

export default LoginButton;


