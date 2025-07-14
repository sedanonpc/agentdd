/*
 * ⚠️ DEPRECATED - MARKED FOR REMOVAL ⚠️
 * 
 * This file is deprecated and scheduled for removal.
 * 
 * DO NOT USE THIS SERVICE IN NEW CODE.
 * DO NOT MODIFY OR EXTEND THIS SERVICE.
 * 
 * This service uses mock data and in-memory storage which is being replaced
 * by the new straightBetsService.ts that uses the straight_bets database table.
 * 
 * Current issues with this service:
 * - Uses mock data (MOCK_BETS array) instead of database
 * - Maintains state in memory which is lost on refresh
 * - Inconsistent with database-backed betStorageService
 * - Will be moved to src/services/for_removal/ folder
 * 
 * Use src/services/straightBetsService.ts instead.
 */

import { Bet, BetStatus } from '../../types';
import { INITIAL_MOCK_BETS } from '../../data/mockBets';
import { v4 as uuidv4 } from 'uuid';

// Function to generate a unique transaction ID
const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(16);
  const randomPart = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
  return `0x${timestamp}${randomPart}`.toUpperCase();
};

// Initialize the mock database with our seed data
let MOCK_BETS: Bet[] = [...INITIAL_MOCK_BETS];

// Convert old mock bets from string amounts to number
MOCK_BETS = MOCK_BETS.map(bet => ({
  ...bet,
  amount: typeof bet.amount === 'string' ? parseInt(bet.amount, 10) : bet.amount
}));

// Log the initial state for debugging
console.log('Initialized mock bets:', MOCK_BETS.length);

export const createBet = async (
  creator: string,
  matchId: string,
  teamId: string,
  amount: number,
  description: string,
  escrowId?: string
): Promise<Bet> => {
  // Generate a unique ID for the bet
  const betId = uuidv4();
  
  // Ensure amount is a number
  const numericAmount = typeof amount === 'string' ? parseInt(amount, 10) : amount;
  
  // In a real implementation, this would create a smart contract transaction
  const newBet: Bet = {
    id: betId,
    matchId,
    creator,
    amount: numericAmount,
    teamId,
    description,
    status: BetStatus.OPEN,
    timestamp: Date.now(),
    transactionId: generateTransactionId(), // Generate a unique transaction ID
    escrowId: escrowId // Store the escrow ID if provided
  };
  
  // Add to mock database
  MOCK_BETS.push(newBet);
  console.log('Created new bet, total bets:', MOCK_BETS.length);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(newBet);
    }, 1000); // Simulate network delay
  });
};

export const getBetsByUser = async (userAddress: string): Promise<Bet[]> => {
  const userBets = MOCK_BETS.filter(
    bet => bet.creator === userAddress || bet.acceptor === userAddress
  );
  
  console.log(`Found ${userBets.length} bets for user ${userAddress}`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(userBets);
    }, 500); // Simulate network delay
  });
};

export const getAllBets = async (): Promise<Bet[]> => {
  console.log(`Returning all ${MOCK_BETS.length} bets`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_BETS);
    }, 500); // Simulate network delay
  });
};

export const acceptBet = async (betId: string, takerAddress: string, escrowId: string): Promise<Bet> => {
  // Find the bet
  const betIndex = MOCK_BETS.findIndex(bet => bet.id === betId);
  
  if (betIndex === -1) {
    throw new Error('Bet not found');
  }
  
  // Update the bet
  const updatedBet = {
    ...MOCK_BETS[betIndex],
    acceptor: takerAddress,
    escrowId,
    status: BetStatus.ACTIVE,
    timestamp: Date.now()
  };
  
  MOCK_BETS[betIndex] = updatedBet;
  
  console.log(`Bet ${betId} accepted by ${takerAddress}`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(updatedBet);
    }, 1000); // Simulate network delay
  });
};

export const settleBet = async (betId: string, winnerId: string): Promise<Bet> => {
  // Find the bet
  const betIndex = MOCK_BETS.findIndex(bet => bet.id === betId);
  
  if (betIndex === -1) {
    throw new Error('Bet not found');
  }
  
  // Update the bet
  const updatedBet = {
    ...MOCK_BETS[betIndex],
    status: BetStatus.COMPLETED,
    timestamp: Date.now(),
    winnerId // Add the winner ID to the bet record
  };
  
  MOCK_BETS[betIndex] = updatedBet;
  
  console.log(`Bet ${betId} settled, winner: ${winnerId}`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(updatedBet);
    }, 1000); // Simulate network delay
  });
};

export const cancelBet = async (betId: string): Promise<Bet> => {
  // Find the bet
  const betIndex = MOCK_BETS.findIndex(bet => bet.id === betId);
  
  if (betIndex === -1) {
    throw new Error('Bet not found');
  }
  
  // Update the bet
  const updatedBet = {
    ...MOCK_BETS[betIndex],
    status: BetStatus.CANCELLED,
    timestamp: Date.now()
  };
  
  MOCK_BETS[betIndex] = updatedBet;
  
  console.log(`Bet ${betId} cancelled`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(updatedBet);
    }, 1000); // Simulate network delay
  });
};