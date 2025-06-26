import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Button, 
  Chip, 
  Container,
  useTheme,
  Avatar,
  useMediaQuery,
  Tabs,
  Tab,
  Divider,
  Alert
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RefreshIcon from '@mui/icons-material/Refresh';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { getUsersByPoints, getOpenBets, getClosedBets, LeaderboardEntry } from '../services/betStorageService';
import { useAuth } from '../context/AuthContext';
import { truncateAddress } from '../utils/addressUtils';
import { useWeb3 } from '../context/Web3Context';
import { usePoints } from '../context/PointsContext';
import { Bet, BetStatus } from '../types';
import MarketplaceBetCard from '../components/bet/MarketplaceBetCard';
import { useBetting } from '../context/BettingContext';
import { toast } from 'react-toastify';
import { getMockLeaderboardEntries, getMockOpenBets, getMockClosedBets } from '../mockSupabase';

// Number of users to fetch for the leaderboard
const LEADERBOARD_LIMIT = 100;

// Refresh interval in ms (10 seconds for more frequent updates)
const REFRESH_INTERVAL = 10000;

// Create a global refresh counter
let globalRefreshCount = 0;

// Helper function to calculate win rate percentage
const calculateWinRate = (wonBets: number, totalBets: number): number => {
  if (totalBets === 0) return 0;
  return Math.round((wonBets / totalBets) * 100);
};

