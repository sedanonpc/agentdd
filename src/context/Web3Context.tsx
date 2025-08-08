// Temporary stub to remove wallet functionality while preparing for Privy integration
import React, { createContext, useContext, ReactNode } from 'react';

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Web3ContextType {
  account: string | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const connectWallet = async () => {
    throw new Error('Wallet login is disabled during Privy integration prep');
  };
  const disconnectWallet = () => {};

  return (
    <Web3Context.Provider
      value={{
        account: null,
        isConnected: false,
        connectWallet,
        disconnectWallet
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};