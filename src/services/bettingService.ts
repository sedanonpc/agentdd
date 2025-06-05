import { Bet, BetStatus } from '../types';
import { INITIAL_MOCK_BETS } from '../data/mockBets';

// Function to generate a unique transaction ID
const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(16);
  const randomPart = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
  return `0x${timestamp}${randomPart}`.toUpperCase();
};

// Initialize the mock database with our seed data
let MOCK_BETS: Bet[] = [...INITIAL_MOCK_BETS];

// Log the initial state for debugging
console.log('Initialized mock bets:', MOCK_BETS.length);

export const createBet = async (
  creator: string,
  matchId: string,
  teamId: string,
  amount: string,
  description: string
): Promise<Bet> => {
  // In a real implementation, this would create a smart contract transaction
  const newBet: Bet = {
    id: Date.now().toString(),
    matchId,
    creator,
    amount,
    teamId,
    description,
    status: BetStatus.OPEN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    chatId: Date.now().toString(),
    transactionId: generateTransactionId() // Generate a unique transaction ID
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
    bet => bet.creator === userAddress || bet.taker === userAddress
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

export const acceptBet = async (betId: string, takerAddress: string): Promise<Bet> => {
  // Find the bet
  const betIndex = MOCK_BETS.findIndex(bet => bet.id === betId);
  
  if (betIndex === -1) {
    throw new Error('Bet not found');
  }
  
  // Update the bet
  const updatedBet = {
    ...MOCK_BETS[betIndex],
    taker: takerAddress,
    status: BetStatus.ACTIVE,
    updatedAt: new Date().toISOString()
  };
  
  MOCK_BETS[betIndex] = updatedBet;
  
  console.log(`Bet ${betId} accepted by ${takerAddress}`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(updatedBet);
    }, 1000); // Simulate network delay
  });
};

export const settleBet = async (betId: string): Promise<Bet> => {
  // Find the bet
  const betIndex = MOCK_BETS.findIndex(bet => bet.id === betId);
  
  if (betIndex === -1) {
    throw new Error('Bet not found');
  }
  
  // Update the bet
  const updatedBet = {
    ...MOCK_BETS[betIndex],
    status: BetStatus.COMPLETED,
    updatedAt: new Date().toISOString()
  };
  
  MOCK_BETS[betIndex] = updatedBet;
  
  console.log(`Bet ${betId} settled`);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(updatedBet);
    }, 1000); // Simulate network delay
  });
};