# User Accounts System

This document describes the migration from `user_profiles` to `user_accounts` table in the AgentDD application.

## Table Structure

### New `user_accounts` Table

```sql
CREATE TABLE public.user_accounts (
  account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id UUID REFERENCES auth.users(id) NOT NULL,
  email TEXT,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  provisioned_points INTEGER DEFAULT 0,
  unprovisioned_points INTEGER DEFAULT 500
);
```

### Key Differences from `user_profiles`

1. `account_id` replaces `id` as the primary key
2. `supabase_user_id` replaces `user_id` for clarity
3. `dare_points` is split into two columns:
   - `provisioned_points`: Points that are reserved (e.g., held in escrow) and can no longer be spent
   - `unprovisioned_points`: Points that are not yet reserved and can still be spent

## Migration Process

The migration from `user_profiles` to `user_accounts` happens automatically when the application starts:

1. The application checks if `user_accounts` table exists
2. If not, it creates the table
3. It then checks if `user_profiles` table exists
4. If both tables exist, it migrates data from `user_profiles` to `user_accounts`
5. Migration progress is tracked in the `migration_flags` table

## API Changes

### New Functions

The following new functions have been added to handle the split DARE points:

- `getUserUnprovisionedPoints()`: Get available points
- `getUserProvisionedPoints()`: Get reserved points
- `provisionUserPoints()`: Move points from unprovisioned to provisioned
- `unprovisionUserPoints()`: Move points from provisioned to unprovisioned

### Updated Functions

The following functions have been updated:

- `getUserDarePoints()`: Now returns the sum of provisioned and unprovisioned points
- `updateUserDarePoints()`: Now updates only unprovisioned points
- `adjustUserDarePoints()`: Now checks against unprovisioned points
- `deductBetPoints()`: Now provisions points instead of deducting them

## UI Changes

The DARE Points display now shows:

1. Total points (sum of provisioned and unprovisioned)
2. Available points (unprovisioned)
3. Provisioned points (if any)

## Migration Files

- `007_create_user_accounts_table.sql`: Creates the new user_accounts table
- `008_create_migration_flags_table.sql`: Creates the migration_flags table and functions

## Services

- `migrationService.ts`: Handles the migration process
- `setupDatabaseService.ts`: Updated to work with the new table
- `supabaseService.ts`: Updated with new functions for the split points
- `darePointsService.ts`: Updated to use the new points system

## Context

- `DarePointsContext.tsx`: Updated to track both provisioned and unprovisioned points

## Components

- `DarePointsDisplay.tsx`: Updated to show both provisioned and unprovisioned points 