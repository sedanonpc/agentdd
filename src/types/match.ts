// New Match type matching the columns of the `matches` table
export interface Match {
  id: string;
  event_type: string; // e.g., 'basketball_nba', 'sandbox_metaverse'
  details_id: string;
  status: string; // e.g., 'upcoming', 'finished'
  scheduled_start_time: string;
  bookmakers?: BookmakerOdds[];
  created_at: string;
  updated_at: string;
  // Add any other columns from the matches table as needed
}

// NBA-specific match details
export interface NBAMatchDetail {
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

// Sandbox Metaverse-specific match details
export interface SandboxMetaverseMatchDetail {
  id: string;
  player1_id: string;
  player1_name: string;
  player1_subtitle?: string;
  player1_image_url?: string;
  player2_id: string;
  player2_name: string;
  player2_subtitle?: string;
  player2_image_url?: string;
  created_at: string;
  updated_at: string;
}

// Composite type for use in UI/service layer
export type MatchWithDetails =
  | { match: Match; details: NBAMatchDetail; event_type: 'basketball_nba' }
  | { match: Match; details: SandboxMetaverseMatchDetail; event_type: 'sandbox_metaverse' };

// Odds/bookmaker types (copied from existing types for convenience)
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