import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

interface Web3ContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isConnected: boolean;
  balance: string;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    checkIfWalletIsConnected();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      updateWalletInfo(accounts[0]);
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!window.ethereum) return;

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);
      
      const accounts = await browserProvider.listAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0].address;
        setAccount(account);
        updateWalletInfo(account);
      }
    } catch (error) {
      console.error('Error checking if wallet is connected:', error);
    }
  };

  const updateWalletInfo = async (account: string) => {
    if (!provider) return;
    
    try {
      const signer = await provider.getSigner();
      setSigner(signer);
      
      const balance = await provider.getBalance(account);
      setBalance(ethers.formatEther(balance));
      
      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
    } catch (error) {
      console.error('Error updating wallet info:', error);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask to use this dApp!');
        return;
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);
      
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        updateWalletInfo(accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setBalance('0');
    setChainId(null);
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        isConnected: !!account,
        balance,
        chainId,
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