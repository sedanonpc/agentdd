import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { ethers } from 'ethers';

// Add TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

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
  const [isRedirectedFromMetaMask, setIsRedirectedFromMetaMask] = useState<boolean>(false);
  const [pendingMobileConnection, setPendingMobileConnection] = useState<boolean>(false);
  const [reconnectionAttempts, setReconnectionAttempts] = useState<number>(0);
  const MAX_RECONNECTION_ATTEMPTS = 10; // Try up to 10 times
  const reconnectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to detect if we're in the MetaMask mobile browser
  const isMetaMaskBrowser = () => {
    return navigator.userAgent.includes('MetaMaskMobile');
  };

  // Helper function to detect mobile device
  const isMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  };

  // Attempt to connect to MetaMask - more aggressive version for mobile
  const tryReconnectToMetaMask = async () => {
    console.log(`Reconnection attempt ${reconnectionAttempts + 1}/${MAX_RECONNECTION_ATTEMPTS}`);
    
    if (!window.ethereum) {
      console.log("No ethereum provider found during reconnection attempt");
      if (reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
        setReconnectionAttempts(prev => prev + 1);
      } else {
        // Give up after maximum attempts
        console.log("Max reconnection attempts reached - giving up");
        clearInterval(reconnectionIntervalRef.current!);
        reconnectionIntervalRef.current = null;
        setPendingMobileConnection(false);
      }
      return;
    }
    
    try {
      // Check if ethereum is ready and accounts are available
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts && accounts.length > 0) {
        console.log("Found accounts on reconnection:", accounts);
        // We have accounts! Set up the provider and account
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);
        setAccount(accounts[0]);
        updateWalletInfo(accounts[0]);
        
        // Clear the interval since we succeeded
        if (reconnectionIntervalRef.current) {
          clearInterval(reconnectionIntervalRef.current);
          reconnectionIntervalRef.current = null;
        }
        
        // Clear the pending state
        setPendingMobileConnection(false);
        
        // Remove flag from localStorage
        localStorage.removeItem('pendingMobileConnection');
        
        // Update localStorage to indicate successful connection
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', accounts[0]);
        
        console.log("Wallet reconnection successful!");
      } else {
        // No accounts yet, keep trying if under max attempts
        if (reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
          setReconnectionAttempts(prev => prev + 1);
        } else {
          // Give up after maximum attempts
          console.log("Max reconnection attempts reached - giving up");
          clearInterval(reconnectionIntervalRef.current!);
          reconnectionIntervalRef.current = null;
          setPendingMobileConnection(false);
        }
      }
    } catch (error) {
      console.error("Error during reconnection attempt:", error);
      if (reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
        setReconnectionAttempts(prev => prev + 1);
      } else {
        // Give up after maximum attempts
        console.log("Max reconnection attempts reached - giving up");
        clearInterval(reconnectionIntervalRef.current!);
        reconnectionIntervalRef.current = null;
        setPendingMobileConnection(false);
      }
    }
  };

  // Handle the visibility change event (when user returns from MetaMask app)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && pendingMobileConnection) {
        console.log("App is visible again, starting reconnection attempts");
        
        // Reset reconnection counter
        setReconnectionAttempts(0);
        
        // Start aggressive polling to reconnect
        if (!reconnectionIntervalRef.current) {
          reconnectionIntervalRef.current = setInterval(tryReconnectToMetaMask, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also check on load
    if (pendingMobileConnection && !reconnectionIntervalRef.current) {
      console.log("Starting reconnection attempts on load");
      reconnectionIntervalRef.current = setInterval(tryReconnectToMetaMask, 1000);
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectionIntervalRef.current) {
        clearInterval(reconnectionIntervalRef.current);
        reconnectionIntervalRef.current = null;
      }
    };
  }, [pendingMobileConnection]);

  // Check if returning from a redirect on component mount
  useEffect(() => {
    // Check if the user was redirected from MetaMask
    const checkForRedirect = () => {
      // Check if returning from a mobile connection attempt
      const hasPendingConnection = localStorage.getItem('pendingMobileConnection');
      if (hasPendingConnection === 'true') {
        console.log("Detected pending mobile connection");
        setPendingMobileConnection(true);
        
        // Start the reconnection process immediately
        if (!reconnectionIntervalRef.current) {
          setReconnectionAttempts(0);
          reconnectionIntervalRef.current = setInterval(tryReconnectToMetaMask, 1000);
        }
      }
      
      // If we have a saved wallet address, try to connect using it
      const walletConnected = localStorage.getItem('walletConnected');
      const savedWalletAddress = localStorage.getItem('walletAddress');
      if (walletConnected === 'true' && savedWalletAddress && !account) {
        console.log("Found saved wallet connection, attempting to restore");
        connectWallet();
      }
    };
    
    checkForRedirect();
    checkIfWalletIsConnected();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
      if (reconnectionIntervalRef.current) {
        clearInterval(reconnectionIntervalRef.current);
        reconnectionIntervalRef.current = null;
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
      // Check if we're on a mobile device
      const isMobile = isMobileDevice();
      const isInMetaMaskBrowser = isMetaMaskBrowser();
      
      if (!window.ethereum) {
        if (isMobile && !isInMetaMaskBrowser) {
          // For mobile, create a deep link to the MetaMask app
          const metamaskDeepLink = 'https://metamask.app.link/dapp/' + window.location.href.replace(/^https?:\/\//, '');
          
          // Set flag in localStorage to indicate pending mobile connection
          localStorage.setItem('pendingMobileConnection', 'true');
          setPendingMobileConnection(true);
          
          // Redirect to MetaMask
          window.location.href = metamaskDeepLink;
          return;
        } else {
          // For desktop, show the standard message
          alert('Please install MetaMask to use this dApp!');
        }
        return;
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(browserProvider);
      
      try {
        // More reliable method for mobile connections
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          updateWalletInfo(accounts[0]);
          
          // Save connection state to localStorage
          localStorage.setItem('walletConnected', 'true');
          localStorage.setItem('walletAddress', accounts[0]);
        }
      } catch (requestError) {
        // Fall back to provider method if request method fails
        console.log("Falling back to browserProvider method", requestError);
        const accounts = await browserProvider.send('eth_requestAccounts', []);
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          updateWalletInfo(accounts[0]);
          
          // Save connection state to localStorage
          localStorage.setItem('walletConnected', 'true');
          localStorage.setItem('walletAddress', accounts[0]);
        }
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
    
    // Clear saved wallet state
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
  };

  // Try to automatically connect if user was redirected from MetaMask
  useEffect(() => {
    if (isRedirectedFromMetaMask && window.ethereum && !account) {
      connectWallet();
    }
  }, [isRedirectedFromMetaMask]);

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