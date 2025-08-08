/**
 * Odds Utilities
 * 
 * Functions for converting and formatting betting odds
 */

/**
 * Format decimal odds to a readable string
 */
export const formatDecimalOdds = (odds: number): string => {
  if (!odds || odds <= 1) {
    return 'N/A';
  }
  return odds.toFixed(2);
};

/**
 * Convert decimal odds to American odds
 */
export const decimalToAmerican = (decimalOdds: number): number => {
  if (!decimalOdds || decimalOdds <= 1) {
    return 0;
  }
  
  if (decimalOdds >= 2) {
    return Math.round((decimalOdds - 1) * 100);
  } else {
    return Math.round(-100 / (decimalOdds - 1));
  }
};

/**
 * Convert American odds to decimal odds
 */
export const americanToDecimal = (americanOdds: number): number => {
  if (americanOdds === 0) {
    return 1;
  }
  
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1;
  } else {
    return (100 / Math.abs(americanOdds)) + 1;
  }
};

/**
 * Calculate implied probability from decimal odds
 */
export const decimalToImpliedProbability = (decimalOdds: number): number => {
  if (!decimalOdds || decimalOdds <= 1) {
    return 0;
  }
  return (1 / decimalOdds) * 100;
};

/**
 * Calculate implied probability from American odds
 */
export const americanToImpliedProbability = (americanOdds: number): number => {
  if (americanOdds === 0) {
    return 0;
  }
  
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}; 