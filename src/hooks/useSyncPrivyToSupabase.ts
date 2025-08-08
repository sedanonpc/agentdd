import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '../services/supabaseService';

export default function useSyncPrivyToSupabase() {
  const { user, authenticated, ready, logout } = usePrivy();

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user) return;

    (async () => {
      try {
        const privyId = (user as any).id as string;
        const email = (user as any)?.email?.address ?? null;
        const wallet = (user as any)?.wallet?.address ?? null;

        // Ensure there is a Supabase session. If not, sign up or sign in using email+dummy password
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          if (email) {
            // Try sign in first
            const { error: signInErr } = await supabase.auth.signInWithPassword({
              email,
              password: privyId,
            });
            if (signInErr) {
              // If sign-in fails, try sign-up; trigger will create user_accounts + 500 points
              const { error: signUpErr } = await supabase.auth.signUp({
                email,
                password: privyId,
              });
              if (signUpErr) throw signUpErr;
            }
          }
        }

        // Now update profile fields with privy_id and wallet
        const { error: syncError } = await supabase.rpc('sync_privy_user', {
          p_privy_id: privyId,
          p_email: email,
          p_wallet: wallet,
        });
        if (syncError) throw syncError;

        // Re-check that session exists; if not, force Privy logout to allow re-login
        const { data: postSyncSession } = await supabase.auth.getSession();
        if (!postSyncSession?.session) {
          await logout();
        }
      } catch (e) {
        console.error('Failed to sync Privy user to Supabase:', e);
      }
    })();
  }, [ready, authenticated, user]);
}


