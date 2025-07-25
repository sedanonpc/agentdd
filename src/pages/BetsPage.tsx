import React, { useEffect, useState } from 'react';
import { getOpenStraightBets } from '../services/straightBetsService';
import StraightBetCard from '../components/bet/StraightBetCard';
import { MatchWithDetails } from '../types/match';
import { getMatchWithDetailsById } from '../services/supabaseService';

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
  matchWithDetails: MatchWithDetails | null;
}

const BetsPage: React.FC = () => {
  const [bets, setBets] = useState<BetWithMatch[]>([]);
  const [sportFilter, setSportFilter] = useState('all');
  const [sortBy, setSortBy] = useState('amount');
  const [sortAsc, setSortAsc] = useState(false); // false = descending, true = ascending
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchBets = async () => {
      let betsRaw = [];
      if (status === 'open') {
        betsRaw = await getOpenStraightBets(100);
      } else {
        const { getStraightBetsByStatus } = await import('../services/straightBetsService');
        betsRaw = await getStraightBetsByStatus(status, 100);
      }
      
      // Map the bets to include match details that are now part of the bet data
      const betsWithMatch: BetWithMatch[] = betsRaw.map((bet: any) => ({
        bet,
        matchWithDetails: bet.matchWithDetails
      }));
      
      setBets(betsWithMatch);
      setLoading(false);
    };
    fetchBets();
  }, [status]);

  // Filtering and sorting using match info
  const filtered = bets.filter(({ matchWithDetails }) =>
    sportFilter === 'all' || (matchWithDetails?.eventType || '').toLowerCase() === sportFilter
  ).sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'amount') cmp = b.bet.amount - a.bet.amount;
    if (sortBy === 'date') cmp = new Date(b.bet.createdAt).getTime() - new Date(a.bet.createdAt).getTime();
    return sortAsc ? -cmp : cmp;
  });

  return (
    <div className="space-y-8">
      {/* Enhanced Bets Header - Similar to Featured Matches */}
      <div className="bg-gradient-to-br from-console-gray-terminal/40 to-console-black/60 backdrop-blur-sm border-2 border-console-blue/50 shadow-2xl rounded-lg overflow-hidden">
        {/* Header with Glow Effect */}
        <div className="bg-console-blue/20 backdrop-blur-xs border-b-2 border-console-blue/30 p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#E5FF03] rounded-full animate-pulse-slow shadow-yellow-glow"></div>
            <h1 className="text-2xl font-display text-console-blue-bright mb-0 uppercase tracking-wider">
              💰 Live Betting Market
            </h1>
            <div className="h-px bg-gradient-to-r from-console-blue/50 to-transparent flex-1"></div>
          </div>
          <div className="mt-2 text-console-white-dim text-sm font-mono">
            Active bets • Real-time market • Community driven
          </div>
        </div>
        
        {/* Filter Controls */}
        <div className="p-6">
          <div className="flex gap-4 mb-6 items-center flex-wrap">
            {/* Status Filter Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-console-white-dim uppercase tracking-wider">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="bg-console-gray-terminal border border-console-blue text-console-white font-mono px-3 py-2 rounded focus:border-console-blue-bright focus:outline-none"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Sport Filter Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-console-white-dim uppercase tracking-wider">Sport</label>
              <select
                value={sportFilter}
                onChange={e => setSportFilter(e.target.value)}
                className="bg-console-gray-terminal border border-console-blue text-console-white font-mono px-3 py-2 rounded focus:border-console-blue-bright focus:outline-none"
              >
                {sportOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Sort Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-console-white-dim uppercase tracking-wider">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-console-gray-terminal border border-console-blue text-console-white font-mono px-3 py-2 rounded focus:border-console-blue-bright focus:outline-none"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Sort Order Toggle Button */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono text-console-white-dim uppercase tracking-wider">Order</label>
              <button
                onClick={() => setSortAsc((asc) => !asc)}
                className="px-3 py-2 text-sm bg-console-blue/80 hover:bg-console-blue-bright text-console-white font-mono rounded border border-console-blue transition-colors h-[40px] hover:shadow-button"
              >
                {sortAsc ? '↑ Ascending' : '↓ Descending'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bets List Section */}
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="text-console-white-dim font-mono text-center py-8">Loading bets...</div>
        ) : filtered.length === 0 ? (
          <div className="text-console-white-dim font-mono text-center py-8">No bets found.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map(({ bet, matchWithDetails }) => (
              <StraightBetCard key={bet.id} bet={bet} matchWithDetails={matchWithDetails} status={status} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BetsPage; 