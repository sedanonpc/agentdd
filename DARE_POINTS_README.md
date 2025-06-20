# $DARE Points System

This document provides an overview of the $DARE Points system, which is the core reward mechanism in our NBA betting dApp.

## Overview

$DARE Points are the in-app currency that users earn and spend throughout the application. They can be used to place bets on NBA games, earn rewards for winning bets, and potentially be exchanged for other rewards in the future.

## Key Features

- **Initial Allocation**: New users automatically receive 500 $DARE Points upon registration
- **Persistent Storage**: Points are stored in Supabase with local caching for offline use
- **Transaction History**: All point transactions are recorded and can be viewed by users
- **Betting Integration**: Users can place bets using their $DARE Points balance
- **Reward System**: Users earn additional points for winning bets and other activities

## Technical Implementation

The $DARE Points system is implemented using a layered architecture:

1. **Database Layer** (Supabase)
   - `user_profiles` table with `dare_points` column
   - Default value of 500 points for new users
   - Row-level security policies for data protection

2. **Service Layer**
   - `darePointsService.ts`: Core functions for interacting with points
   - Local storage caching for offline functionality
   - Transaction recording and history management

3. **Context Layer**
   - `DarePointsContext.tsx`: React Context for global state management
   - `useDarePoints()` hook for easy access in components

4. **UI Components**
   - `DarePointsDisplay.tsx`: Standardized component for displaying points
   - Multiple display variants (default, compact, large)

## Usage in Components

To display $DARE points in any component:

```tsx
import DarePointsDisplay from '../components/DarePointsDisplay';

// Default display
<DarePointsDisplay />

// Compact display (for headers, etc.)
<DarePointsDisplay variant="compact" />

// Large display (for dashboards)
<DarePointsDisplay variant="large" />
```

To interact with $DARE points in any component:

```tsx
import { useDarePoints } from '../context/DarePointsContext';

function MyComponent() {
  const { 
    userBalance, 
    deductPoints, 
    addPoints,
    getTransactionHistory 
  } = useDarePoints();

  // Check balance
  console.log(`Current balance: ${userBalance}`);

  // Deduct points (e.g., for placing a bet)
  const handlePlaceBet = async (amount) => {
    const success = await deductPoints(
      amount, 
      'bet123', 
      'Placed bet on Lakers vs Bulls'
    );
  };

  // Add points (e.g., for winning a bet)
  const handleWinBet = async (amount) => {
    const success = await addPoints(
      amount,
      'BET_WON',
      'Won bet on Lakers vs Bulls',
      'bet123'
    );
  };

  // Get transaction history
  const transactions = getTransactionHistory();

  // Rest of component...
}
```

## Point System Rules

- **Starting Balance**: 500 $DARE Points for new users
- **Minimum Bet**: 10 $DARE Points
- **Earning Opportunities**:
  - Win a bet: Earn points based on odds
  - Daily login: +5 $DARE Points
  - Complete profile: +50 $DARE Points
  - Refer a friend: +100 $DARE Points

## Future Enhancements

- Integration with blockchain for true ownership
- NFT rewards purchasable with $DARE Points
- Leaderboards based on $DARE Points earnings
- Seasonal competitions with $DARE Points prizes 