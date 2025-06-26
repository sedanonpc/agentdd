-- Migration: Create DARE points configuration tables
-- This creates tables to store configurable point values and track changes to those values

-- Create dare_points_config table to store the current point values
CREATE TABLE IF NOT EXISTS public.dare_points_config (
  -- Unique identifier for the configuration
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Type of action that earns or costs points
  action_type dare_points_transaction_type NOT NULL,
  
  -- Number of points awarded or deducted for this action
  points_value DECIMAL(18,8) NOT NULL,
  
  -- Whether this configuration is currently active
  is_active BOOLEAN DEFAULT true,
  
  -- When the configuration was created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- When the configuration was last updated
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a unique constraint on action_type to ensure only one active config per action
CREATE UNIQUE INDEX IF NOT EXISTS idx_dare_points_config_action_type
ON public.dare_points_config(action_type) 
WHERE is_active = true;

-- Create dare_points_config_history table to track changes to point values
CREATE TABLE IF NOT EXISTS public.dare_points_config_history (
  -- Unique identifier for the history record
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to the configuration that was changed
  config_id UUID REFERENCES public.dare_points_config(id) NOT NULL,
  
  -- Type of action whose point value was changed
  action_type dare_points_transaction_type NOT NULL,
  
  -- Previous point value before the change
  old_points_value DECIMAL(18,8),
  
  -- New point value after the change
  new_points_value DECIMAL(18,8) NOT NULL,
  
  -- User who made the change
  changed_by UUID REFERENCES auth.users(id),
  
  -- Reason for changing the point value
  change_reason TEXT NOT NULL,
  
  -- When the change was made
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_dare_points_config_history_config_id
ON public.dare_points_config_history(config_id);

CREATE INDEX IF NOT EXISTS idx_dare_points_config_history_created_at
ON public.dare_points_config_history(created_at);

-- Enable Row Level Security
ALTER TABLE public.dare_points_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dare_points_config_history ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Everyone can view dare_points_config"
  ON dare_points_config
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can modify dare_points_config"
  ON dare_points_config
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Everyone can view dare_points_config_history"
  ON dare_points_config_history
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert dare_points_config_history"
  ON dare_points_config_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE public.dare_points_config IS 'Configurable point values for different DARE point actions';
COMMENT ON COLUMN public.dare_points_config.id IS 'Unique identifier for the configuration';
COMMENT ON COLUMN public.dare_points_config.action_type IS 'Type of action that earns or costs points';
COMMENT ON COLUMN public.dare_points_config.points_value IS 'Number of points awarded or deducted for this action';

COMMENT ON COLUMN public.dare_points_config.is_active IS 'Whether this configuration is currently active';
COMMENT ON COLUMN public.dare_points_config.created_at IS 'When the configuration was created';
COMMENT ON COLUMN public.dare_points_config.updated_at IS 'When the configuration was last updated';

COMMENT ON TABLE public.dare_points_config_history IS 'History of changes to DARE points configuration values';
COMMENT ON COLUMN public.dare_points_config_history.id IS 'Unique identifier for the history record';
COMMENT ON COLUMN public.dare_points_config_history.config_id IS 'Reference to the configuration that was changed';
COMMENT ON COLUMN public.dare_points_config_history.action_type IS 'Type of action whose point value was changed';
COMMENT ON COLUMN public.dare_points_config_history.old_points_value IS 'Previous point value before the change';
COMMENT ON COLUMN public.dare_points_config_history.new_points_value IS 'New point value after the change';
COMMENT ON COLUMN public.dare_points_config_history.changed_by IS 'User who made the change';
COMMENT ON COLUMN public.dare_points_config_history.change_reason IS 'Reason for changing the point value';
COMMENT ON COLUMN public.dare_points_config_history.created_at IS 'When the change was made';

-- Create a function to automatically track changes to point values
CREATE OR REPLACE FUNCTION public.track_dare_points_config_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track changes to existing records
  IF TG_OP = 'UPDATE' THEN
    -- Only insert history if points_value actually changed
    IF OLD.points_value <> NEW.points_value THEN
      INSERT INTO public.dare_points_config_history (
        config_id, 
        action_type, 
        old_points_value, 
        new_points_value, 
        changed_by,
        change_reason
      ) VALUES (
        NEW.id,
        NEW.action_type,
        OLD.points_value,
        NEW.points_value,
        auth.uid(),
        'Manual update'
      );
    END IF;
  END IF;
  
  -- Always update the updated_at timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to track changes
CREATE TRIGGER track_dare_points_config_changes
BEFORE UPDATE ON public.dare_points_config
FOR EACH ROW EXECUTE FUNCTION public.track_dare_points_config_changes();

-- Insert initial configuration values
INSERT INTO public.dare_points_config (action_type, points_value)
VALUES 
  ('SIGNUP', 500),
  ('REFERRAL_BONUS', 100),
  ('BET_PLACEMENT_BONUS_AWARDED', 10),
  ('BET_WIN_BONUS_AWARDED', 50),
  ('DAILY_LOGIN', 5),
  ('BET_PLACED', 0),
  ('BET_WON', 0),
  ('BET_LOST', 0),
  ('MANUAL_ADJUSTMENT', 0);

-- Create a view for easy access to active configurations
CREATE OR REPLACE VIEW public.active_dare_points_config AS
SELECT action_type, points_value
FROM public.dare_points_config
WHERE is_active = true;

-- Create a function to get the point value for a specific action
CREATE OR REPLACE FUNCTION public.get_dare_points_value(action dare_points_transaction_type)
RETURNS DECIMAL(18,8) AS $$
DECLARE
  point_value DECIMAL(18,8);
BEGIN
  SELECT points_value INTO point_value
  FROM public.dare_points_config
  WHERE action_type = action AND is_active = true;
  
  RETURN COALESCE(point_value, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update a point value and track the change
CREATE OR REPLACE FUNCTION public.update_dare_points_value(
  action dare_points_transaction_type,
  new_value DECIMAL(18,8),
  reason TEXT DEFAULT 'System update'
)
RETURNS BOOLEAN AS $$
DECLARE
  config_id UUID;
  old_value DECIMAL(18,8);
BEGIN
  -- Get the current config
  SELECT id, points_value INTO config_id, old_value
  FROM public.dare_points_config
  WHERE action_type = action AND is_active = true;
  
  -- If no config exists, return false
  IF config_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update the config
  UPDATE public.dare_points_config
  SET points_value = new_value
  WHERE id = config_id;
  
  -- Manually insert history record for non-UI updates
  IF auth.uid() IS NULL THEN
    INSERT INTO public.dare_points_config_history (
      config_id, 
      action_type, 
      old_points_value, 
      new_points_value,
      change_reason
    ) VALUES (
      config_id,
      action,
      old_value,
      new_value,
      reason
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 