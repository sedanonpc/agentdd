# $DARE Points System Consolidation Plan

## Current State Analysis

Currently, the $DARE points system is implemented in multiple places with some inconsistencies:

1. **Database Layer**:
   - `user_profiles` table with `dare_points` column in Supabase
   - Default value of 500 points for new users

2. **Service Layers**:
   - `supabaseService.ts`: Backend functions for getting/updating points
   - `DarePointsContext.tsx`: Context provider with local storage fallback (sets default to 250)

3. **UI Components**:
   - `DarePointsDisplay.tsx`: Reusable component to show points
   - Points display in `Navbar.tsx`
   - Points display in `DashboardPage.tsx` (multiple instances)
   - Betting integration in `MatchBettingForm.tsx`

4. **Inconsistencies**:
   - Default values: 500 points in Supabase vs 250 points in DarePointsContext
   - Multiple visual styles and formats for displaying points
   - Duplicate functionality between Supabase and local storage implementations
   - No clear source of truth

## Consolidation Strategy

### 1. Single Source of Truth

**Primary source**: Supabase database
**Fallback**: Local storage (for offline functionality only)

```typescript
// src/services/darePointsService.ts
import { supabase } from './supabaseService';
import { getCurrentUser, getUserProfile, updateUserProfile } from './supabaseService';

const LOCAL_STORAGE_KEY = 'dare_points_cache';
const DEFAULT_POINTS = 500; // Consistent default value

// Get user's DARE points from Supabase with local fallback
export const getUserDarePoints = async (userId: string): Promise<number> => {
  try {
    // Try to get from Supabase first
    const profile = await getUserProfile(userId);
    if (profile?.dare_points !== undefined) {
      // Cache to local storage
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY}_${userId}`, 
        JSON.stringify({ points: profile.dare_points, timestamp: Date.now() })
      );
      return profile.dare_points;
    }
    
    // If not in Supabase, try local storage
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { points } = JSON.parse(cached);
      return points;
    }
    
    // Default value if nothing found
    return DEFAULT_POINTS;
  } catch (error) {
    console.error('Error fetching DARE points:', error);
    
    // Try local cache on error
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
    if (cached) {
      const { points } = JSON.parse(cached);
      return points;
    }
    
    return DEFAULT_POINTS;
  }
};

// Update user's DARE points
export const updateUserDarePoints = async (userId: string, points: number): Promise<boolean> => {
  try {
    await updateUserProfile(userId, { dare_points: points });
    
    // Update local cache
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY}_${userId}`, 
      JSON.stringify({ points, timestamp: Date.now() })
    );
    return true;
  } catch (error) {
    console.error('Error updating DARE points:', error);
    return false;
  }
};

// Add or subtract points
export const adjustUserDarePoints = async (userId: string, amount: number): Promise<boolean> => {
  try {
    const currentPoints = await getUserDarePoints(userId);
    return updateUserDarePoints(userId, currentPoints + amount);
  } catch (error) {
    console.error('Error adjusting DARE points:', error);
    return false;
  }
};
```

### 2. Updated Context Provider

Update the DarePointsContext to use the consolidated service:

```typescript
// src/context/DarePointsContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { 
  getUserDarePoints, 
  updateUserDarePoints, 
  adjustUserDarePoints 
} from '../services/darePointsService';

// Context definition...

export const DarePointsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<DareTransaction[]>([]);
  const [rewardPool, setRewardPool] = useState<RewardPool>({ totalPoints: 0, transactions: [] });

  useEffect(() => {
    if (user?.id) {
      loadUserData(user.id);
    } else {
      setUserBalance(0);
      setLoadingBalance(false);
    }
  }, [user]);

  const loadUserData = async (userId: string) => {
    setLoadingBalance(true);
    try {
      const points = await getUserDarePoints(userId);
      setUserBalance(points);
      
      // Load transaction history...
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoadingBalance(false);
    }
  };

  // Implement other methods using the consolidated service...
};
```

### 3. Consistent UI Component

Standardize the DarePointsDisplay component as the single UI element for showing points:

```typescript
// All components should use DarePointsDisplay consistently
// No hardcoded values or alternative displays
```

### 4. Migration Plan

1. Create the new `darePointsService.ts` file
2. Update DarePointsContext to use the new service
3. Find and replace all direct Supabase calls for dare_points with service calls
4. Standardize all UI components to use DarePointsDisplay
5. Update all hardcoded default values to use the same constant
6. Create SQL migration to ensure all existing users have the correct default value

## Benefits

- **Clarity**: Single source of truth for all DARE points operations
- **Consistency**: Same visual style and behavior across the app
- **Reliability**: Proper fallback mechanism for offline usage
- **Maintainability**: Easier to update and extend in the future 