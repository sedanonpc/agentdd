import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSolanaWallet } from './SolanaWalletContext';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signOut, 
  getCurrentUser, 
  getCurrentSession,
  isSupabaseConfigured
} from '../services/authService';
import { 
  createUserAccount,
  getUserAccount,
  supabase
} from '../services/userAccountsService';
import { 
  registerWalletUser, 
  getWalletUser, 
  walletUserExists,
  WalletUser
} from '../services/walletService';
import { User } from '@supabase/supabase-js';

interface AuthUser {
  accountId: string;  // This is user_accounts.id
  userId: string;  // This is auth.users.id for email users, wallet address for wallet users
  email?: string;
  walletAddress?: string;
  username?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  authMethod: 'email' | 'wallet' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseAvailable: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  loginWithWallet: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { walletAddress, connect, disconnect, connected, checkConnection } = useSolanaWallet();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMethod, setAuthMethod] = useState<'email' | 'wallet' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Check Supabase configuration on load
  useEffect(() => {
    setIsSupabaseAvailable(isSupabaseConfigured());
  }, []);

  // Check for existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (isSupabaseAvailable) {
          // Try to get the current Supabase session
          const session = await getCurrentSession();
          
          if (session) {
            // User is logged in via Supabase (email authentication)
            const supabaseUser = await getCurrentUser();
            if (supabaseUser) {
              const account = await getUserAccount(supabaseUser.id);
              
              if (account && account.id) {
                setUser({
                  accountId: account.id,
                  userId: supabaseUser.id,
                  email: supabaseUser.email || undefined,
                  walletAddress: account.wallet_address,
                  username: account.username,
                  isAdmin: false
                });
                setIsAdmin(false);
                setAuthMethod('email');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [isSupabaseAvailable]);

  // Handle wallet connection changes
  useEffect(() => {
    const handleWalletConnectionChange = async () => {
      if (connected && walletAddress && !user) {
        // User connected wallet but not logged in yet
        console.log('Wallet connected, checking if user exists...');
        
        if (isSupabaseAvailable) {
          try {
            // Check if wallet user exists
            const exists = await walletUserExists(walletAddress);
            
            if (exists) {
              // Existing wallet user - get their account
              const walletUser = await getWalletUser(walletAddress);
              if (walletUser) {
                setUser({
                  accountId: walletUser.id,
                  userId: walletUser.wallet_address,
                  walletAddress: walletUser.wallet_address,
                  username: walletUser.username,
                  isAdmin: false
                });
                setAuthMethod('wallet');
                console.log('Existing wallet user logged in:', walletUser.username);
              }
            }
            // If user doesn't exist, they need to explicitly login to register
          } catch (error) {
            console.error('Error checking wallet user:', error);
          }
        }
      } else if (!connected && authMethod === 'wallet') {
        // Wallet disconnected - log out wallet user
        setUser(null);
        setAuthMethod(null);
        console.log('Wallet disconnected, user logged out');
      }
    };

    handleWalletConnectionChange();
  }, [connected, walletAddress, user, authMethod, isSupabaseAvailable]);

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (!isSupabaseAvailable) {
        throw new Error('Supabase is not configured');
      }

      const { user: supabaseUser } = await signInWithEmail(email, password);
      if (supabaseUser) {
        const account = await getUserAccount(supabaseUser.id);
        
        if (account && account.id) {
          setUser({
            accountId: account.id,
            userId: supabaseUser.id,
            email: supabaseUser.email || undefined,
            walletAddress: account.wallet_address,
            username: account.username,
            isAdmin: false
          });
          setAuthMethod('email');
          setIsAdmin(false);
        } else {
          throw new Error('User account not found');
        }
      }
    } catch (error) {
      console.error('Email login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (!isSupabaseAvailable) {
        throw new Error('Supabase is not configured');
      }

      const { user: supabaseUser } = await signUpWithEmail(email, password);
      if (supabaseUser) {
        const account = await getUserAccount(supabaseUser.id);
        
        if (account && account.id) {
          setUser({
            accountId: account.id,
            userId: supabaseUser.id,
            email: supabaseUser.email || undefined,
            walletAddress: account.wallet_address,
            username: account.username,
            isAdmin: false
          });
          setAuthMethod('email');
          setIsAdmin(false);
        } else {
          throw new Error('User account not found');
        }
      }
    } catch (error) {
      console.error('Email registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithWallet = async () => {
    try {
      setIsLoading(true);
      
      if (!isSupabaseAvailable) {
        throw new Error('Supabase is not configured');
      }

      // First, check if wallet is already connected
      const isConnected = await checkConnection();
      
      let connectedWalletAddress: string;
      
      if (isConnected && walletAddress) {
        // Wallet is already connected, use the current address
        console.log('Wallet already connected, using current address:', walletAddress);
        connectedWalletAddress = walletAddress;
      } else {
        // Wallet is not connected or connection is stale, force new connection
        console.log('Wallet not connected or connection stale, requesting new connection...');
        const newWalletAddress = await connect();
        
        if (!newWalletAddress) {
          throw new Error('Failed to connect wallet');
        }
        connectedWalletAddress = newWalletAddress;
      }

      console.log('Wallet connected successfully:', connectedWalletAddress);

      // Check if wallet user exists
      const exists = await walletUserExists(connectedWalletAddress);
      
      if (exists) {
        // Existing wallet user - get their account
        const walletUser = await getWalletUser(connectedWalletAddress);
        if (walletUser) {
          setUser({
            accountId: walletUser.id,
            userId: walletUser.wallet_address,
            walletAddress: walletUser.wallet_address,
            username: walletUser.username,
            isAdmin: false
          });
          setAuthMethod('wallet');
          setIsAdmin(false);
          console.log('Existing wallet user logged in:', walletUser.username);
        }
      } else {
        // New wallet user - register them
        console.log('New wallet user, registering account...');
        const walletUser = await registerWalletUser(connectedWalletAddress);
        
        setUser({
          accountId: walletUser.id,
          userId: walletUser.wallet_address,
          walletAddress: walletUser.wallet_address,
          username: walletUser.username,
          isAdmin: false
        });
        setAuthMethod('wallet');
        setIsAdmin(false);
        console.log('New wallet user registered and logged in:', walletUser.username);
      }
      
    } catch (error) {
      console.error('Wallet login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (authMethod === 'wallet') {
        await disconnect();
      }
      
      if (isSupabaseAvailable && authMethod === 'email') {
        await signOut();
      }
      
      setUser(null);
      setAuthMethod(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authMethod,
        isAuthenticated: !!user,
        isLoading,
        isSupabaseAvailable,
        isAdmin,
        loginWithEmail,
        registerWithEmail,
        loginWithWallet,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 