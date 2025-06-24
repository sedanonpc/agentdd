import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import {
  DareTransaction,
  DEFAULT_POINTS,
  getUserDarePoints,
  getUserFreeDarePoints,
  getUserReservedDarePoints,
  updateUserDarePoints,
  adjustUserDarePoints,
  reserveDarePoints,
  freeDarePoints,
  recordTransaction,
  getUserTransactions,
  deductBetPoints,
  addBetWinPoints,
  awardPoints
} from '../services/darePointsService';
import {
  getAllEscrows,
  getEscrowById,
  getEscrowByBetId,
  createEscrow,
  addAcceptorToEscrow,
  completeEscrow,
  refundEscrow,
  getTotalEscrowAmount
} from '../services/escrowService';
import { Escrow } from '../types';

// Define the structure for the Reward Pool
interface RewardPool {
  totalPoints: number;
  transactions: DareTransaction[];
}

// Define the context type
interface DarePointsContextType {
  userBalance: number;
  freeDarePointsBalance: number;
  reservedDarePointsBalance: number;
  loadingBalance: boolean;
  rewardPool: RewardPool;
  transactions: DareTransaction[];
  escrowedPoints: number;
  deductPoints: (amount: number, betId: string, description: string, silent?: boolean) => Promise<boolean>;
  addPoints: (amount: number, type: 'BET_WON' | 'REWARD', description: string, betId?: string) => Promise<boolean>;
  getTransactionHistory: () => DareTransaction[];
  getRewardPoolInfo: () => RewardPool;
  exportTransactions: () => string; // Export transactions as JSON string
  createBetEscrow: (betId: string, amount: number, silent?: boolean) => Promise<Escrow | null>;
  acceptBetEscrow: (escrowId: string, amount: number) => Promise<Escrow | null>;
  settleBetEscrow: (escrowId: string, winnerId: string) => Promise<boolean>;
  refundBetEscrow: (escrowId: string) => Promise<boolean>;
  getEscrowInfo: (escrowId: string) => Escrow | null;
  getEscrowByBet: (betId: string) => Escrow | null;
}

// Create the context
const DarePointsContext = createContext<DarePointsContextType | undefined>(undefined);

// Local Storage Keys
const REWARD_POOL_KEY = 'daredevil_reward_pool';

