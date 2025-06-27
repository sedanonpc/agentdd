import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWeb3 } from './Web3Context';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signOut, 
  getCurrentUser, 
  getCurrentSession,
  getUserAccount,
  createUserAccount,
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
              const account = await getUserAccount(supabaseUser.id);
              
              setUser({
                id: supabaseUser.id,
                email: supabaseUser.email,
                walletAddress: account?.wallet_address
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
    const handleWalletConnectionChange = async () => {
      if (isConnected && account) {
        // User connected their wallet
        if (authMethod === 'wallet' || authMethod === null) {
          // Check if this is a first-time wallet user and create account if needed
          if (isSupabaseAvailable) {
            try {
              const existingAccount = await getUserAccount(account);
              
              if (!existingAccount) {
                // First time wallet user - create account and award signup bonus
                console.log('First-time wallet user detected via auto-connection:', account);
                
                try {
                  await createUserAccount(account, {
                    wallet_address: account,
                  });
                  
                  // Award signup bonus DARE points
                  try {
                    const { awardSignupBonus } = await import('../services/pointsConfigService');
                    const bonusAwarded = await awardSignupBonus(account);
                    
                    if (bonusAwarded) {
                      console.log('Signup bonus awarded successfully to auto-connected wallet user:', account);
                    } else {
                      console.warn('Failed to award signup bonus to auto-connected wallet user:', account);
                    }
                  } catch (bonusError) {
                    console.error('Error awarding signup bonus to auto-connected wallet user:', bonusError);
                  }
                } catch (accountError) {
                  console.error('Error creating auto-connected wallet user account:', accountError);
                }
              }
            } catch (error) {
              console.error('Error checking for existing auto-connected wallet account:', error);
            }
                      }
          
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
    };
    
    handleWalletConnectionChange();
  }, [isConnected, account, authMethod, isSupabaseAvailable]);

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (isSupabaseAvailable) {
        // Use Supabase authentication
        const { user: supabaseUser } = await signInWithEmail(email, password);
        if (supabaseUser) {
          const account = await getUserAccount(supabaseUser.id);
          
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            walletAddress: account?.wallet_address
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
        throw new Error('Database connection required for user registration');
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
      
      if (account) {
        if (isSupabaseAvailable && authMethod === 'email' && user) {
          // If user is already logged in via email, link the wallet to their account
          await linkWalletToUser(user.id, account);
          
          // Update the user state
          setUser({
            ...user,
            walletAddress: account
          });
        } else {
          // Check if this wallet user exists in the database
          if (isSupabaseAvailable) {
            try {
              // Look for existing account with this wallet address
              const existingAccount = await getUserAccount(account);
              
              if (!existingAccount) {
                // First time wallet user - create account and award signup bonus
                console.log('First-time wallet user detected, creating account:', account);
                
                try {
                  await createUserAccount(account, {
                    wallet_address: account,
                  });
                  
                  // Award signup bonus DARE points
                  try {
                    const { awardSignupBonus } = await import('../services/pointsConfigService');
                    const bonusAwarded = await awardSignupBonus(account);
                    
                    if (bonusAwarded) {
                      console.log('Signup bonus awarded successfully to wallet user:', account);
                    } else {
                      console.warn('Failed to award signup bonus to wallet user:', account);
                    }
                  } catch (bonusError) {
                    // Don't fail the login if bonus awarding fails
                    console.error('Error awarding signup bonus to wallet user:', bonusError);
                  }
                } catch (accountError) {
                  console.error('Error creating wallet user account:', accountError);
                  // Continue with login even if account creation fails
                }
              }
            } catch (error) {
              console.error('Error checking for existing wallet account:', error);
              // Continue with login even if database check fails
            }
                      }
          
          // Set user state
          setUser({
            id: account,
            walletAddress: account
          });
          setAuthMethod('wallet');
        }
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