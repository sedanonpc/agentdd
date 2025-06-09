import { Escrow } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Local storage key for escrows
const ESCROW_STORAGE_KEY = 'daredevil_escrows';

/**
 * Get all escrows from local storage
 */
export const getAllEscrows = (): Escrow[] => {
  try {
    const storedEscrows = localStorage.getItem(ESCROW_STORAGE_KEY);
    return storedEscrows ? JSON.parse(storedEscrows) : [];
  } catch (error) {
    console.error('Error getting escrows:', error);
    return [];
  }
};

/**
 * Save all escrows to local storage
 */
export const saveEscrows = (escrows: Escrow[]): void => {
  try {
    localStorage.setItem(ESCROW_STORAGE_KEY, JSON.stringify(escrows));
  } catch (error) {
    console.error('Error saving escrows:', error);
  }
};

/**
 * Get an escrow by ID
 */
export const getEscrowById = (escrowId: string): Escrow | null => {
  const escrows = getAllEscrows();
  const escrow = escrows.find(e => e.id === escrowId);
  return escrow || null;
};

/**
 * Get escrows by bet ID
 */
export const getEscrowByBetId = (betId: string): Escrow | null => {
  const escrows = getAllEscrows();
  const escrow = escrows.find(e => e.betId === betId);
  return escrow || null;
};

/**
 * Create a new escrow for a bet
 */
export const createEscrow = (
  betId: string,
  creatorId: string,
  creatorAmount: number
): Escrow => {
  const id = uuidv4();
  const newEscrow: Escrow = {
    id,
    betId,
    creatorId,
    totalAmount: creatorAmount,
    creatorAmount,
    acceptorAmount: 0,
    status: 'PENDING',
    timestamp: Date.now()
  };
  
  const escrows = getAllEscrows();
  escrows.push(newEscrow);
  saveEscrows(escrows);
  
  return newEscrow;
};

/**
 * Add acceptor to escrow when bet is accepted
 */
export const addAcceptorToEscrow = (
  escrowId: string,
  acceptorId: string,
  acceptorAmount: number
): Escrow | null => {
  const escrows = getAllEscrows();
  const escrowIndex = escrows.findIndex(e => e.id === escrowId);
  
  if (escrowIndex === -1) return null;
  
  const updatedEscrow: Escrow = {
    ...escrows[escrowIndex],
    acceptorId,
    acceptorAmount,
    totalAmount: escrows[escrowIndex].creatorAmount + acceptorAmount,
    status: 'ACTIVE'
  };
  
  escrows[escrowIndex] = updatedEscrow;
  saveEscrows(escrows);
  
  return updatedEscrow;
};

/**
 * Complete an escrow and distribute funds to winner
 */
export const completeEscrow = (escrowId: string, winnerId: string): Escrow | null => {
  const escrows = getAllEscrows();
  const escrowIndex = escrows.findIndex(e => e.id === escrowId);
  
  if (escrowIndex === -1) return null;
  
  const escrow = escrows[escrowIndex];
  
  // Ensure the escrow is active
  if (escrow.status !== 'ACTIVE') {
    console.error('Cannot complete escrow that is not active');
    return null;
  }
  
  // Ensure we have both parties
  if (!escrow.creatorId || !escrow.acceptorId) {
    console.error('Escrow missing creator or acceptor');
    return null;
  }
  
  const updatedEscrow: Escrow = {
    ...escrow,
    status: 'COMPLETED',
  };
  
  escrows[escrowIndex] = updatedEscrow;
  saveEscrows(escrows);
  
  return updatedEscrow;
};

/**
 * Refund an escrow (e.g., for cancelled bets)
 */
export const refundEscrow = (escrowId: string): Escrow | null => {
  const escrows = getAllEscrows();
  const escrowIndex = escrows.findIndex(e => e.id === escrowId);
  
  if (escrowIndex === -1) return null;
  
  const escrow = escrows[escrowIndex];
  
  const updatedEscrow: Escrow = {
    ...escrow,
    status: 'REFUNDED',
  };
  
  escrows[escrowIndex] = updatedEscrow;
  saveEscrows(escrows);
  
  return updatedEscrow;
};

/**
 * Get the total amount in all active escrows
 */
export const getTotalEscrowAmount = (): number => {
  const escrows = getAllEscrows();
  return escrows
    .filter(e => e.status === 'ACTIVE' || e.status === 'PENDING')
    .reduce((total, escrow) => total + escrow.totalAmount, 0);
}; 