import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signOut, 
  getCurrentUser, 
  getCurrentSession,
  isSupabaseConfigured
} from '../services/authService';
import { 
  getUserAccount,
  createUserAccount,
  insertRowsAfterSignupFromWallet,
  linkWalletToAccount
} from '../services/userAccountsService';
import { User } from '@supabase/supabase-js';

interface AuthUser {
  accountId: string;  // This is user_accounts.id
  userId: string;  // This is auth.users.id
  email?: string;
  walletAddress?: string;
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
  // Wallet login removed; preparing for Privy integration
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
            // User is logged in via Supabase
            const supabaseUser = await getCurrentUser();
            if (supabaseUser) {
              const account = await getUserAccount(supabaseUser.id);
              
              if (account && account.id) {
                setUser({
                  accountId: account.id,  // Use user_accounts.id
                  userId: supabaseUser.id,  // Store auth.users.id separately
                  email: supabaseUser.email || undefined,
                  walletAddress: account.wallet_address,
                  isAdmin: false  // is_admin field was removed, default to false
                });
                
                // Update admin status - always false since we removed admin functionality
                setIsAdmin(false);
                setAuthMethod('email');
              }
            }
          }
        } else {
          // Fallback to localStorage if Supabase is not configured
          const savedUser = localStorage.getItem('user');
          const savedAuthMethod = localStorage.getItem('authMethod');
          
          if (savedUser && savedAuthMethod === 'email') {
            setUser(JSON.parse(savedUser));
            setAuthMethod('email');
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

  // Wallet connection effects removed

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (isSupabaseAvailable) {
        // Use Supabase authentication
        const { user: supabaseUser } = await signInWithEmail(email, password);
        if (supabaseUser) {
          const account = await getUserAccount(supabaseUser.id);
          
          if (account && account.id) {
            setUser({
              accountId: account.id,  // Use user_accounts.id
              userId: supabaseUser.id,  // Store auth.users.id separately
              email: supabaseUser.email || undefined,
              walletAddress: account.wallet_address,
              isAdmin: false  // is_admin field was removed, default to false
            });
            
            // Update admin status - always false since we removed admin functionality
            setIsAdmin(false);
            setAuthMethod('email');
          }
        }
      } else {
        // Fallback to mock authentication
        const mockUser = {
          accountId: `user_${Date.now()}`,
          userId: `user_${Date.now()}`, // For mock users, use the same generated ID
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
        // Use Supabase authentication - database trigger inserts rows after signup
        const { user: supabaseUser } = await signUpWithEmail(email, password);
        if (supabaseUser) {
          setUser({
            accountId: supabaseUser.id,
            userId: supabaseUser.id,
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
    throw new Error('Wallet login is temporarily disabled for Privy integration prep');
  };

  const logout = async () => {
    try {
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