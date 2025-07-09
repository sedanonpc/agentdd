-- Migration: Create points configuration tables
-- This creates tables to store configurable point values and track changes to those values

-- Create points_config table to store the current point values
CREATE TABLE IF NOT EXISTS public.points_config (
  -- Unique identifier for the configuration
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Type of action that earns or costs points
  action_type points_transaction_type NOT NULL,
  
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_config_action_type
ON public.points_config(action_type) 
WHERE is_active = true;

-- Create points_config_history table to track all configuration changes
CREATE TABLE IF NOT EXISTS public.points_config_history (
  -- Unique identifier for the history record
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to the configuration that was changed (nullable for deletions)
  config_id UUID REFERENCES public.points_config(id),
  
  -- Type of action whose configuration changed
  action_type points_transaction_type NOT NULL,
  
  -- Type of operation performed
  operation_type TEXT NOT NULL CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- Details about what changed in this operation
  change_details JSONB NOT NULL,
  
  -- User who made the change
  changed_by UUID REFERENCES auth.users(id),
  
  -- Reason for making the change
  change_reason TEXT NOT NULL,
  
  -- When the change was made
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_points_config_history_config_id
ON public.points_config_history(config_id);

CREATE INDEX IF NOT EXISTS idx_points_config_history_created_at
ON public.points_config_history(created_at);

-- Enable Row Level Security
ALTER TABLE public.points_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_config_history ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Everyone can view points_config"
  ON points_config
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can modify points_config"
  ON points_config
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Everyone can view points_config_history"
  ON points_config_history
  FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert points_config_history"
  ON points_config_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE public.points_config IS 'Configurable point values for different point actions';
COMMENT ON COLUMN public.points_config.id IS 'Unique identifier for the configuration';
COMMENT ON COLUMN public.points_config.action_type IS 'Type of action that earns or costs points';
COMMENT ON COLUMN public.points_config.points_value IS 'Number of points awarded or deducted for this action';

COMMENT ON COLUMN public.points_config.is_active IS 'Whether this configuration is currently active';
COMMENT ON COLUMN public.points_config.created_at IS 'When the configuration was created';
COMMENT ON COLUMN public.points_config.updated_at IS 'When the configuration was last updated';

COMMENT ON TABLE public.points_config_history IS 'Complete audit trail of all points configuration changes';
COMMENT ON COLUMN public.points_config_history.id IS 'Unique identifier for the history record';
COMMENT ON COLUMN public.points_config_history.config_id IS 'Reference to the configuration that was changed (null for deletions)';
COMMENT ON COLUMN public.points_config_history.action_type IS 'Type of action whose configuration was changed';
COMMENT ON COLUMN public.points_config_history.operation_type IS 'Type of operation: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN public.points_config_history.change_details IS 'JSON object containing details of what changed - field names as keys with old/new values';
COMMENT ON COLUMN public.points_config_history.changed_by IS 'User who made the change';
COMMENT ON COLUMN public.points_config_history.change_reason IS 'Reason for making the change';
COMMENT ON COLUMN public.points_config_history.created_at IS 'When the change was made';

-- Create a function to automatically track all configuration changes
CREATE OR REPLACE FUNCTION public.track_points_config_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB := '{}';
BEGIN
  -- Handle INSERT operations (new transaction types)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.points_config_history (
      config_id,
      action_type,
      operation_type,
      change_details,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      NEW.action_type,
      'INSERT',
      jsonb_build_object(
        'points_value', NEW.points_value,
        'is_active', NEW.is_active
      ),
      auth.uid(),
      'New transaction type added'
    );
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Always update the updated_at timestamp
    NEW.updated_at := NOW();
    
    -- Build change details for any field that changed
    IF OLD.points_value <> NEW.points_value THEN
      changes := changes || jsonb_build_object('points_value', jsonb_build_object('old', OLD.points_value, 'new', NEW.points_value));
    END IF;
    
    IF OLD.is_active <> NEW.is_active THEN
      changes := changes || jsonb_build_object('is_active', jsonb_build_object('old', OLD.is_active, 'new', NEW.is_active));
    END IF;
    
    -- Only log if something actually changed
    IF changes <> '{}' THEN
      INSERT INTO public.points_config_history (
        config_id,
        action_type,
        operation_type,
        change_details,
        changed_by,
        change_reason
      ) VALUES (
        NEW.id,
        NEW.action_type,
        'UPDATE',
        changes,
        auth.uid(),
        'Configuration updated'
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE operations (removing transaction types)
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.points_config_history (
      config_id,
      action_type,
      operation_type,
      change_details,
      changed_by,
      change_reason
    ) VALUES (
      OLD.id,
      OLD.action_type,
      'DELETE',
      jsonb_build_object(
        'points_value', OLD.points_value,
        'is_active', OLD.is_active
      ),
      auth.uid(),
      'Transaction type removed'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to track all changes
CREATE TRIGGER track_points_config_changes
AFTER INSERT OR UPDATE OR DELETE ON public.points_config
FOR EACH ROW EXECUTE FUNCTION public.track_points_config_changes();

-- Insert initial configuration values
INSERT INTO public.points_config (action_type, points_value)
VALUES 
  ('SIGNUP', 500),
  ('REFERRAL_BONUS', 100),
  ('BET_ACCEPTANCE_BONUS_AWARDED', 15),
  ('BET_WIN_BONUS_AWARDED', 50),
  ('DAILY_LOGIN', 5),
  ('BET_PLACED', 0),
  ('BET_WON', 0),
  ('BET_LOST', 0);

-- Create a view for easy access to active configurations
CREATE OR REPLACE VIEW public.active_points_config AS
SELECT action_type, points_value
FROM public.points_config
WHERE is_active = true;

-- Create a function to get the point value for a specific action
CREATE OR REPLACE FUNCTION public.get_points_value(action points_transaction_type)
RETURNS DECIMAL(18,8) AS $$
DECLARE
  point_value DECIMAL(18,8);
BEGIN
  SELECT points_value INTO point_value
  FROM public.points_config
  WHERE action_type = action AND is_active = true;
  
  RETURN COALESCE(point_value, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to update a point value and track the change
CREATE OR REPLACE FUNCTION public.update_points_value(
  action points_transaction_type,
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
  FROM public.points_config
  WHERE action_type = action AND is_active = true;
  
  -- If no config exists, return false
  IF config_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update the config
  UPDATE public.points_config
  SET points_value = new_value
  WHERE id = config_id;
  
  -- Manually insert history record for non-UI updates
  IF auth.uid() IS NULL THEN
    INSERT INTO public.points_config_history (
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

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.points_config TO authenticated;
GRANT SELECT ON public.points_config_history TO authenticated;
GRANT SELECT ON public.active_points_config TO authenticated; 