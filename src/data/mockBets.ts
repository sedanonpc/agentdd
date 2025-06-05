import { Bet, BetStatus } from '../types';

// Sample mock wallet addresses
const ADDRESSES = {
  USER1: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  USER2: '0x123d35Ce1234C0532925a3b844Bc454e4438f123',
  USER3: '0x456d35Cf6788C0532925a3b844Bc454e4438f456',
  USER4: '0xABCd35Cg1234C0532925a3b844Bc454e4438fABC',
};

// Generate transaction IDs
const generateTransactionId = (): string => {
  const timestamp = Date.now().toString(16);
  const randomPart = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0');
  return `0x${timestamp}${randomPart}`.toUpperCase();
};

// Initial mock bets data
export const INITIAL_MOCK_BETS: Bet[] = [
  {
    id: '1',
    matchId: 'a704b5a09bc4a7d7f28930aa6e964db7',
    creator: ADDRESSES.USER1,
    amount: '0.05',
    teamId: '7b1c2c17-f0df-4ea7-9a98-902bc2751c67', // Lakers
    description: 'Lakers will win by at least 5 points!',
    status: BetStatus.OPEN,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    chatId: '1',
    transactionId: generateTransactionId()
  },
  {
    id: '2',
    matchId: 'c0d28176ae9aae71aad8f45f95641f9c',
    creator: ADDRESSES.USER2,
    amount: '0.1',
    teamId: '583ece50-fb46-11e1-82cb-f4ce4684ea4c', // Celtics
    description: 'Celtics are on fire! Easy win.',
    status: BetStatus.OPEN,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    chatId: '2',
    transactionId: generateTransactionId()
  },
  {
    id: '3',
    matchId: '9396e7db11c600a00f24cc54dc99abd1',
    creator: ADDRESSES.USER3,
    amount: '0.02',
    teamId: '583ed0ac-fb46-11e1-82cb-f4ce4684ea4c', // Warriors
    description: 'Warriors have the best offense, easy bet!',
    status: BetStatus.OPEN,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    chatId: '3',
    transactionId: generateTransactionId()
  },
  {
    id: '4',
    matchId: 'c6c42068d7e39ca44bd64dfe64b649d5',
    creator: ADDRESSES.USER4,
    amount: '0.08',
    teamId: '583ecda6-fb46-11e1-82cb-f4ce4684ea4c', // Bucks
    description: 'Bucks will dominate in the paint, easy money!',
    status: BetStatus.OPEN,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    chatId: '4',
    transactionId: generateTransactionId()
  },
  {
    id: '5',
    matchId: 'a704b5a09bc4a7d7f28930aa6e964db7',
    creator: ADDRESSES.USER1,
    amount: '0.15',
    teamId: '583ecae2-fb46-11e1-82cb-f4ce4684ea4c', // Heat
    description: 'Heat will surprise everyone tonight!',
    status: BetStatus.OPEN,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    chatId: '5',
    transactionId: generateTransactionId()
  }
]; 