import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import {
  DareTransaction,
  DEFAULT_POINTS,
  getUserDarePoints,
  updateUserDarePoints,
  adjustUserDarePoints,
  recordTransaction,
  getUserTransactions,
  deductBetPoints,
  addBetWinPoints,
  awardPoints
} from '../services/darePointsService';

// Define the structure for the Reward Pool
interface RewardPool {
  totalPoints: number;
  transactions: DareTransaction[];
}

// Define the context type
interface DarePointsContextType {
  userBalance: number;
  loadingBalance: boolean;
  rewardPool: RewardPool;
  transactions: DareTransaction[];
  deductPoints: (amount: number, betId: string, description: string) => Promise<boolean>;
  addPoints: (amount: number, type: 'BET_WON' | 'REWARD', description: string, betId?: string) => Promise<boolean>;
  getTransactionHistory: () => DareTransaction[];
  getRewardPoolInfo: () => RewardPool;
  exportTransactions: () => string; // Export transactions as JSON string
}

// Create the context
const DarePointsContext = createContext<DarePointsContextType | undefined>(undefined);

// Local Storage Keys
const REWARD_POOL_KEY = 'daredevil_reward_pool';

// Provider component
export const DarePointsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<DareTransaction[]>([]);
  const [rewardPool, setRewardPool] = useState<RewardPool>({ totalPoints: 0, transactions: [] });

  // Load user balance and transactions when user changes
  useEffect(() => {
    if (user?.id) {
      loadUserData(user.id);
    } else {
      // Reset state when no account is connected
      setUserBalance(0);
      setTransactions([]);
      setLoadingBalance(false);
    }
  }, [user]);

  // Load reward pool data
  useEffect(() => {
    loadRewardPoolData();
  }, []);

  // Load user data
  const loadUserData = async (userId: string) => {
    setLoadingBalance(true);
    try {
      // Get user balance from service
      const balance = await getUserDarePoints(userId);
      setUserBalance(balance);
      
      // Get transaction history
      const userTransactions = getUserTransactions(userId);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoadingBalance(false);
    }
  };

  // Load reward pool data from local storage
  const loadRewardPoolData = () => {
    try {
      const storedRewardPool = localStorage.getItem(REWARD_POOL_KEY);
      if (storedRewardPool) {
        setRewardPool(JSON.parse(storedRewardPool));
      } else {
        // Initialize reward pool with default values
        const defaultRewardPool: RewardPool = {
          totalPoints: 1000, // Initial reward pool amount
          transactions: []
        };
        setRewardPool(defaultRewardPool);
        localStorage.setItem(REWARD_POOL_KEY, JSON.stringify(defaultRewardPool));
      }
    } catch (error) {
      console.error('Error loading reward pool data:', error);
    }
  };

  // Save reward pool data to local storage
  const saveRewardPoolData = (pool: RewardPool) => {
    localStorage.setItem(REWARD_POOL_KEY, JSON.stringify(pool));
  };

  // Deduct points for placing a bet
  const deductPoints = async (amount: number, betId: string, description: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Please sign in to place bets');
      return false;
    }

    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return false;
    }

    if (userBalance < amount) {
      toast.error('Insufficient balance');
      return false;
    }

    try {
      // Use service to deduct points
      const success = await deductBetPoints(user.id, amount, betId);
      
      if (success) {
        // Update local state
        setUserBalance(prev => prev - amount);
        
        // Update reward pool
        const poolTransaction: DareTransaction = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          userId: user.id,
          amount: amount,
          type: 'DEPOSIT',
          description: `Deposit from bet: ${betId}`,
          betId,
          status: 'COMPLETED'
        };
        
        const newRewardPool = {
          totalPoints: rewardPool.totalPoints + amount,
          transactions: [...rewardPool.transactions, poolTransaction]
        };
        
        setRewardPool(newRewardPool);
        saveRewardPoolData(newRewardPool);
        
        // Get updated transactions
        const updatedTransactions = getUserTransactions(user.id);
        setTransactions(updatedTransactions);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deducting points:', error);
      toast.error('Failed to process transaction');
      return false;
    }
  };

  // Add points from bet wins or rewards
  const addPoints = async (
    amount: number,
    type: 'BET_WON' | 'REWARD',
    description: string,
    betId?: string
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Please sign in to receive rewards');
      return false;
    }

    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return false;
    }

    try {
      let success = false;
      
      if (type === 'BET_WON' && betId) {
        // Use service for bet win
        success = await addBetWinPoints(user.id, amount, betId);
      } else {
        // Use service for general rewards
        success = await awardPoints(user.id, amount, description);
      }
      
      if (success) {
        // Update local state
        setUserBalance(prev => prev + amount);
        
        // Update reward pool for bet wins (taken from pool)
        if (type === 'BET_WON') {
          const poolTransaction: DareTransaction = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            userId: user.id,
            amount: -amount,
            type: 'WITHDRAWAL',
            description: `Reward to user: ${user.id}`,
            betId,
            status: 'COMPLETED'
          };
          
          const newRewardPool = {
            totalPoints: Math.max(0, rewardPool.totalPoints - amount),
            transactions: [...rewardPool.transactions, poolTransaction]
          };
          
          setRewardPool(newRewardPool);
          saveRewardPoolData(newRewardPool);
        }
        
        // Get updated transactions
        const updatedTransactions = getUserTransactions(user.id);
        setTransactions(updatedTransactions);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error adding points:', error);
      toast.error('Failed to process reward');
      return false;
    }
  };

  // Get transaction history
  const getTransactionHistory = (): DareTransaction[] => {
    return transactions;
  };

  // Get reward pool info
  const getRewardPoolInfo = (): RewardPool => {
    return rewardPool;
  };

  // Export transactions as JSON
  const exportTransactions = (): string => {
    return JSON.stringify(transactions, null, 2);
  };

  // Context value
  const contextValue: DarePointsContextType = {
    userBalance,
    loadingBalance,
    rewardPool,
    transactions,
    deductPoints,
    addPoints,
    getTransactionHistory,
    getRewardPoolInfo,
    exportTransactions
  };

  return (
    <DarePointsContext.Provider value={contextValue}>
      {children}
    </DarePointsContext.Provider>
  );
};

// Custom hook to use the context
export const useDarePoints = (): DarePointsContextType => {
  const context = useContext(DarePointsContext);
  if (context === undefined) {
    throw new Error('useDarePoints must be used within a DarePointsProvider');
  }
  return context;
}; 