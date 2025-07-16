import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import {
  Transaction,
  DEFAULT_POINTS,
  getTotalUserPoints,
  getUserFreePoints,
  getUserReservedPoints,
  reservePoints,
  freePoints,
  recordTransaction,
  getUserTransactions,
  deductBetPoints,
  addBetWinPoints,
  awardPoints
} from '../services/pointsService';
import { Escrow } from '../types';

// Define the context type
interface PointsContextType {
  userBalance: number;
  freePointsBalance: number;
  reservedPointsBalance: number;
  loadingBalance: boolean;
  transactions: Transaction[];
  escrowedPoints: number;
  deductPoints: (amount: number, betId: string, description: string, silent?: boolean) => Promise<boolean>;
  addPoints: (amount: number, type: 'BET_WON' | 'REWARD', description: string, betId?: string) => Promise<boolean>;
  getTransactionHistory: () => Transaction[];
  exportTransactions: () => string; // Export transactions as JSON string
  createBetEscrow: (betId: string, amount: number, silent?: boolean) => Promise<Escrow | null>;
  acceptBetEscrow: (escrowId: string, amount: number) => Promise<Escrow | null>;
  settleBetEscrow: (escrowId: string, winnerId: string) => Promise<boolean>;
  refundBetEscrow: (escrowId: string) => Promise<boolean>;
  getEscrowInfo: (escrowId: string) => Escrow | null;
  getEscrowByBet: (betId: string) => Escrow | null;
}

// Create the context
const PointsContext = createContext<PointsContextType | undefined>(undefined);

// Provider component
export const PointsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState<number>(0);
  const [freePointsBalance, setFreePointsBalance] = useState<number>(0);
  const [reservedPointsBalance, setReservedPointsBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [escrowedPoints] = useState<number>(0); // Kept for type compatibility but not used

  // Load user balance and transactions when user changes
  useEffect(() => {
    if (user?.userId) {
      loadUserData(user.userId);
    } else {
      // Reset state when no account is connected
      setUserBalance(0);
      setFreePointsBalance(0);
      setReservedPointsBalance(0);
      setTransactions([]);
      setLoadingBalance(false);
    }
  }, [user]);

  // Set up a real-time polling for balance updates
  useEffect(() => {
    if (!user?.userId) return;

    // Update the balance every 10 seconds to ensure it's current
    const intervalId = setInterval(() => {
      refreshUserBalance(user.userId);
    }, 10000);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [user?.userId]);

  // Load user data
  const loadUserData = async (userId: string) => {
    setLoadingBalance(true);
    try {
      // Get user balance from service
      const totalBalance = await getTotalUserPoints(userId);
      const freePoints = await getUserFreePoints(userId);
      const reservedPoints = await getUserReservedPoints(userId);
      
      setUserBalance(totalBalance);
      setFreePointsBalance(freePoints);
      setReservedPointsBalance(reservedPoints);
      
      // Get transaction history
      const userTransactions = await getUserTransactions(userId);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoadingBalance(false);
    }
  };

  // Refresh just the user balance
  const refreshUserBalance = async (userId: string) => {
    try {
      const totalBalance = await getTotalUserPoints(userId);
      const freePoints = await getUserFreePoints(userId);
      const reservedPoints = await getUserReservedPoints(userId);
      
      setUserBalance(totalBalance);
      setFreePointsBalance(freePoints);
      setReservedPointsBalance(reservedPoints);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  // Deduct points for placing a bet
  const deductPoints = async (amount: number, betId: string, description: string, silent: boolean = false): Promise<boolean> => {
    if (!user?.userId) {
      if (!silent) toast.error('Please sign in to place bets');
      return false;
    }

    if (amount <= 0) {
      if (!silent) toast.error('Amount must be greater than 0');
      return false;
    }

    if (freePointsBalance < amount) {
      if (!silent) toast.error('Insufficient balance');
      return false;
    }

    try {
      // Use service to deduct points
      const success = await deductBetPoints(user.userId, amount, betId);
      
      if (success) {
        // Update local state
        setFreePointsBalance(prev => prev - amount);
        setReservedPointsBalance(prev => prev + amount);
        
        // Add to transaction history
        const newTransaction: Transaction = {
          id: `${Date.now()}`,
          userId: user.userId,
          amount: -amount,
          type: 'BET_PLACED',
          description,
          betId,
          timestamp: Date.now()
        };
        setTransactions(prev => [newTransaction, ...prev]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deducting points:', error);
      if (!silent) toast.error('Failed to deduct points');
      return false;
    }
  };

  // Add points (from winning bet or reward)
  const addPoints = async (
    amount: number,
    type: 'BET_WON' | 'REWARD',
    description: string,
    betId?: string
  ): Promise<boolean> => {
    if (!user?.userId) {
      toast.error('Please sign in to receive points');
      return false;
    }

    try {
      let success;
      if (type === 'BET_WON') {
        success = await addBetWinPoints(user.userId, amount, betId!);
      } else {
        success = await awardPoints(user.userId, amount, description);
      }
      
      if (success) {
        // Update local state
        setUserBalance(prev => prev + amount);
        setFreePointsBalance(prev => prev + amount);
        
        // Add to transaction history
        const newTransaction: Transaction = {
          id: `${Date.now()}`,
          userId: user.userId,
          amount: amount,
          type,
          description,
          betId,
          timestamp: Date.now()
        };
        setTransactions(prev => [newTransaction, ...prev]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding points:', error);
      toast.error('Failed to add points');
      return false;
    }
  };

  const getTransactionHistory = (): Transaction[] => {
    return transactions;
  };

  const exportTransactions = (): string => {
    return JSON.stringify(transactions, null, 2);
  };

  // Stub functions for escrow functionality (to be removed)
  const createBetEscrow = async (): Promise<Escrow | null> => null;
  const acceptBetEscrow = async (): Promise<Escrow | null> => null;
  const settleBetEscrow = async (): Promise<boolean> => false;
  const refundBetEscrow = async (): Promise<boolean> => false;
  const getEscrowInfo = (): Escrow | null => null;
  const getEscrowByBet = (): Escrow | null => null;

  return (
    <PointsContext.Provider value={{
      userBalance,
      freePointsBalance,
      reservedPointsBalance,
      loadingBalance,
      transactions,
      escrowedPoints,
      deductPoints,
      addPoints,
      getTransactionHistory,
      exportTransactions,
      createBetEscrow,
      acceptBetEscrow,
      settleBetEscrow,
      refundBetEscrow,
      getEscrowInfo,
      getEscrowByBet
    }}>
      {children}
    </PointsContext.Provider>
  );
};

// Custom hook to use points context
export const usePoints = (): PointsContextType => {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
}; 