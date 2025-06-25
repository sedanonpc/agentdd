# DARE Points Transactions System

This document describes the `dare_points_transactions` table structure and how it provides an audit trail for all DARE points movements in the AgentDD application.

## Table Structure

### `dare_points_transactions` Table

```sql
CREATE TABLE IF NOT EXISTS public.dare_points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  transaction_type dare_points_transaction_type NOT NULL,
  balance_type dare_points_balance_type NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
  common_event_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Transaction Types

The system uses the following transaction types to categorize different DARE points movements:

| Transaction Type | Description | Points Movement |
|-----------------|-------------|----------------|
| `BET_PLACED` | When a user places a bet | Free → Reserved |
| `BET_PLACEMENT_BONUS` | 10 points earned for placing a bet | System → Free |
| `BET_WON` | When a user wins a bet | Reserved → Free |
| `BET_WIN_BONUS` | 50 points bonus for winning a bet | System → Free |
| `BET_LOST` | When a user loses a bet | User's Reserved → Other User's Free |
| `SIGNUP_BONUS` | 500 points bonus for signing up | System → Free |
| `REFERRAL_BONUS` | 100 points bonus for referring a user | System → Free |
| `DAILY_LOGIN` | 5 points bonus for daily login | System → Free |
| `MANUAL_ADJUSTMENT` | Admin-initiated adjustment | Varies |

## Balance Types

The system uses the following balance types to specify which points balance is affected:

| Balance Type | Description | Example Transactions |
|-------------|-------------|---------------------|
| `FREE` | Affects the free points balance | SIGNUP_BONUS, REFERRAL_BONUS, DAILY_LOGIN, BET_WIN_BONUS, BET_PLACEMENT_BONUS |
| `RESERVED` | Affects the reserved points balance | Reserved points for bets |

## Key Features

1. **Transaction-Based Audit Trail**: Each transaction records the amount and direction of points movement, allowing for complete traceability by summing transactions.

2. **Balance Type Tracking**: The `balance_type` field explicitly specifies which balance is affected by the transaction (FREE or RESERVED).

3. **Separate Transaction Records**: When an action affects both free and reserved balances, multiple transaction records are created with the same `common_event_id`.

4. **Signed Amounts**: The `amount` field uses positive values for additions and negative values for subtractions, making the direction of the transaction clear.

5. **Flexible Metadata**: The `metadata` JSONB field stores conditional information based on transaction type:
   - `related_user_id`: Another user involved in the transaction (e.g., bet opponent, referrer)
   - `bet_id`: ID of the bet related to this transaction
   - `match_id`: ID of the match related to this transaction
   - `referral_code`: Referral code used for referral transactions
   - `description`: Human-readable description of the transaction

6. **Event Grouping**: The `common_event_id` field allows grouping multiple transactions that result from the same event (e.g., a bet settlement creates multiple transaction records).

## Use Cases

### 1. Placing a Bet

When a user places a bet, three transactions are created with the same common_event_id:

```sql
-- Generate a common event ID for all related transactions
SET @common_event_id = 'e2a8d7b6-c5d4-e3f2-a1b0-987654321000';

-- Transaction 1: Deduct from free balance
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', 'BET_PLACED', 'FREE', -100.00,
  @common_event_id,
  '{"bet_id": "123e4567-e89b-12d3-a456-426614174001", "match_id": "123e4567-e89b-12d3-a456-426614174002", "description": "Bet placed on Lakers vs Bulls - deducted from free balance"}'
);

-- Transaction 2: Add to reserved balance
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', 'BET_PLACED', 'RESERVED', 100.00,
  @common_event_id,
  '{"bet_id": "123e4567-e89b-12d3-a456-426614174001", "match_id": "123e4567-e89b-12d3-a456-426614174002", "description": "Bet placed on Lakers vs Bulls - added to reserved balance"}'
);

-- Transaction 3: Award 10 points bonus for placing a bet
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', 'BET_PLACEMENT_BONUS', 'FREE', 10.00,
  @common_event_id,
  '{"bet_id": "123e4567-e89b-12d3-a456-426614174001", "match_id": "123e4567-e89b-12d3-a456-426614174002", "description": "Bonus for placing bet on Lakers vs Bulls"}'
);
```

### 2. Winning a Bet

When a user wins a bet, three transactions are created:

```sql
-- Generate a common event ID for all related transactions
SET @common_event_id = 'f3b2a1c0-d4e5-f6g7-h8i9-123456789000';

-- Transaction 1: Reduce reserved balance
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', 'BET_WON', 'RESERVED', -100.00,
  @common_event_id,
  '{"bet_id": "123e4567-e89b-12d3-a456-426614174001", "match_id": "123e4567-e89b-12d3-a456-426614174002", "description": "Won bet on Lakers vs Bulls - removed from reserved balance"}'
);

