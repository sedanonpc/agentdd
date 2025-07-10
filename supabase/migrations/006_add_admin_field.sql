-- Migration: Add is_admin field to user_accounts table
-- This adds an admin flag to user accounts for admin functionality

-- Add is_admin column to user_accounts table
ALTER TABLE public.user_accounts 
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Create index for better performance when querying admin users
CREATE INDEX IF NOT EXISTS idx_user_accounts_is_admin
ON public.user_accounts(is_admin);

-- Add comments for documentation
COMMENT ON COLUMN public.user_accounts.is_admin IS 'Flag indicating if the user has admin privileges';

-- Create function to set a user as admin
CREATE OR REPLACE FUNCTION public.set_user_as_admin(
  user_email TEXT,
  admin_status BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  success BOOLEAN := FALSE;
BEGIN
  -- Find the user by email
  SELECT user_id INTO target_user_id
  FROM public.user_accounts
  WHERE email = user_email;
  
  -- Update the admin status if user found
  IF target_user_id IS NOT NULL THEN
    UPDATE public.user_accounts
    SET is_admin = admin_status,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    success := TRUE;
  END IF;
  
  RETURN success;
END;
$$; 