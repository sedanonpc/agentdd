-- Add dare_points column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN dare_points INTEGER DEFAULT 0;

-- Update existing users to have 500 dare points
UPDATE public.user_profiles
SET dare_points = 500
WHERE dare_points IS NULL OR dare_points = 0;

-- Add an index for faster queries on dare_points
CREATE INDEX idx_user_profiles_dare_points ON public.user_profiles(dare_points);

-- Comment on the column for documentation
COMMENT ON COLUMN public.user_profiles.dare_points IS 'DARE Points balance for the user, initialized at 500 for new accounts'; 