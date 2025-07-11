// Basic Types (defined first to avoid circular references)
export type DataSource = 'mock' | 'api' | 'yahoo' | 'database';

// Betting status enum
export enum BetStatus {
  OPEN = 'open',
  ACTIVE = 'active', 
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// New enums for multi-sport architecture
export type EventType = 'basketball_nba';
export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'cancelled';

// New basketball-specific details interface
export interface BasketballMatchDetails {
  id: string;
  home_team_id: string;
  home_team_name: string;
  home_team_logo?: string;
  away_team_id: string;
  away_team_name: string;
  away_team_logo?: string;
  season?: string;
  week?: number;
  scores?: any;
  venue_name?: string;
  venue_city?: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
}

// New universal match interface
export interface UniversalMatch {
  id: string;
  event_type: EventType;
  details_id: string;
  status: MatchStatus;
  scheduled_start_time: string;
  bookmakers?: BookmakerOdds[]; // Temporary: keeping for Phase 1 compatibility
  created_at: string;
  updated_at: string;
}

// Team interface (unchanged)
export interface Team {
  id: string;
  name: string;
  logo?: string;
  record?: string;
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

// Existing Match interface - keeping for backward compatibility during Phase 1
export interface Match {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string; // Will map from scheduled_start_time
  home_team: Team;
  away_team: Team;
  bookmakers?: BookmakerOdds[];
  scores?: any;
  completed?: boolean; // Will map from status
  sport_name?: string; // Optional for backward compatibility
  league_name?: string; // Optional for backward compatibility
}

// Betting Types
export type BetResult = 'pending' | 'won' | 'lost' | 'draw' | 'void';

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