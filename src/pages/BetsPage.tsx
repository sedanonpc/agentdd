import React, { useEffect, useState } from 'react';
import { getOpenStraightBets } from '../services/straightBetsService';
import StraightBetCard from '../components/bet/StraightBetCard';
import { Match } from '../types/match';
import { supabaseClient } from '../services/supabaseService';

const sportOptions = [
  { value: 'all', label: 'All Sports' },
  { value: 'basketball_nba', label: 'NBA' },
  { value: 'sandbox_metaverse', label: 'Sandbox Metaverse' },
  // Add more sports as needed
];

const sortOptions = [
  { value: 'amount', label: 'Bet Amount' },
  { value: 'date', label: 'Created Date' },
];

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'waiting_result', label: 'Waiting Result' },
  { value: 'completed', label: 'Completed' },
  // Do not include 'cancelled'
];

interface BetWithMatch {
  bet: any;
  match: Match | null;
}

// Local getMatchById using the new Match type
const getMatchById = async (id: string): Promise<Match | null> => {
  try {
    const { data, error } = await supabaseClient
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      console.error('Error getting match by ID:', error);
      return null;
    }
    return {
      id: data.id,
      event_type: data.event_type,
      details_id: data.details_id,
      status: data.status,
      scheduled_start_time: data.scheduled_start_time,
      bookmakers: data.bookmakers || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Exception getting match by ID:', error);
    return null;
  }
};

const BetsPage: React.FC = () => {
  const [bets, setBets] = useState<BetWithMatch[]>([]);
  const [sportFilter, setSportFilter] = useState('all');
  const [sortBy, setSortBy] = useState('amount');
  const [sortAsc, setSortAsc] = useState(false); // false = descending, true = ascending
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Dynamically import the correct fetch function based on status
    const fetchBets = async () => {
      let betsRaw = [];
      if (status === 'open') {
        betsRaw = await getOpenStraightBets(100);
      } else {
        // For other statuses, fetch all bets and filter client-side (or implement a getBetsByStatus if available)
        const { getStraightBetsByStatus } = await import('../services/straightBetsService');
        betsRaw = await getStraightBetsByStatus(status, 100);
      }
      const betsWithMatch: BetWithMatch[] = await Promise.all(
        betsRaw.map(async (bet: any) => {
          const match = await getMatchById(bet.matchId);
          return { bet, match };
        })
      );
      setBets(betsWithMatch);
      setLoading(false);
    };
    fetchBets();
  }, [status]);

  // Filtering and sorting using match info
  const filtered = bets.filter(({ match }) =>
    sportFilter === 'all' || (match?.event_type || '').toLowerCase() === sportFilter
  ).sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'amount') cmp = b.bet.amount - a.bet.amount;
    if (sortBy === 'date') cmp = new Date(b.bet.createdAt).getTime() - new Date(a.bet.createdAt).getTime();
    return sortAsc ? -cmp : cmp;
  });

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h1 className="text-2xl font-display text-console-white mb-6">Bets</h1>
      <div className="flex gap-4 mb-6 items-center">
        {/* Status Filter Dropdown */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="bg-console-gray-terminal text-console-white font-mono px-3 py-2 rounded border border-console-blue"
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {/* Sport Filter Dropdown */}
        <select
          value={sportFilter}
          onChange={e => setSportFilter(e.target.value)}
          className="bg-console-gray-terminal text-console-white font-mono px-3 py-2 rounded border border-console-blue"
        >
          {sportOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-console-gray-terminal text-console-white font-mono px-3 py-2 rounded border border-console-blue"
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {/* Sort Order Toggle Button */}
        <button
          onClick={() => setSortAsc((asc) => !asc)}
          className="ml-2 px-3 py-2 text-sm bg-console-blue/80 hover:bg-console-blue-bright text-console-white font-mono rounded border border-console-blue transition-colors h-[40px]"
        >
          {sortAsc ? 'Ascending' : 'Descending'}
        </button>
      </div>
      {loading ? (
        <div className="text-console-white-dim font-mono">Loading bets...</div>
      ) : filtered.length === 0 ? (
        <div className="text-console-white-dim font-mono">No bets found.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ bet, match }) => (
            <StraightBetCard key={bet.id} bet={bet} match={match} status={status} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BetsPage; 