// Add mock user data for demo accounts
const MOCK_USERS: LeaderboardEntry[] = [
  {
    user_id: 'mock_1',
    wallet_address: '0x50...b0d',
    username: 'Demo Account',
    total_bets: 15,
    wins: 12,
    losses: 3,
    total_wagered: 1500,
    total_won: 1800,
    win_rate: 80,
    dare_points: 1500,
    is_mock: true
  },
  {
    user_id: 'mock_2',
    wallet_address: '0xe56...bcd',
    username: 'Demo Account',
    total_bets: 15,
    wins: 10,
    losses: 5,
    total_wagered: 1300,
    total_won: 1600,
    win_rate: 67,
    dare_points: 1300,
    is_mock: true
  },
  {
    user_id: 'mock_3',
    wallet_address: '0xa98...234',
    username: 'Demo Account',
    total_bets: 10,
    wins: 8,
    losses: 2,
    total_wagered: 1100,
    total_won: 1400,
    win_rate: 80,
    dare_points: 1100,
    is_mock: true
  },
  {
    user_id: 'mock_4',
    wallet_address: '0xb73...c4d',
    username: 'Demo Account',
    total_bets: 11,
    wins: 7,
    losses: 4,
    total_wagered: 950,
    total_won: 1200,
    win_rate: 64,
    dare_points: 950,
    is_mock: true
  },
  {
    user_id: 'mock_5',
    wallet_address: '0x0a9...d5e',
    username: 'Demo Account',
    total_bets: 9,
    wins: 6,
    losses: 3,
    total_wagered: 800,
    total_won: 1000,
    win_rate: 67,
    dare_points: 800,
    is_mock: true
  }
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`marketplace-tabpanel-${index}`}
      aria-labelledby={`marketplace-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `marketplace-tab-${index}`,
    'aria-controls': `marketplace-tabpanel-${index}`,
  };
}

const LeaderboardRankColor = (rank: number) => {
  switch (rank) {
    case 1: return '#FFD700'; // Gold
    case 2: return '#C0C0C0'; // Silver
    case 3: return '#CD7F32'; // Bronze
    default: return '#FFFFFF';
  }
};

// Add a debounce function to prevent too many updates
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

const Leaderboard = () => {
  const [pointsRanking, setPointsRanking] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openBets, setOpenBets] = useState<Bet[]>([]);
  const [closedBets, setClosedBets] = useState<Bet[]>([]);
  const [loadingBets, setLoadingBets] = useState<boolean>(true);
  const [marketplaceTab, setMarketplaceTab] = useState(0);
  const [processingBetId, setProcessingBetId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { acceptBet, refreshBets: refreshUserBets } = useBetting();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { account } = useWeb3();
  const { userBalance } = usePoints();
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [forceRefreshCount, setForceRefreshCount] = useState<number>(0);

  // Fetch leaderboard data
  const fetchLeaderboards = useCallback(async () => {
    try {
      let leaderboardData: LeaderboardEntry[] = [];
      
      // Try to get the data from the API
      try {
        // Fetch up to 100 users for the leaderboard
        leaderboardData = await getUsersByPoints(LEADERBOARD_LIMIT);
        console.log(`📊 Leaderboard entries: ${leaderboardData.length}`);
        
        // Always add demo accounts to ensure the leaderboard is populated
        console.log('📊 Adding demo accounts to supplement real data');
        
        // Get mock data with the Demo Account label
        const mockData = getMockLeaderboardEntries().map(entry => ({
          ...entry,
          is_mock: true // Ensure they're marked as mock
        }));
        
        // Always add at least 3 mock entries, regardless of how many real users we have
        const mockEntriesNeeded = Math.min(5, mockData.length);
        const selectedMockEntries = mockData.slice(0, mockEntriesNeeded);
        
        // Combine real and mock data
        leaderboardData = [...leaderboardData, ...selectedMockEntries];
        
        // Sort by dare_points to maintain correct order
        leaderboardData.sort((a, b) => {
          const pointsA = a.dare_points !== undefined ? a.dare_points : 0;
          const pointsB = b.dare_points !== undefined ? b.dare_points : 0;
          return pointsB - pointsA;
        });
        
        console.log(`📊 Leaderboard now has ${leaderboardData.length} entries (including ${selectedMockEntries.length} demo accounts)`);
      } catch (error) {
        console.error('❌ Error fetching leaderboard data from API:', error);
        
        // If we have a problem, use mock data as fallback in development mode
        if (import.meta.env.DEV) {
          console.log('🔄 Using mock data as fallback for leaderboard');
          leaderboardData = getMockLeaderboardEntries().map(entry => ({
            ...entry,
            is_mock: true
          }));
        }
      }
      
      // Only update state if we have data and it's different from current state
      const shouldUpdate = leaderboardData.length > 0 && 
                (pointsRanking.length !== leaderboardData.length ||
        JSON.stringify(pointsRanking.map(u => u.user_id).sort()) !== 
         JSON.stringify(leaderboardData.map(u => u.user_id).sort()));
      
      if (shouldUpdate) {
        setPointsRanking(leaderboardData);
      }
      
      // If we have no data at all, force the mock data
      if (leaderboardData.length === 0 && pointsRanking.length === 0 && import.meta.env.DEV) {
        const forcedMockData = getMockLeaderboardEntries().map(entry => ({
          ...entry,
          is_mock: true
        }));
        console.log('⚠️ No leaderboard entries found, forcing mock data:', forcedMockData.length);
                  setPointsRanking(forcedMockData);
      }
    } catch (error) {
      console.error('❌ Fatal error in fetchLeaderboards:', error);
    } finally {
      setLoading(false);
    }
      }, [pointsRanking]);

  // Initial data load
  useEffect(() => {
    fetchLeaderboards();
    // Set up periodic refresh every 10 seconds (instead of previous 3 seconds)
    const intervalId = setInterval(() => {
      fetchLeaderboards();
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [fetchLeaderboards, forceRefreshCount]);

  // Force a full refresh of data
  const handleForceRefresh = useCallback(() => {
    setForceRefreshCount(prev => prev + 1);
    fetchLeaderboards();
  }, [fetchLeaderboards]);
  
  // Get user rank if they exist in the leaderboard
  const getUserRank = () => {
    if (!account) return null;
    
    const index = pointsRanking.findIndex(user => 
      user.wallet_address && user.wallet_address.toLowerCase() === account.toLowerCase()
    );
    
    return index >= 0 ? index + 1 : null;
  };
  
  // Get formatted time since last refresh
  const getTimeSinceRefresh = () => {
    const seconds = Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 1000);
    return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
  };

  // Fetch all bets
  const fetchBets = useCallback(async () => {
    try {
      console.log('🔄 Fetching bets...');
      setLoadingBets(true);
      const startTime = performance.now();
      
      // Try to get the data from the API
      let openBetsData: Bet[] = [];
      let closedBetsData: Bet[] = [];
      
      try {
        [openBetsData, closedBetsData] = await Promise.all([
          getOpenBets(),
          getClosedBets()
        ]);
        
        // Log the results
        const endTime = performance.now();
        console.log(`✅ Bets fetched in ${(endTime - startTime).toFixed(0)}ms`);
        console.log(`📊 Open bets: ${openBetsData.length}, Closed bets: ${closedBetsData.length}`);
      } catch (error) {
        console.error('❌ Error fetching bets from API:', error);
        
        // If we have a problem, use mock data as fallback in development mode
        if (import.meta.env.DEV) {
          console.log('🔄 Using mock data as fallback');
          openBetsData = getMockOpenBets();
          closedBetsData = getMockClosedBets();
        }
      }
      
      // Only update state if we have data and it's different from current state
      const shouldUpdateOpen = openBetsData.length > 0 && 
        (openBets.length !== openBetsData.length || 
         JSON.stringify(openBets.map(b => b.id).sort()) !== 
         JSON.stringify(openBetsData.map(b => b.id).sort()));
        
      const shouldUpdateClosed = closedBetsData.length > 0 && 
        (closedBets.length !== closedBetsData.length || 
         JSON.stringify(closedBets.map(b => b.id).sort()) !== 
         JSON.stringify(closedBetsData.map(b => b.id).sort()));
      
      // Log any new bets we found
      if (shouldUpdateOpen) {
        const currentOpenBetIds = openBets.map(bet => bet.id);
        const newOpenBets = openBetsData.filter(bet => !currentOpenBetIds.includes(bet.id));
        
        if (newOpenBets.length > 0) {
          console.log(`🆕 Found ${newOpenBets.length} new open bets`);
          
          // Show a toast only for real (non-mock) new bets
          const realNewBets = newOpenBets.filter(bet => !bet.is_mock);
          if (realNewBets.length > 0) {
            toast.info(`Found ${realNewBets.length} new bets`, { 
              autoClose: 2000,
              hideProgressBar: true,
              position: 'bottom-right'
            });
          }
          
          // Log sample bets for debugging
          console.log('📋 Sample new bets:', newOpenBets.slice(0, 2).map(bet => ({
            id: bet.id,
            is_mock: bet.is_mock,
            creator: bet.creator.slice(0, 10) + '...',
            amount: bet.amount,
            description: bet.description
          })));
        }
        
        // Update the state with new open bets
        setOpenBets(openBetsData);
      }
      
      // Update closed bets state if needed
      if (shouldUpdateClosed) {
        setClosedBets(closedBetsData);
      }
      
      // If we have no data at all (not even mock data), force the mock data
      if (openBetsData.length === 0 && openBets.length === 0 && import.meta.env.DEV) {
        const forcedMockData = getMockOpenBets();
        console.log('⚠️ No open bets found, forcing mock data:', forcedMockData.length);
        setOpenBets(forcedMockData);
      }
      
      if (closedBetsData.length === 0 && closedBets.length === 0 && import.meta.env.DEV) {
        const forcedMockData = getMockClosedBets();
        console.log('⚠️ No closed bets found, forcing mock data:', forcedMockData.length);
        setClosedBets(forcedMockData);
      }
    } catch (error) {
      console.error('❌ Fatal error in fetchBets:', error);
    } finally {
      setLoadingBets(false);
    }
  }, [openBets, closedBets]);

  // Initial data loading and subscription setup
  useEffect(() => {
    // Initial data fetch
    fetchLeaderboards();
    fetchBets();
    
    // Create debounced versions of the fetch functions
    const debouncedFetchLeaderboards = debounce(fetchLeaderboards, 500);
    const debouncedFetchBets = debounce(fetchBets, 500);
    
    // Set up interval for polling with reduced frequency
    const intervalId = setInterval(() => {
      globalRefreshCount++;
      console.log(`🔄 Auto-refresh #${globalRefreshCount}`);
      debouncedFetchLeaderboards();
      debouncedFetchBets();
    }, REFRESH_INTERVAL);
    
    // Add event listeners for manual refresh triggers
    const handleBetCreated = () => {
      console.log('🎲 Bet created event detected');
      setTimeout(() => debouncedFetchBets(), 1000);
      setTimeout(() => debouncedFetchLeaderboards(), 1500);
    };
    
    const handleBetAccepted = () => {
      console.log('✅ Bet accepted event detected');
      setTimeout(() => debouncedFetchBets(), 1000);
      setTimeout(() => debouncedFetchLeaderboards(), 1500);
    };
    
    const handleRefreshRequired = () => {
      console.log('🔄 General refresh event detected');
      setTimeout(() => debouncedFetchBets(), 1000);
      setTimeout(() => debouncedFetchLeaderboards(), 1500);
    };
    
    // Listen for custom events
    window.addEventListener('bet-created', handleBetCreated);
    window.addEventListener('bet-accepted', handleBetAccepted);
    window.addEventListener('bet-refresh-required', handleRefreshRequired);
    
    // Cleanup interval and event listeners on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('bet-created', handleBetCreated);
      window.removeEventListener('bet-accepted', handleBetAccepted);
      window.removeEventListener('bet-refresh-required', handleRefreshRequired);
    };
  }, [fetchLeaderboards, fetchBets]);

  const handleAcceptBet = async (bet: Bet) => {
    setProcessingBetId(bet.id);
    try {
      const result = await acceptBet(bet);
      if (result) {
        toast.success('Bet accepted successfully!');
        
        // Remove from open bets since it's now active
        setOpenBets(prevBets => prevBets.filter(b => b.id !== bet.id));
        
        // Refresh user bets in BettingContext
        await refreshUserBets();
        
        // Refresh both open and closed bets to ensure consistency
        await fetchBets();
        
        // Refresh leaderboard to show updated points
        await fetchLeaderboards();
        
        // Dispatch an event to notify other components
        window.dispatchEvent(new CustomEvent('bet-accepted', { detail: bet.id }));
      }
    } catch (error) {
      console.error('Error accepting bet:', error);
      toast.error('Failed to accept bet. Please try again.');
    } finally {
      setProcessingBetId(null);
    }
  };
  
  const handleMarketplaceTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setMarketplaceTab(newValue);
  };

  const renderLeaderboardTable = (data: LeaderboardEntry[]) => {
    return (
      <Box sx={{ position: 'relative', height: { xs: '400px', md: '500px' } }}>
        <TableContainer 
          component={Paper} 
          sx={{ 
            backgroundColor: 'rgba(10, 25, 41, 0.9)', 
            border: '1px solid #1976d2',
            boxShadow: '0 0 10px rgba(25, 118, 210, 0.4)',
            overflow: 'auto',
            height: '100%',
            position: 'relative',
            '&::-webkit-scrollbar': {
              width: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.1)'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(25, 118, 210, 0.5)',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.7)'
              }
            }
          }}
        >
          <Table 
            sx={{ 
              minWidth: { xs: 300, sm: 550, md: 650 }, 
              "& .MuiTableCell-root": { 
                color: '#fff',
                borderColor: 'rgba(25, 118, 210, 0.3)',
                padding: { xs: '8px 6px', sm: '16px' }
              },
              tableLayout: 'fixed'
            }} 
            aria-label="leaderboard table"
            stickyHeader
            size={isMobile ? "small" : "medium"}
          >
            <TableHead>
              <TableRow>
                <TableCell 
                  sx={{ 
                    fontWeight: 'bold', 
                    backgroundColor: 'rgba(10, 25, 41, 0.95)',
                    width: { xs: '40px', sm: '60px' }
                  }}
                >
                  Rank
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 'bold', 
                    backgroundColor: 'rgba(10, 25, 41, 0.95)'
                  }}
                >
                  User
                </TableCell>
                <TableCell 
                  align="right" 
                  sx={{ 
                    fontWeight: 'bold', 
                    backgroundColor: 'rgba(10, 25, 41, 0.95)',
                    width: { xs: '100px', sm: '120px' }
                  }}
                >
                  $DARE Points
                </TableCell>
                <TableCell 
                  align="right" 
                  sx={{ 
                    fontWeight: 'bold', 
                    backgroundColor: 'rgba(10, 25, 41, 0.95)',
                    display: { xs: 'none', md: 'table-cell' },
                    width: '100px'
                  }}
                >
                  Win Rate
                </TableCell>
                <TableCell 
                  align="right" 
                  sx={{ 
                    fontWeight: 'bold', 
                    backgroundColor: 'rgba(10, 25, 41, 0.95)',
                    display: { xs: 'none', sm: 'table-cell' },
                    width: '100px'
                  }}
                >
                  Total Bets
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((entry, index) => (
                <TableRow
                  key={entry.user_id}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    backgroundColor: user?.id === entry.user_id 
                      ? 'rgba(25, 118, 210, 0.15)' 
                      : entry.is_mock
                        ? 'rgba(142, 36, 170, 0.08)'
                        : index % 2 === 0 
                          ? 'transparent' 
                          : 'rgba(10, 25, 41, 0.5)',
                    '&:hover': { backgroundColor: entry.is_mock ? 'rgba(142, 36, 170, 0.15)' : 'rgba(25, 118, 210, 0.08)' },
                    borderLeft: entry.is_mock ? '2px solid rgba(142, 36, 170, 0.3)' : 'none'
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: LeaderboardRankColor(index + 1),
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      {index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ 
                        width: { xs: 20, sm: 24 }, 
                        height: { xs: 20, sm: 24 }, 
                        bgcolor: entry.is_mock 
                          ? `hsl(${index * 36 + 140}, 80%, 35%)` // More colorful for mock users
                          : `hsl(${index * 36}, 70%, 50%)`,
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        {entry.is_mock 
                          ? <SportsEsportsIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: '#f0f0f0' }} /> 
                          : (entry.username?.charAt(0) || (entry.wallet_address ? entry.wallet_address.charAt(2) : '?'))}
                      </Avatar>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography 
                            variant={isMobile ? "body2" : "body1"} 
                            noWrap 
                            sx={{ 
                              maxWidth: { xs: '120px', sm: '200px' },
                              fontWeight: entry.is_mock ? 'medium' : 'normal',
                              color: entry.is_mock ? '#e0e0e0' : '#ffffff'
                            }}
                          >
                            {entry.username || truncateAddress(entry.wallet_address || '', isMobile ? 4 : 6, isMobile ? 3 : 4)}
                          </Typography>
                          {entry.is_mock && (
                            <Chip
                              label="Demo"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.6rem',
                                bgcolor: 'rgba(142, 36, 170, 0.3)',
                                color: '#ce93d8',
                                '& .MuiChip-label': { px: 0.75, py: 0 }
                              }}
                            />
                          )}
                        </Box>
                        {user?.id === entry.user_id && (
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#E5FF03', lineHeight: 1 }}>
                            You
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      fontWeight="bold" 
                      variant={isMobile ? "body2" : "body1"} 
                      sx={{ 
                        color: entry.is_mock ? '#ce93d8' : '#E5FF03',
                        textShadow: entry.is_mock ? '0 0 8px rgba(206, 147, 216, 0.5)' : 'none'
                      }}
                    >
                      {entry.dare_points || 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {`${((entry.win_rate || 0) * 100).toFixed(1)}%`}
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {entry.total_bets || 0}
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body1" color="#E5FF03" sx={{ py: 4 }}>
                      No data available yet. Start betting to see the leaderboard!
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Scroll indicator */}
        {data.length > 10 && (
          <Box 
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40px',
              background: 'linear-gradient(to top, rgba(10, 25, 41, 0.9), transparent)',
              pointerEvents: 'none',
              display: { xs: 'block', md: 'none' }
            }}
          />
        )}
      </Box>
    );
  };
  
  const renderBetMarketplace = () => {
    return (
      <Box sx={{ mt: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={marketplaceTab} 
            onChange={handleMarketplaceTabChange}
            aria-label="bet marketplace tabs"
            sx={{ 
              '& .MuiTabs-indicator': { backgroundColor: '#E5FF03' },
              '& .MuiTab-root': { color: '#FFFFFF' },
              '& .Mui-selected': { color: '#E5FF03' }
            }}
          >
            <Tab label={`Open Bets (${openBets.length})`} {...a11yProps(0)} />
            <Tab label={`Closed Bets (${closedBets.length})`} {...a11yProps(1)} />
          </Tabs>
        </Box>
        
        <TabPanel value={marketplaceTab} index={0}>
          {loadingBets ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: '#1976d2' }} />
            </Box>
          ) : openBets.length > 0 ? (
            <Box sx={{ 
              maxHeight: 400,
              overflowY: 'auto',
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(25, 118, 210, 0.5)',
                borderRadius: '4px',
              }
            }}>
              {openBets.map((bet) => (
                <MarketplaceBetCard 
                  key={bet.id}
                  bet={bet}
                  onAccept={handleAcceptBet}
                  isProcessing={processingBetId === bet.id}
                />
              ))}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No open bets available. Be the first to create a bet!
            </Alert>
          )}
        </TabPanel>
        
        <TabPanel value={marketplaceTab} index={1}>
          {loadingBets ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: '#1976d2' }} />
            </Box>
          ) : closedBets.length > 0 ? (
            <Box sx={{ 
              maxHeight: 400,
              overflowY: 'auto',
              pr: 1,
              '&::-webkit-scrollbar': {
                width: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(25, 118, 210, 0.5)',
                borderRadius: '4px',
              }
            }}>
              {closedBets.map((bet) => (
                <MarketplaceBetCard 
                  key={bet.id}
                  bet={bet}
                  onAccept={handleAcceptBet}
                  showExpanded={true}
                />
              ))}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No closed bets yet. Bets will appear here once they are completed or cancelled.
            </Alert>
          )}
        </TabPanel>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 8, px: { xs: 1, sm: 2, md: 4 } }}>
      <Box sx={{ mb: { xs: 2, md: 4 }, textAlign: 'center' }}>
        <Typography variant={isMobile ? "h4" : "h3"} component="h1" gutterBottom fontWeight="bold" color="#FFFFFF">
          <AccountBalanceWalletIcon fontSize={isMobile ? "medium" : "large"} sx={{ verticalAlign: 'middle', mr: 1 }} />
          $DARE Points Leaderboard
        </Typography>
        <Typography variant="subtitle1" color="#CCCCCC" sx={{ display: { xs: 'none', sm: 'block' } }}>
          See who's at the top of the betting world with the most $DARE points! Build your fortune and climb the ranks.
        </Typography>
        
        {/* Debug buttons - available to all users */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="contained"
            size="small"
            color="primary"
            onClick={() => {
              toast.info('Refreshing data...');
              fetchLeaderboards();
              fetchBets();
            }}
            startIcon={<RefreshIcon />}
            sx={{ fontSize: '0.75rem' }}
          >
            Refresh Data
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress sx={{ color: '#1976d2' }} />
        </Box>
      ) : (
        renderLeaderboardTable(pointsRanking)
      )}
      
      <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      
      <Box sx={{ mb: 2 }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h2" fontWeight="bold" color="#FFFFFF">
          Bet Marketplace
        </Typography>
        <Typography variant="subtitle1" color="#CCCCCC">
          Browse open bets to accept or view closed bet history
        </Typography>
      </Box>
      
      {renderBetMarketplace()}
    </Container>
  );
};

export default Leaderboard; 