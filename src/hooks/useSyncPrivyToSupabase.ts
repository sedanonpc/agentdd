import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '../services/supabaseService';

export default function useSyncPrivyToSupabase() {
  const appId = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;
  if (!appId) {
    // No-op when Privy is not configured
    return;
  }
  const { user, authenticated } = usePrivy();

  useEffect(() => {
    if (!authenticated || !user) return;

    (async () => {
      const email = user.email?.address ?? null;
      const password = user.id; // deterministic dummy per free-tier constraint

      // 1) Ensure Supabase session (sign in or sign up)
      let session = null;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email!,
          password,
        });
        if (!error) session = data.session;
      } catch {}

      if (!session && email) {
        // Try to sign up, then sign in
        try {
          await supabase.auth.signUp({ email, password });
          const { data } = await supabase.auth.signInWithPassword({ email, password });
          session = data.session;
        } catch (e) {
          console.error('Supabase signUp/signIn failed', e);
          return;
        }
      }

      if (!session) {
        console.warn('No Supabase session; cannot sync to SoT');
        return;
      }

      // 2) Sync Privy user to Supabase SoT and award daily login
      const { error: rpcError } = await supabase
        .rpc('sync_privy_user', {
          p_privy_id: user.id,
          p_email: email,
          p_wallet: user.wallet?.address ?? null,
        })
        .single();
      if (rpcError) {
        console.error('sync_privy_user RPC error', rpcError);
      }
    })();
  }, [authenticated, user]);
}


