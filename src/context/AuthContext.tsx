import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWeb3 } from './Web3Context';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signOut, 
  getCurrentUser, 
  getCurrentSession,
  getUserProfile,
  linkWalletToUser,
  isSupabaseConfigured
} from '../services/supabaseService';
import { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email?: string;
  walletAddress?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  authMethod: 'email' | 'wallet' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseAvailable: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  loginWithWallet: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { account, connectWallet, disconnectWallet, isConnected } = useWeb3();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMethod, setAuthMethod] = useState<'email' | 'wallet' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState<boolean>(false);

  // Check Supabase configuration on load
  useEffect(() => {
    setIsSupabaseAvailable(isSupabaseConfigured());
  }, []);

  // Immediately authenticate user when wallet gets connected
  useEffect(() => {
    if (isConnected && account && !user) {
      console.log("Wallet connected - setting up auth user automatically");
      setUser({
        id: account,
        walletAddress: account
      });
      setAuthMethod('wallet');
    }
  }, [isConnected, account, user]);

  // Check for existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (isSupabaseAvailable) {
          // Try to get the current Supabase session
          const session = await getCurrentSession();
          
          if (session) {
            // User is logged in via Supabase
            const supabaseUser = await getCurrentUser();
            if (supabaseUser) {
              const profile = await getUserProfile(supabaseUser.id);
              
              setUser({
                id: supabaseUser.id,
                email: supabaseUser.email,
                walletAddress: profile?.wallet_address
              });
              setAuthMethod('email');
            }
          } else if (isConnected && account) {
            // User is connected via wallet
            setUser({
              id: account,
              walletAddress: account
            });
            setAuthMethod('wallet');
          }
        } else {
          // Fallback to localStorage if Supabase is not configured
          const savedUser = localStorage.getItem('user');
          const savedAuthMethod = localStorage.getItem('authMethod');
          
          if (savedUser && savedAuthMethod === 'email') {
            setUser(JSON.parse(savedUser));
            setAuthMethod('email');
          } else if (isConnected && account) {
            // User is connected via wallet
            setUser({
              id: account,
              walletAddress: account
            });
            setAuthMethod('wallet');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, [isConnected, account, isSupabaseAvailable]);

  // Update user when wallet connection changes
  useEffect(() => {
    if (isConnected && account) {
      // User connected their wallet
      if (authMethod === 'wallet' || authMethod === null) {
        // Set or update the user with wallet info
        setUser({
          id: account,
          walletAddress: account
        });
        setAuthMethod('wallet');
      } else if (authMethod === 'email' && user) {
        // User already logged in with email, update their wallet address
        setUser({
          ...user,
          walletAddress: account
        });
      }
    } else if (authMethod === 'wallet' && !isConnected) {
      // Wallet disconnected
      setUser(null);
      setAuthMethod(null);
    }
  }, [isConnected, account, authMethod]);

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (isSupabaseAvailable) {
        // Use Supabase authentication
        const { user: supabaseUser } = await signInWithEmail(email, password);
        if (supabaseUser) {
          const profile = await getUserProfile(supabaseUser.id);
          
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            walletAddress: profile?.wallet_address
          });
          setAuthMethod('email');
        }
      } else {
        // Fallback to mock authentication
        const mockUser = {
          id: `user_${Date.now()}`,
          email: email
        };
        
        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('authMethod', 'email');
        
        setUser(mockUser);
        setAuthMethod('email');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const registerWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (isSupabaseAvailable) {
        // Use Supabase authentication
        const { user: supabaseUser } = await signUpWithEmail(email, password);
        if (supabaseUser) {
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email
          });
          setAuthMethod('email');
        }
      } else {
        // Fallback to mock authentication
        const mockUser = {
          id: `user_${Date.now()}`,
          email: email
        };
        
        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('authMethod', 'email');
        
        setUser(mockUser);
        setAuthMethod('email');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithWallet = async () => {
    try {
      setIsLoading(true);
      await connectWallet();
      
      // The account state update will trigger useEffect to handle the user creation
      // No need to manually set the user here
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
        disconnectWallet();
      }
      
      if (isSupabaseAvailable && authMethod === 'email') {
        await signOut();
      }
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('authMethod');
      
      setUser(null);
      setAuthMethod(null);
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