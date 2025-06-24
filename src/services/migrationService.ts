import { supabase } from './supabaseService';

/**
 * Migration service to handle the transition from user_profiles to user_accounts
 * This will be called once during application initialization
 */
export const migrateToUserAccounts = async (): Promise<boolean> => {
  try {
    console.log('Starting migration from user_profiles to user_accounts...');
    
    // 1. Check if user_accounts table exists
    const { error: userAccountsExistsError } = await supabase
      .from('user_accounts')
      .select('account_id')
      .limit(1);
    
    // If user_accounts table doesn't exist yet, create it
    if (userAccountsExistsError) {
      console.log('Creating user_accounts table...');
      
      // Create the table using raw SQL
      const { error: createTableError } = await supabase.rpc('create_user_accounts_table');
      
      if (createTableError && createTableError.code !== 'PGRST301') {
        console.error('Error creating user_accounts table:', createTableError);
        return false;
      }
    }
    
    // 2. Check if user_profiles table exists
    const { error: userProfilesExistsError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    // If user_profiles doesn't exist, no migration needed
    if (userProfilesExistsError) {
      console.log('No user_profiles table found, migration not needed.');
      return true;
    }
    
    // 3. Check if migration has already been performed
    const { data: migrationFlag, error: migrationFlagError } = await supabase
      .from('migration_flags')
      .select('completed')
      .eq('name', 'user_profiles_to_accounts')
      .single();
    
    if (!migrationFlagError && migrationFlag?.completed) {
      console.log('Migration already completed.');
      return true;
    }
    
    // 4. Migrate data from user_profiles to user_accounts
    console.log('Migrating data from user_profiles to user_accounts...');
    
    // Get all users from user_profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return false;
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('No user profiles to migrate.');
      return true;
    }
    
    // Insert each profile into user_accounts
    let successCount = 0;
    
    for (const profile of profiles) {
      const { error: insertError } = await supabase
        .from('user_accounts')
        .insert({
          supabase_user_id: profile.user_id,
          email: profile.email,
          wallet_address: profile.wallet_address,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          unprovisioned_points: profile.dare_points || 500,
          provisioned_points: 0
        });
      
      if (insertError) {
        console.error(`Error migrating user ${profile.user_id}:`, insertError);
      } else {
        successCount++;
      }
    }
    
    console.log(`Successfully migrated ${successCount} of ${profiles.length} user profiles.`);
    
    // 5. Record migration completion
    try {
      await supabase
        .from('migration_flags')
        .insert({
          name: 'user_profiles_to_accounts',
          completed: true,
          completed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error recording migration completion:', error);
      // Non-critical error, continue
    }
    
    return successCount > 0;
  } catch (error) {
    console.error('Error during migration:', error);
    return false;
  }
};

/**
 * Check if migration is needed
 */
export const isMigrationNeeded = async (): Promise<boolean> => {
  try {
    // Check if user_profiles table exists but user_accounts doesn't
    const { error: userProfilesExistsError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    const { error: userAccountsExistsError } = await supabase
      .from('user_accounts')
      .select('account_id')
      .limit(1);
    
    // Migration is needed if user_profiles exists but user_accounts doesn't
    return !userProfilesExistsError && !!userAccountsExistsError;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * Create migration_flags table if it doesn't exist
 */
export const ensureMigrationFlagsTable = async (): Promise<void> => {
  try {
    // Check if migration_flags table exists
    const { error } = await supabase
      .from('migration_flags')
      .select('name')
      .limit(1);
    
    if (error) {
      console.log('Creating migration_flags table...');
      
      // Create the table using raw SQL
      const { error: createError } = await supabase.rpc('create_migration_flags_table');
      
      if (createError && createError.code !== 'PGRST301') {
        console.error('Error creating migration_flags table:', createError);
      }
    }
  } catch (error) {
    console.error('Error ensuring migration_flags table:', error);
  }
};

/**
 * Initialize migration process
 */
export const initializeMigration = async (): Promise<void> => {
  try {
    // Ensure migration_flags table exists
    await ensureMigrationFlagsTable();
    
    // Check if migration is needed
    const needed = await isMigrationNeeded();
    
    if (needed) {
      console.log('Migration from user_profiles to user_accounts is needed.');
      const success = await migrateToUserAccounts();
      
      if (success) {
        console.log('Migration completed successfully.');
      } else {
        console.error('Migration failed or partially completed.');
      }
    } else {
      console.log('No migration needed.');
    }
  } catch (error) {
    console.error('Error initializing migration:', error);
  }
}; 