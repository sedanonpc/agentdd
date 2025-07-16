import React, { useMemo, useState } from 'react';
import { useMatches } from '../context/MatchesContext';
import { SandboxMatchCard } from '../components/match/SandboxMatchCard';
import { MatchWithDetails } from '../types/match';

// Simple NBA match card for display
const NBAMatchCard: React.FC<{ match: MatchWithDetails }> = ({ match }) => {
  if (match.eventType !== 'basketball_nba') return null;
  const { details, match: base } = match;
  return (
    <div className="bg-console-gray-terminal/70 border-1 border-console-blue shadow-terminal rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-mono text-console-blue-bright">NBA</div>
        <div className="text-xs font-mono text-console-white">{new Date(base.scheduledStartTime).toLocaleString()}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {details.homeTeamLogo && <img src={details.homeTeamLogo} alt={details.homeTeamName} className="w-8 h-8 rounded-full" />}
          <span className="font-mono text-console-white-bright text-lg">{details.homeTeamName}</span>
        </div>
        <span className="font-mono text-console-blue-bright text-xl font-bold">VS</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-console-white-bright text-lg">{details.awayTeamName}</span>
          {details.awayTeamLogo && <img src={details.awayTeamLogo} alt={details.awayTeamName} className="w-8 h-8 rounded-full" />}
        </div>
      </div>
      {details.gameSubtitle && <div className="mt-2 text-xs text-console-white-dim font-mono">{details.gameSubtitle}</div>}
      {details.venue && <div className="text-xs text-console-white-dim font-mono">{details.venue}</div>}
    </div>
  );
};

const UPCOMING_WINDOW_DAYS = 30;

const MatchesPage: React.FC = () => {
  const { matchesWithDetails, loading, error } = useMatches();
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Group matches by event_type
  const grouped = useMemo(() => {
    const now = Date.now();
    const windowMs = UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const groups: Record<string, MatchWithDetails[]> = {};
    for (const m of matchesWithDetails) {
      if (new Date(m.match.scheduledStartTime).getTime() - now > windowMs) continue;
      if (!groups[m.eventType]) groups[m.eventType] = [];
      groups[m.eventType].push(m);
    }
    // Sort each group by scheduled_start_time
    for (const key in groups) {
      groups[key].sort((a, b) => new Date(a.match.scheduledStartTime).getTime() - new Date(b.match.scheduledStartTime).getTime());
    }
    return groups;
  }, [matchesWithDetails]);

  // Featured: 2–3 soonest per sport
  const featured = useMemo(() => {
    const out: Record<string, MatchWithDetails[]> = {};
    for (const key in grouped) {
      out[key] = grouped[key].slice(0, 3);
    }
    return out;
  }, [grouped]);

  // Unified list: filter and sort
  const filteredSorted = useMemo(() => {
    let arr = matchesWithDetails;
    if (selectedSport !== 'all') {
      arr = arr.filter(m => m.eventType === selectedSport);
    }
    arr = arr.slice().sort((a, b) => {
      const tA = new Date(a.match.scheduledStartTime).getTime();
      const tB = new Date(b.match.scheduledStartTime).getTime();
      return sortOrder === 'asc' ? tA - tB : tB - tA;
    });
    return arr;
  }, [matchesWithDetails, selectedSport, sortOrder]);

  const sportOptions = useMemo(() => {
    const set = new Set(matchesWithDetails.map(m => m.eventType));
    return Array.from(set).filter(Boolean);
  }, [matchesWithDetails]);

  return (
    <div className="space-y-8">
      {/* Featured Matches Section */}
      <div>
        <h2 className="text-xl font-display text-console-blue-bright mb-4">Featured matches</h2>
        <div className="space-y-8">
          {Object.entries(featured).map(([sport, matches]) => (
            <div key={sport}>
              <h3 className="text-lg font-mono text-console-white mb-2 capitalize">{sport.replace('_', ' ')}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {matches.map(m =>
                  m.eventType === 'basketball_nba' ? (
                    <NBAMatchCard key={m.match.id} match={m} />
                  ) : (
                    <SandboxMatchCard
                      key={m.match.id}
                      scheduledStartTime={m.match.scheduledStartTime}
                      player1Name={m.details.player1Name}
                      player1Subtitle={m.details.player1Subtitle}
                      player1ImageUrl={m.details.player1ImageUrl}
                      player2Name={m.details.player2Name}
                      player2Subtitle={m.details.player2Subtitle}
                      player2ImageUrl={m.details.player2ImageUrl}
                      onSelectForChat={() => {}}
                      onSelectForBetting={() => {}}
                      isChatSelected={false}
                      isBettingSelected={false}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unified List Section */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <label className="font-mono text-console-white">Event:</label>
          <select
            className="bg-console-gray-terminal border border-console-blue text-console-white font-mono px-2 py-1 rounded"
            value={selectedSport}
            onChange={e => setSelectedSport(e.target.value)}
          >
            <option value="all">All</option>
            {sportOptions.map(s => (
              <option key={s} value={s}>{s ? s.replace('_', ' ') : ''}</option>
            ))}
          </select>
          <label className="font-mono text-console-white ml-6">Sort by:</label>
          <button
            className="bg-console-blue/80 text-black font-mono px-3 py-1 rounded border border-console-blue ml-2"
            onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
          >
            Scheduled Time {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
        <div className="space-y-4">
          {filteredSorted.length === 0 && (
            <div className="text-console-white-dim font-mono text-center mt-10">No matches found.</div>
          )}
          {filteredSorted.map(m =>
            m.eventType === 'basketball_nba' ? (
              <NBAMatchCard key={m.match.id} match={m} />
            ) : (
              <SandboxMatchCard
                key={m.match.id}
                scheduledStartTime={m.match.scheduledStartTime}
                player1Name={m.details.player1Name}
                player1Subtitle={m.details.player1Subtitle}
                player1ImageUrl={m.details.player1ImageUrl}
                player2Name={m.details.player2Name}
                player2Subtitle={m.details.player2Subtitle}
                player2ImageUrl={m.details.player2ImageUrl}
                onSelectForChat={() => {}}
                onSelectForBetting={() => {}}
                isChatSelected={false}
                isBettingSelected={false}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchesPage;