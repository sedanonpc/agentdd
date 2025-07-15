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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getOpenStraightBets(100).then(async (openBets) => {
      const betsWithMatch: BetWithMatch[] = await Promise.all(
        openBets.map(async (bet) => {
          const match = await getMatchById(bet.matchId);
          return { bet, match };
        })
      );
      setBets(betsWithMatch);
      setLoading(false);
    });
  }, []);

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
      <h1 className="text-2xl font-display text-console-white mb-6">Open Bets</h1>
      <div className="flex gap-4 mb-6 items-center">
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
        <div className="text-console-white-dim font-mono">Loading open bets...</div>
      ) : filtered.length === 0 ? (
        <div className="text-console-white-dim font-mono">No open bets found.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ bet, match }) => (
            <StraightBetCard key={bet.id} bet={bet} match={match} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BetsPage; 