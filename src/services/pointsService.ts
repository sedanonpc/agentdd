import { supabase } from './userAccountsService';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description: string;
  betId?: string;
  timestamp: number;
}

export const getUserTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('affected_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting transactions:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.affected_user_id,
      amount: parseFloat(row.amount),
      type: row.transaction_key,
      description: `${row.transaction_key}: ${row.amount} points`,
      betId: row.details?.bet_id,
      timestamp: new Date(row.created_at).getTime(),
    }));
  } catch (e) {
    console.error('Error getting transactions:', e);
    return [];
  }
};


