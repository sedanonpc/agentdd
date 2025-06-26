# Database Setup Guide

This guide will help you set up the DARE points system database tables using Supabase CLI.

## Prerequisites
- ✅ Supabase CLI installed 
- ✅ Migration files copied to `supabase/migrations/`
- 🔲 Supabase project created at https://supabase.com
- 🔲 Project reference ID from your Supabase dashboard

## Steps

### 1. Link to your Supabase project
Replace `YOUR_PROJECT_REF` with your actual project reference from the Supabase dashboard:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You'll be prompted for your database password. You can find this in your Supabase project settings.

### 2. Check current database state
```bash
supabase db diff
```

This will show you what changes will be applied.

### 3. Apply the migrations
```bash
supabase db push
```

This will run all the migration files in order:
- `005_create_matches_table.sql` - Creates matches table
- `006_update_matches_table_sport_columns.sql` - Updates matches table
- `007_create_user_accounts_table.sql` - Creates user accounts table  
- `008_create_dare_points_transactions_table.sql` - Creates transactions table and enums
- `009_create_dare_points_config_tables.sql` - Creates config table and functions

### 4. Verify the setup
After successful migration, you should have:

**Tables:**
- `matches` - Sports match data
- `user_accounts` - User profile and points balances
- `dare_points_transactions` - Transaction history
- `dare_points_config` - Configurable point values
- `dare_points_config_history` - Config change history

**Functions:**
- `get_dare_points_value(action)` - Get configured point value
- `update_dare_points_value(action, value, reason)` - Update point values

**Initial Configuration:**
- SIGNUP: 500 points
- REFERRAL_BONUS: 100 points  
- BET_PLACEMENT_BONUS_AWARDED: 10 points
- BET_WIN_BONUS_AWARDED: 50 points
- DAILY_LOGIN: 5 points

### 5. Test the setup
You can test by creating a new user account through your app. The signup process should:
1. Create a user record in `user_accounts` 
2. Award 500 DARE points automatically
3. Create a transaction record in `dare_points_transactions` with type 'SIGNUP'

## Troubleshooting

**If you get permission errors:**
Make sure you're using the correct database password from your Supabase project settings.

**If migrations fail:**
1. Check that all files are in `supabase/migrations/`
2. Run `supabase db diff` to see what conflicts exist
3. You may need to reset and start fresh if there are conflicts

**To reset and start over:**
```bash
supabase db reset
supabase db push
```

## Next Steps
Once the database is set up, your signup bonus system will be fully functional:
- Email signups automatically get 500 DARE points
- Wallet signups automatically get 500 DARE points  
- All transactions are recorded for audit purposes
- Point values are configurable via the admin interface 