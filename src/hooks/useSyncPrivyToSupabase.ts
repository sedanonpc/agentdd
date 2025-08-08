import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '../services/supabaseService';

export default function useSyncPrivyToSupabase() {
  const { user, authenticated } = usePrivy();

  useEffect(() => {
    if (!authenticated || !user) return;

    (async () => {
      // Upsert user via RPC
      const { data, error } = await supabase
        .rpc('sync_privy_user', {
          p_privy_id: user.id,
          p_email: user.email?.address ?? null,
          p_wallet: user.wallet?.address ?? null,
        })
        .single();

      if (error) {
        console.error('sync_privy_user RPC error', error);
        return;
      }

      // Optionally refresh session or fetch points if needed
      // Supabase remains SoT for points; read via existing services if required
    })();
  }, [authenticated, user]);
}


