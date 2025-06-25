# DARE Points Configuration System

This document describes the configuration system for DARE points values in the AgentDD application.

## Overview

The DARE points configuration system allows for dynamic management of point values awarded for different actions in the application. Rather than hardcoding these values, they are stored in a database table and can be modified by administrators. All changes to point values are tracked in a history table for auditing purposes.

## Table Structure

### `dare_points_config` Table

This table stores the current point values for each action type:

```sql
CREATE TABLE public.dare_points_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type dare_points_transaction_type NOT NULL,
  points_value DECIMAL(18,8) NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `dare_points_config_history` Table

This table tracks all changes made to point values:

```sql
CREATE TABLE public.dare_points_config_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID REFERENCES public.dare_points_config(id) NOT NULL,
  action_type dare_points_transaction_type NOT NULL,
  old_points_value DECIMAL(18,8),
  new_points_value DECIMAL(18,8) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Default Point Values

The system is initialized with the following default values:

| Action Type | Points Value | Description |
|-------------|--------------|-------------|
| `SIGNUP_BONUS` | 500 | Points awarded when a new user signs up |
| `REFERRAL_BONUS` | 100 | Points awarded to a user who refers someone who signs up |
| `BET_PLACEMENT_BONUS` | 10 | Points awarded for placing a bet |
| `BET_WIN_BONUS` | 50 | Points awarded for winning a bet |
| `DAILY_LOGIN` | 5 | Points awarded for daily login |
| `BET_PLACED` | 0 | No points awarded/deducted - used for tracking bet amount reservations |
| `BET_WON` | 0 | No points awarded/deducted - used for tracking bet amount releases |
| `BET_LOST` | 0 | No points awarded/deducted - used for tracking bet amount transfers |
| `MANUAL_ADJUSTMENT` | 0 | Variable points for manual adjustments - value set per transaction |

## Using the Configuration System

### Getting Point Values in SQL

To get the current point value for an action:

```sql
SELECT * FROM get_dare_points_value('SIGNUP_BONUS');
```

### Updating Point Values in SQL

To update a point value:

```sql
SELECT * FROM update_dare_points_value('SIGNUP_BONUS', 600, 'Increasing signup bonus for promotion');
```

### Using the Configuration in TypeScript

```typescript
import { supabase } from './supabaseService';

// Get a point value
export const getPointValue = async (actionType: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .rpc('get_dare_points_value', { action: actionType });
    
    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error(`Error getting point value for ${actionType}:`, error);
    return 0;
  }
};

// Update a point value (admin only)
export const updatePointValue = async (
  actionType: string, 
  newValue: number, 
  reason: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('update_dare_points_value', { 
        action: actionType,
        new_value: newValue,
        reason: reason
      });
    
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error(`Error updating point value for ${actionType}:`, error);
    return false;
  }
};
```

## Viewing Configuration History

To view the history of changes to point values:

```sql
-- View all changes
SELECT 
  h.action_type, 
  h.old_points_value, 
  h.new_points_value, 
  u.email as changed_by_user,
  h.change_reason, 
  h.created_at
FROM dare_points_config_history h
LEFT JOIN auth.users u ON h.changed_by = u.id
ORDER BY h.created_at DESC;

-- View changes for a specific action type
SELECT 
  h.action_type, 
  h.old_points_value, 
  h.new_points_value, 
  u.email as changed_by_user,
  h.change_reason, 
  h.created_at
FROM dare_points_config_history h
LEFT JOIN auth.users u ON h.changed_by = u.id
WHERE h.action_type = 'SIGNUP_BONUS'
ORDER BY h.created_at DESC;
```

## Admin Interface

The application should provide an admin interface for managing point values. This interface should:

1. Display all current point values
2. Allow admins to update point values
3. Require a reason for each change
4. Show a history of all changes

## Integration with Transactions

When recording transactions, the system should use the current point value from the configuration:

```typescript
// Example of awarding signup bonus
const awardSignupBonus = async (userId: string): Promise<boolean> => {
  try {
    // Get the current signup bonus value from configuration
    const bonusAmount = await getPointValue('SIGNUP_BONUS');
    
    // Get current balances
    const freeDarePoints = await getUserFreeDarePoints(userId);
    const reservedDarePoints = await getUserReservedDarePoints(userId);
    
    // Update the user's balance
    const success = await updateUserDarePoints(userId, freeDarePoints + bonusAmount);
    
    if (success) {
      // Record the transaction
      await recordTransaction({
        user_id: userId,
        transaction_type: 'SIGNUP_BONUS',
        amount: bonusAmount,
        previous_free_balance: freeDarePoints,
        previous_reserved_balance: reservedDarePoints,
        new_free_balance: freeDarePoints + bonusAmount,
        new_reserved_balance: reservedDarePoints,
        description: 'Welcome bonus for new user'
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error awarding signup bonus:', error);
    return false;
  }
};
```

## Security Considerations

- Only administrators can modify point values
- All users can view current point values
- All changes are tracked with user ID and timestamp
- A reason is required for each change 