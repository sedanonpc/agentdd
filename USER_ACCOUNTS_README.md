# User Accounts System

This document describes the `user_accounts` table structure in the AgentDD application.

## Table Structure

### `user_accounts` Table

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

### Key Features

1. `account_id` is the primary key
2. `supabase_user_id` references the Supabase auth.users table
3. Points are split into two columns:
   - `provisioned_points`: Points that are reserved (e.g., held in escrow) and can no longer be spent
   - `unprovisioned_points`: Points that are not yet reserved and can still be spent

## Database Initialization

The `user_accounts` table is automatically created when the application starts if it doesn't exist already. This is handled by the `setupDatabase()` function in `setupDatabaseService.ts`.

## API Functions

### Points Management Functions

The following functions have been added to handle the split DARE points:

- `getUserUnprovisionedPoints()`: Get available points
- `getUserProvisionedPoints()`: Get reserved points
- `provisionUserPoints()`: Move points from unprovisioned to provisioned
- `unprovisionUserPoints()`: Move points from provisioned to unprovisioned

### Core Functions

The following functions manage user accounts:

- `getUserDarePoints()`: Returns the sum of provisioned and unprovisioned points
- `updateUserDarePoints()`: Updates only unprovisioned points
- `adjustUserDarePoints()`: Checks against unprovisioned points
- `deductBetPoints()`: Provisions points instead of deducting them

## UI Components

The DARE Points display shows:

1. Total points (sum of provisioned and unprovisioned)
2. Available points (unprovisioned)
3. Provisioned points (if any)

## Migration Files

- `007_create_user_accounts_table.sql`: Creates the user_accounts table

## Services

- `setupDatabaseService.ts`: Handles database initialization including the user_accounts table
- `supabaseService.ts`: Provides functions for interacting with the user_accounts table
- `darePointsService.ts`: Manages DARE points operations

## Context

- `DarePointsContext.tsx`: Tracks both provisioned and unprovisioned points

## Components

- `DarePointsDisplay.tsx`: Shows both provisioned and unprovisioned points 