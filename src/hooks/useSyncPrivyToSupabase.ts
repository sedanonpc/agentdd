import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '../services/supabaseService';

export default function useSyncPrivyToSupabase() {
  const { user, authenticated } = usePrivy();

  useEffect(() => {
    if (!authenticated || !user) return;

    (async () => {
      try {
        const privyId = (user as any).id as string;
        const email = (user as any)?.email?.address ?? null;
        const wallet = (user as any)?.wallet?.address ?? null;

        const { error: syncError } = await supabase.rpc('sync_privy_user', {
          p_privy_id: privyId,
          p_email: email,
          p_wallet: wallet,
        });
        if (syncError) throw syncError;
      } catch (e) {
        console.error('Failed to sync Privy user to Supabase:', e);
      }
    })();
  }, [authenticated, user]);
}