-- Transaction 2: Add to free balance
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', 'BET_WON', 'FREE', 100.00,
  @common_event_id,
  '{"bet_id": "123e4567-e89b-12d3-a456-426614174001", "match_id": "123e4567-e89b-12d3-a456-426614174002", "description": "Won bet on Lakers vs Bulls - added to free balance"}'
);

-- Transaction 3: Award 50 points bonus for winning
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', 'BET_WIN_BONUS', 'FREE', 50.00,
  @common_event_id,
  '{"bet_id": "123e4567-e89b-12d3-a456-426614174001", "match_id": "123e4567-e89b-12d3-a456-426614174002", "description": "Bonus for winning bet on Lakers vs Bulls"}'
);
```

### 3. Losing a Bet

When a user loses a bet, two transactions are created for the loser and one for the winner:

```sql
-- Generate a common event ID for all related transactions
SET @common_event_id = 'f3b2a1c0-d4e5-f6g7-h8i9-123456789000';

-- Transaction 1: Reduce loser's reserved balance
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', 'BET_LOST', 'RESERVED', -100.00,
  @common_event_id,
  '{"bet_id": "123e4567-e89b-12d3-a456-426614174001", "match_id": "123e4567-e89b-12d3-a456-426614174002", "related_user_id": "123e4567-e89b-12d3-a456-426614174003", "description": "Lost bet on Lakers vs Bulls - removed from reserved balance"}'
);

-- Transaction 2: Add to winner's free balance
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174003', 'BET_WON', 'FREE', 100.00,
  @common_event_id,
  '{"bet_id": "123e4567-e89b-12d3-a456-426614174001", "match_id": "123e4567-e89b-12d3-a456-426614174002", "related_user_id": "123e4567-e89b-12d3-a456-426614174000", "description": "Won bet against User456 on Lakers vs Bulls"}'
);
```

### 4. Sign-up Bonus

When a new user signs up:

```sql
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', 'SIGNUP_BONUS', 'FREE', 500.00,
  uuid_generate_v4(),
  '{"description": "Welcome bonus for new user"}'
);
```

### 5. Referral Bonus

When a user signs up with a referral:

```sql
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174003', 'REFERRAL_BONUS', 'FREE', 100.00,
  uuid_generate_v4(),
  '{"related_user_id": "123e4567-e89b-12d3-a456-426614174000", "referral_code": "REFER123", "description": "Bonus for referring new user User456"}'
);
```

### 6. Daily Login Bonus

When a user logs in daily:

```sql
INSERT INTO dare_points_transactions (
  user_id, transaction_type, balance_type, amount, 
  common_event_id, metadata
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', 'DAILY_LOGIN', 'FREE', 5.00,
  uuid_generate_v4(),
  '{"description": "Daily login bonus"}'
);
```

## Integration with Existing System

The `dare_points_transactions` table complements the existing `user_accounts` table by providing a detailed audit trail of all points movements. While the `user_accounts` table maintains the current balance state, the transactions table records how that state changed over time.

## Calculating Current Balances

To calculate a user's current balances from the transaction history:

```sql
-- Calculate free points balance
SELECT COALESCE(SUM(amount), 0) as free_balance
FROM dare_points_transactions
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'
AND balance_type = 'FREE';

-- Calculate reserved points balance
SELECT COALESCE(SUM(amount), 0) as reserved_balance
FROM dare_points_transactions
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'
AND balance_type = 'RESERVED';
```

## Querying Transaction History

### Get All Transactions for a User

```sql
SELECT * FROM dare_points_transactions
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC;
```

### Get All Free Balance Transactions

```sql
SELECT * FROM dare_points_transactions
WHERE balance_type = 'FREE'
AND user_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC;
```

### Get All Bet-Related Transactions

```sql
SELECT * FROM dare_points_transactions
WHERE metadata->>'bet_id' = '123e4567-e89b-12d3-a456-426614174001'
ORDER BY created_at ASC;
```

### Get All Transactions from the Same Event

```sql
SELECT * FROM dare_points_transactions
WHERE common_event_id = 'f3b2a1c0-d4e5-f6g7-h8i9-123456789000'
ORDER BY created_at ASC;
```

### Get Total Points Earned from Specific Activities

```sql
SELECT transaction_type, SUM(amount) as total_earned
FROM dare_points_transactions
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'
AND transaction_type IN ('BET_PLACEMENT_BONUS', 'BET_WIN_BONUS', 'DAILY_LOGIN')
AND amount > 0
GROUP BY transaction_type;
```

## Security Considerations

The table uses Row Level Security (RLS) to ensure users can only view their own transactions or transactions where they are the related user. System-level services can insert transactions for any user to facilitate point transfers and adjustments. 