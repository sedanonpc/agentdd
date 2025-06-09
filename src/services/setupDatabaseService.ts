import { supabase } from './supabaseService';

/**
 * Setup database schema for DARE points, bets, and leaderboards
 * This will be called once when the app initializes
 */
export const setupDatabase = async (): Promise<void> => {
  try {
    console.log('Setting up database schema...');
    
    // 1. Check and create user_profiles table
    const { error: userTableExistsError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (userTableExistsError) {
      console.log('Creating user_profiles table...');
      const { error: createUserTableError } = await supabase.rpc('setup_user_profiles_table');
      
      if (createUserTableError && createUserTableError.code !== 'PGRST301') {
        console.error('Error creating user_profiles table:', createUserTableError);
        await createUserProfilesTableFallback();
      }
    }
    
    // 2. Check and add dare_points column
    const { error: columnExistsError } = await supabase
      .from('user_profiles')
      .select('dare_points')
      .limit(1);
    
    if (columnExistsError && columnExistsError.message.includes('dare_points')) {
      console.log('Adding dare_points column...');
      const { error: addColumnError } = await supabase.rpc('add_dare_points_column');
      
      if (addColumnError && addColumnError.code !== 'PGRST301') {
        console.error('Error adding dare_points column:', addColumnError);
        await addDarePointsColumnFallback();
      }
    }
    
    // 3. Check and create bets table
    const { error: betsTableExistsError } = await supabase
      .from('bets')
      .select('id')
      .limit(1);
    
    if (betsTableExistsError) {
      console.log('Creating bets table...');
      const { error: createBetsTableError } = await supabase.rpc('setup_bets_table');
      
      if (createBetsTableError && createBetsTableError.code !== 'PGRST301') {
        console.error('Error creating bets table:', createBetsTableError);
        await createBetsTableFallback();
      }
    }
    
    // 4. Create leaderboard functions if they don't exist already
    console.log('Setting up leaderboard functions...');
    await setupLeaderboardFunctions();
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
};

/**
 * Fallback function to create user_profiles table
 * This is for development only and should be replaced with proper migrations
 */
const createUserProfilesTableFallback = async (): Promise<void> => {
  // In a real app, we'd use migrations or Supabase SQL functions
  // For this demo, we'll just console log instructions
  console.log(`
    SQL to create user_profiles table:
    
    CREATE TABLE IF NOT EXISTS public.user_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) NOT NULL,
      email TEXT,
      wallet_address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add policies
    CREATE POLICY "Users can view their own profile"
      ON user_profiles
      FOR SELECT
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own profile"
      ON user_profiles
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own profile"
      ON user_profiles
      FOR UPDATE
      USING (auth.uid() = user_id);
  `);
};

/**
 * Fallback function to add dare_points column
 * This is for development only and should be replaced with proper migrations
 */
const addDarePointsColumnFallback = async (): Promise<void> => {
  // In a real app, we'd use migrations or Supabase SQL functions
  // For this demo, we'll just console log instructions
  console.log(`
    SQL to add dare_points column:
    
    ALTER TABLE public.user_profiles 
    ADD COLUMN IF NOT EXISTS dare_points INTEGER DEFAULT 500;
    
    -- Update existing users to have 500 dare points
    UPDATE public.user_profiles
    SET dare_points = 500
    WHERE dare_points IS NULL OR dare_points = 0;
    
    -- Add an index for faster queries on dare_points
    CREATE INDEX IF NOT EXISTS idx_user_profiles_dare_points 
    ON public.user_profiles(dare_points);
  `);
};

/**
 * Fallback function to create bets table
 */
const createBetsTableFallback = async (): Promise<void> => {
  console.log(`
    SQL to create bets table:
    
    CREATE TABLE IF NOT EXISTS public.bets (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      acceptor_id TEXT,
      match_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      status TEXT NOT NULL,
      escrow_id TEXT,
      winner_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      description TEXT
    );
    
    -- Add indexes for faster queries
    CREATE INDEX IF NOT EXISTS idx_bets_creator_id 
    ON public.bets(creator_id);
    
    CREATE INDEX IF NOT EXISTS idx_bets_acceptor_id 
    ON public.bets(acceptor_id);
    
    CREATE INDEX IF NOT EXISTS idx_bets_status 
    ON public.bets(status);
    
    CREATE INDEX IF NOT EXISTS idx_bets_winner_id 
    ON public.bets(winner_id);
    
    -- Add policies
    CREATE POLICY "Anyone can read bets"
      ON bets
      FOR SELECT
      USING (true);
    
    CREATE POLICY "Authenticated users can insert bets"
      ON bets
      FOR INSERT
      WITH CHECK (auth.uid() = creator_id::uuid);
    
    CREATE POLICY "Creators can update their own bets"
      ON bets
      FOR UPDATE
      USING (auth.uid() = creator_id::uuid);
  `);
};

/**
 * Setup leaderboard functions in Supabase
 */
const setupLeaderboardFunctions = async (): Promise<void> => {
  console.log(`
    SQL to create leaderboard functions:
    
    -- Function to get top winners
    CREATE OR REPLACE FUNCTION public.get_top_winners(limit_count integer)
    RETURNS TABLE (
      user_id text,
      username text,
      wallet_address text,
      total_bets bigint,
      wins bigint,
      losses bigint,
      total_wagered numeric,
      total_won numeric,
      win_rate numeric
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      WITH user_stats AS (
        SELECT
          u.user_id,
          u.email as username,
          u.wallet_address,
          COUNT(b.*) as total_bets,
          COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END) as wins,
          COUNT(CASE WHEN b.status = 'completed' AND b.winner_id != u.user_id THEN 1 ELSE NULL END) as losses,
          COALESCE(SUM(b.amount), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN b.winner_id = u.user_id THEN b.amount * 2 ELSE 0 END), 0) as total_won,
          CASE
            WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END) > 0 
            THEN COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END)::numeric / 
                 COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END)::numeric
            ELSE 0
          END as win_rate
        FROM
          public.user_profiles u
        LEFT JOIN
          public.bets b ON (u.user_id = b.creator_id OR u.user_id = b.acceptor_id)
        GROUP BY
          u.user_id, u.email, u.wallet_address
      )
      SELECT * FROM user_stats
      ORDER BY wins DESC, win_rate DESC, total_bets DESC
      LIMIT limit_count;
    END;
    $$;
    
    -- Function to get top earners
    CREATE OR REPLACE FUNCTION public.get_top_earners(limit_count integer)
    RETURNS TABLE (
      user_id text,
      username text,
      wallet_address text,
      total_bets bigint,
      wins bigint,
      losses bigint,
      total_wagered numeric,
      total_won numeric,
      win_rate numeric
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      WITH user_stats AS (
        SELECT
          u.user_id,
          u.email as username,
          u.wallet_address,
          COUNT(b.*) as total_bets,
          COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END) as wins,
          COUNT(CASE WHEN b.status = 'completed' AND b.winner_id != u.user_id THEN 1 ELSE NULL END) as losses,
          COALESCE(SUM(b.amount), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN b.winner_id = u.user_id THEN b.amount * 2 ELSE 0 END), 0) as total_won,
          CASE
            WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END) > 0 
            THEN COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END)::numeric / 
                 COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END)::numeric
            ELSE 0
          END as win_rate
        FROM
          public.user_profiles u
        LEFT JOIN
          public.bets b ON (u.user_id = b.creator_id OR u.user_id = b.acceptor_id)
        GROUP BY
          u.user_id, u.email, u.wallet_address
      )
      SELECT * FROM user_stats
      ORDER BY total_won DESC, wins DESC, win_rate DESC
      LIMIT limit_count;
    END;
    $$;
    
    -- Function to get most active bettors
    CREATE OR REPLACE FUNCTION public.get_most_active_bettors(limit_count integer)
    RETURNS TABLE (
      user_id text,
      username text,
      wallet_address text,
      total_bets bigint,
      wins bigint,
      losses bigint,
      total_wagered numeric,
      total_won numeric,
      win_rate numeric
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      WITH user_stats AS (
        SELECT
          u.user_id,
          u.email as username,
          u.wallet_address,
          COUNT(b.*) as total_bets,
          COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END) as wins,
          COUNT(CASE WHEN b.status = 'completed' AND b.winner_id != u.user_id THEN 1 ELSE NULL END) as losses,
          COALESCE(SUM(b.amount), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN b.winner_id = u.user_id THEN b.amount * 2 ELSE 0 END), 0) as total_won,
          CASE
            WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END) > 0 
            THEN COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END)::numeric / 
                 COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END)::numeric
            ELSE 0
          END as win_rate
        FROM
          public.user_profiles u
        LEFT JOIN
          public.bets b ON (u.user_id = b.creator_id OR u.user_id = b.acceptor_id)
        GROUP BY
          u.user_id, u.email, u.wallet_address
      )
      SELECT * FROM user_stats
      ORDER BY total_bets DESC, total_wagered DESC
      LIMIT limit_count;
    END;
    $$;
    
    -- Function to get a single user's betting stats
    CREATE OR REPLACE FUNCTION public.get_user_betting_stats(user_id text)
    RETURNS TABLE (
      user_id text,
      username text,
      wallet_address text,
      total_bets bigint,
      wins bigint,
      losses bigint,
      total_wagered numeric,
      total_won numeric,
      win_rate numeric
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      WITH user_stats AS (
        SELECT
          u.user_id,
          u.email as username,
          u.wallet_address,
          COUNT(b.*) as total_bets,
          COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END) as wins,
          COUNT(CASE WHEN b.status = 'completed' AND b.winner_id != u.user_id THEN 1 ELSE NULL END) as losses,
          COALESCE(SUM(b.amount), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN b.winner_id = u.user_id THEN b.amount * 2 ELSE 0 END), 0) as total_won,
          CASE
            WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END) > 0 
            THEN COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END)::numeric / 
                 COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END)::numeric
            ELSE 0
          END as win_rate
        FROM
          public.user_profiles u
        LEFT JOIN
          public.bets b ON (u.user_id = b.creator_id OR u.user_id = b.acceptor_id)
        WHERE
          u.user_id = get_user_betting_stats.user_id
        GROUP BY
          u.user_id, u.email, u.wallet_address
      )
      SELECT * FROM user_stats;
    END;
    $$;
  `);
}; 