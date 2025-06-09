// Match Types
export interface Team {
  id: string;
  name: string;
  logo?: string;
}

export interface Odds {
  h2h: number; // Decimal odds
}

export interface BookmakerOdds {
  key: string;
  title: string;
  markets: {
    key: string;
    outcomes: {
      name: string;
      price: number;
    }[];
  }[];
}

export interface Match {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: Team;
  away_team: Team;
  bookmakers: BookmakerOdds[];
  scores?: {
    home: number;
    away: number;
  };
  completed?: boolean;
}

// Betting Types
export enum BetStatus {
  OPEN = 'open',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum BetResult {
  PENDING = 'pending',
  WON = 'won',
  LOST = 'lost',
  DRAW = 'draw',
  VOID = 'void'
}

export interface Bet {
  id: string;
  creator: string;
  acceptor?: string;
  matchId: string;
  teamId: string;
  amount: number;
  escrowId?: string;
  status: BetStatus;
  timestamp: number;
  description?: string;
  transactionId?: string;
  chatId?: string;
  winnerId?: string;
  is_mock?: boolean; // Flag to identify mock data
}

// Chat Types
export interface Message {
  id: string;
  betId?: string;
  matchId?: string;
  global?: boolean;
  sender: string; // can be a user address, 'system', or 'daredevil'
  content: string;
  timestamp: string;
}

// Analysis Types
export interface MatchAnalysis {
  matchId: string;
  homeTeamWinProbability: number;
  awayTeamWinProbability: number;
  keyFactors: string[];
  recommendation?: string;
}

// Escrow Types
export interface Escrow {
  id: string;
  betId: string;
  creatorId: string;
  acceptorId?: string;
  totalAmount: number;
  creatorAmount: number;
  acceptorAmount: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REFUNDED';
  timestamp: number;
}

// Standings Types
export type ClinchedStatus = 'playoff' | 'division' | 'homeCourt' | null;

export interface StandingsTeam {
  name: string;
  wins: number;
  losses: number;
  winPercentage: number;
  last10: string;
  streak: string;
  clinched: ClinchedStatus;
}

export interface Division {
  name: string;
  teams: StandingsTeam[];
}

export interface Conference {
  name: string;
  divisions: Division[];
}