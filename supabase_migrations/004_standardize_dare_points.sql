-- Migration: Standardize DARE points values
-- This ensures all users have DARE points initialized with the same value

-- 1. Make sure the dare_points column exists with the right default
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS dare_points INTEGER DEFAULT 500;

-- 2. Update all existing users to have 500 DARE points if they don't have any
UPDATE public.user_profiles
SET dare_points = 500
WHERE dare_points IS NULL OR dare_points = 0;

-- 3. Add index for faster queries (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_user_profiles_dare_points'
  ) THEN
    CREATE INDEX idx_user_profiles_dare_points ON public.user_profiles(dare_points);
  END IF;
END$$;

-- 4. Add comment for documentation
COMMENT ON COLUMN public.user_profiles.dare_points IS 'DARE Points balance for the user, initialized at 500 for new accounts';

-- 5. Add RLS policy for updating dare_points (if it doesn't exist already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update their own dare_points'
  ) THEN
    CREATE POLICY "Users can update their own dare_points" 
    ON public.user_profiles 
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$; 