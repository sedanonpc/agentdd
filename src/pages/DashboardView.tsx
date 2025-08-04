/**
 * DashboardView - Main dashboard page with leaderboard
 * 
 * Replaces UserHomePage with leaderboard functionality while maintaining
 * the existing cyberpunk look-and-feel of the web app.
 */

import React from 'react';
import LeaderboardSectionView from '../components/leaderboard/LeaderboardSectionView';

const DashboardView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Main content container with cyberpunk styling */}
      <div className="max-w-6xl mx-auto px-2 sm:px-0">
        {/* Leaderboard Section */}
        <LeaderboardSectionView />
      </div>
    </div>
  );
};

export default DashboardView;