// Provider component
export const DarePointsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState<number>(0);
  const [freeDarePointsBalance, setFreeDarePointsBalance] = useState<number>(0);
  const [reservedDarePointsBalance, setReservedDarePointsBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<DareTransaction[]>([]);
  const [rewardPool, setRewardPool] = useState<RewardPool>({ totalPoints: 0, transactions: [] });
  const [escrowedPoints, setEscrowedPoints] = useState<number>(0);

  // Load user balance and transactions when user changes
  useEffect(() => {
    if (user?.id) {
      loadUserData(user.id);
    } else {
      // Reset state when no account is connected
      setUserBalance(0);
      setFreeDarePointsBalance(0);
      setReservedDarePointsBalance(0);
      setTransactions([]);
      setLoadingBalance(false);
    }
  }, [user]);

  // Load reward pool data
  useEffect(() => {
    loadRewardPoolData();
  }, []);

  // Set up a real-time polling for balance updates
  useEffect(() => {
    if (!user?.id) return;

    // Update the balance every 10 seconds to ensure it's current
    const intervalId = setInterval(() => {
      refreshUserBalance(user.id);
    }, 10000);

    // Update escrowed points
    updateEscrowedPoints();

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [user?.id]);

  // Load user data
  const loadUserData = async (userId: string) => {
    setLoadingBalance(true);
    try {
      // Get user balance from service
      const totalBalance = await getUserDarePoints(userId);
      const freeDarePoints = await getUserFreeDarePoints(userId);
      const reservedDarePoints = await getUserReservedDarePoints(userId);
      
      setUserBalance(totalBalance);
      setFreeDarePointsBalance(freeDarePoints);
      setReservedDarePointsBalance(reservedDarePoints);
      
      // Get transaction history
      const userTransactions = getUserTransactions(userId);
      setTransactions(userTransactions);

      // Update escrowed points
      updateEscrowedPoints();
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
      const totalBalance = await getUserDarePoints(userId);
      const freeDarePoints = await getUserFreeDarePoints(userId);
      const reservedDarePoints = await getUserReservedDarePoints(userId);
      
      setUserBalance(totalBalance);
      setFreeDarePointsBalance(freeDarePoints);
      setReservedDarePointsBalance(reservedDarePoints);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  // Update escrowed points
  const updateEscrowedPoints = () => {
    if (!user?.id) return;
    
    try {
      // Get all escrows from service
      const allEscrows = getAllEscrows();
      
      // Calculate user's escrowed points
      const userEscrowedPoints = allEscrows
        .filter(escrow => 
          (escrow.creatorId === user.id || escrow.acceptorId === user.id) && 
          (escrow.status === 'PENDING' || escrow.status === 'ACTIVE')
        )
        .reduce((total, escrow) => {
          if (escrow.creatorId === user.id) {
            return total + escrow.creatorAmount;
          } else if (escrow.acceptorId === user.id) {
            return total + escrow.acceptorAmount;
          }
          return total;
        }, 0);
      
      setEscrowedPoints(userEscrowedPoints);
      
      // This should match the reserved points, but we keep both for now
      // as the escrow system might not be fully integrated with the new points system yet
      setReservedDarePointsBalance(prev => {
        if (Math.abs(prev - userEscrowedPoints) > 1) {
          // If there's a significant difference, update the reserved balance
          return userEscrowedPoints;
        }
        return prev;
      });
    } catch (error) {
      console.error('Error updating escrowed points:', error);
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
  const deductPoints = async (amount: number, betId: string, description: string, silent: boolean = false): Promise<boolean> => {
    if (!user?.id) {
      if (!silent) toast.error('Please sign in to place bets');
      return false;
    }

    if (amount <= 0) {
      if (!silent) toast.error('Amount must be greater than 0');
      return false;
    }

    if (freeDarePointsBalance < amount) {
      if (!silent) toast.error('Insufficient balance');
      return false;
    }

    try {
      // Use service to deduct points
      const success = await deductBetPoints(user.id, amount, betId);
      
      if (success) {
        // Update local state
        setFreeDarePointsBalance(prev => prev - amount);
        setReservedDarePointsBalance(prev => prev + amount);
        
        // Skip creating escrow if silent (it will be created separately in bet acceptance flow)
        if (!silent) {
          // Create escrow for the bet
          await createBetEscrow(betId, amount);
        }
        
        // Update escrowed points
        updateEscrowedPoints();
        
        // Record transaction
        const transaction: DareTransaction = {
          id: `tx_${Date.now()}`,
          userId: user.id,
          amount: -amount,
          type: 'BET_PLACED',
          description,
          timestamp: Date.now(),
          betId,
          status: 'COMPLETED'
        };
        recordTransaction(transaction);
        setTransactions(prev => [transaction, ...prev]);
        
        if (!silent) toast.success(`Bet placed with ${amount} DARE points`);
        return true;
      }
      
      if (!silent) toast.error('Failed to place bet');
      return false;
    } catch (error) {
      console.error('Error deducting points:', error);
      if (!silent) toast.error('Failed to place bet');
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
        // For bet wins, we need to unprovision points first if they were in escrow
        await freeDarePoints(user.id, amount);
        
        // Use service for bet win
        success = await addBetWinPoints(user.id, amount, betId);
      } else {
        // Use service for general rewards
        success = await awardPoints(user.id, amount, description);
      }
      
      if (success) {
        // Update local state
        setFreeDarePointsBalance(prev => prev + amount);
        
        // Get updated transactions
        const updatedTransactions = getUserTransactions(user.id);
        setTransactions(updatedTransactions);
        
        // Update escrowed points
        updateEscrowedPoints();
        
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

  // Create a new escrow for a bet
  const createBetEscrow = async (betId: string, amount: number, silent: boolean = false): Promise<Escrow | null> => {
    if (!user?.id) {
      if (!silent) toast.error('You must be logged in to create an escrow');
      return null;
    }
    
    if (freeDarePointsBalance < amount) {
      if (!silent) toast.error(`Insufficient balance. You need ${amount} $DARE points to create this escrow.`);
      return null;
    }
    
    try {
      // Call the createEscrow function with the required parameters
      const escrow = createEscrow(betId, user.id, amount);
      
      // Update UI with toast only if not silent
      if (!silent) {
        toast.success(`Successfully created escrow for ${amount} $DARE points`);
      }
      
      // Update escrowed points
      updateEscrowedPoints();
      
      return escrow;
    } catch (error) {
      console.error('Error creating bet escrow:', error);
      if (!silent) toast.error('Failed to create escrow. Please try again.');
      return null;
    }
  };

  // Accept a bet and add to escrow
  const acceptBetEscrow = async (escrowId: string, amount: number): Promise<Escrow | null> => {
    if (!user?.id) return null;
    
    try {
      // First deduct points from user
      const success = await deductPoints(amount, escrowId, '', true);
      
      if (success) {
        // Update local state
        setFreeDarePointsBalance(prev => prev - amount);
        
        // Add to escrow
        const updatedEscrow = addAcceptorToEscrow(escrowId, user.id, amount);
        
        // Update escrowed points
        updateEscrowedPoints();
        
        return updatedEscrow;
      }
      
      return null;
    } catch (error) {
      console.error('Error accepting bet escrow:', error);
      return null;
    }
  };

  // Settle a bet escrow
  const settleBetEscrow = async (escrowId: string, winnerId: string): Promise<boolean> => {
    try {
      const escrow = getEscrowById(escrowId);
      
      if (!escrow) {
        console.error('Escrow not found');
        return false;
      }
      
      // Complete the escrow
      const completedEscrow = completeEscrow(escrowId, winnerId);
      
      if (!completedEscrow) {
        console.error('Failed to complete escrow');
        return false;
      }
      
      // Award the total amount to the winner
      const success = await awardPoints(
        winnerId,
        completedEscrow.totalAmount,
        `Won bet ${completedEscrow.betId}`
      );
      
      if (success && winnerId === user?.id) {
        // Update local state if current user is the winner
        setFreeDarePointsBalance(prev => prev + completedEscrow.totalAmount);
      }
      
      // Update escrowed points
      updateEscrowedPoints();
      
      return success;
    } catch (error) {
      console.error('Error settling bet escrow:', error);
      return false;
    }
  };

  // Refund a bet escrow
  const refundBetEscrow = async (escrowId: string): Promise<boolean> => {
    try {
      const escrow = getEscrowById(escrowId);
      
      if (!escrow) {
        console.error('Escrow not found');
        return false;
      }
      
      // Refund the escrow
      const refundedEscrow = refundEscrow(escrowId);
      
      if (!refundedEscrow) {
        console.error('Failed to refund escrow');
        return false;
      }
      
      // Refund the creator
      if (escrow.creatorId) {
        await awardPoints(
          escrow.creatorId,
          escrow.creatorAmount,
          `Refund from bet ${escrow.betId}`
        );
        
        if (escrow.creatorId === user?.id) {
          // Update local state if current user is the creator
          setFreeDarePointsBalance(prev => prev + escrow.creatorAmount);
        }
      }
      
      // Refund the acceptor if exists
      if (escrow.acceptorId && escrow.acceptorAmount > 0) {
        await awardPoints(
          escrow.acceptorId,
          escrow.acceptorAmount,
          `Refund from bet ${escrow.betId}`
        );
        
        if (escrow.acceptorId === user?.id) {
          // Update local state if current user is the acceptor
          setFreeDarePointsBalance(prev => prev + escrow.acceptorAmount);
        }
      }
      
      // Update escrowed points
      updateEscrowedPoints();
      
      return true;
    } catch (error) {
      console.error('Error refunding bet escrow:', error);
      return false;
    }
  };

  // Get escrow by ID
  const getEscrowInfo = (escrowId: string): Escrow | null => {
    return getEscrowById(escrowId);
  };

  // Get escrow by bet ID
  const getEscrowByBet = (betId: string): Escrow | null => {
    return getEscrowByBetId(betId);
  };

  // Context value
  const contextValue: DarePointsContextType = {
    userBalance,
    freeDarePointsBalance,
    reservedDarePointsBalance,
    loadingBalance,
    rewardPool,
    transactions,
    escrowedPoints,
    deductPoints,
    addPoints,
    getTransactionHistory,
    getRewardPoolInfo,
    exportTransactions,
    createBetEscrow,
    acceptBetEscrow,
    settleBetEscrow,
    refundBetEscrow,
    getEscrowInfo,
    getEscrowByBet
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