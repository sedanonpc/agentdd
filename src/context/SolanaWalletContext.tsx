import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

interface SolanaWalletContextType {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  checkConnection: () => Promise<boolean>;
  balance: number;
  network: WalletAdapterNetwork;
  walletAddress: string | null;
}

const SolanaWalletContext = createContext<SolanaWalletContextType | undefined>(undefined);

export const SolanaWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Check if Phantom extension is available
  const isPhantomAvailable = () => {
    return 'solana' in window && (window as any).solana?.isPhantom;
  };

  const updateBalance = async (pubKey: PublicKey) => {
    try {
      const connection = new Connection(clusterApiUrl(network));
      const balance = await connection.getBalance(pubKey);
      setBalance(balance / 1e9); // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  };

  const connect = async (): Promise<string | null> => {
    setConnecting(true);
    try {
      console.log('Attempting to connect to Phantom wallet...');
      
      if (!isPhantomAvailable()) {
        throw new Error('Phantom wallet extension not installed. Please install Phantom from https://phantom.app');
      }

      const phantomProvider = (window as any).solana;
      
      // Request connection
      const response = await phantomProvider.connect();
      const connectedPublicKey = response.publicKey;
      
      if (!connectedPublicKey) {
        throw new Error('Failed to connect to Phantom wallet');
      }

      setPublicKey(connectedPublicKey);
      setWalletAddress(connectedPublicKey.toString());
      setConnected(true);
      updateBalance(connectedPublicKey);
      
      console.log('Successfully connected to wallet:', connectedPublicKey.toString());
      return connectedPublicKey.toString();
      
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      if ('solana' in window && (window as any).solana?.disconnect) {
        await (window as any).solana.disconnect();
      }
      
      setPublicKey(null);
      setWalletAddress(null);
      setConnected(false);
      setBalance(0);
      console.log('Wallet disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const checkConnection = async (): Promise<boolean> => {
    try {
      if (!isPhantomAvailable()) {
        return false;
      }

      const phantomProvider = (window as any).solana;
      
      // Check if wallet is connected
      if (!phantomProvider.isConnected) {
        return false;
      }

      // Verify the connection by getting the public key
      const publicKey = phantomProvider.publicKey;
      if (!publicKey) {
        return false;
      }

      // Update our state to match the actual connection
      setPublicKey(publicKey);
      setWalletAddress(publicKey.toString());
      setConnected(true);
      updateBalance(publicKey);
      
      return true;
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
      // If there's any error, assume not connected
      setPublicKey(null);
      setWalletAddress(null);
      setConnected(false);
      setBalance(0);
      return false;
    }
  };

  const value: SolanaWalletContextType = {
    publicKey,
    connected,
    connecting,
    connect,
    disconnect,
    checkConnection,
    balance,
    network,
    walletAddress,
  };

  return (
    <SolanaWalletContext.Provider value={value}>
      {children}
    </SolanaWalletContext.Provider>
  );
};

export const useSolanaWallet = (): SolanaWalletContextType => {
  const context = useContext(SolanaWalletContext);
  if (context === undefined) {
    throw new Error('useSolanaWallet must be used within a SolanaWalletProvider');
  }
  return context;
}; 