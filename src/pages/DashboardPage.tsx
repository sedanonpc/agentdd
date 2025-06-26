import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Users, Database, Activity, RefreshCw, Trophy, Wallet, Mail, Shield, MessageSquare } from 'lucide-react';
import { useBetting } from '../context/BettingContext';
import { useWeb3 } from '../context/Web3Context';
import { usePoints } from '../context/PointsContext';
import { Bet } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import BetCard from '../components/bet/BetCard';
import { toast } from 'react-toastify';
import DareDevilChatModal from '../components/chat/DareDevilChatModal';

const DashboardPage: React.FC = () => {
  const { userBets, loadingBets, loadingMatches, settleBet, refreshMatches, refreshBets, debugCache } = useBetting();
  const { account } = useWeb3();
  const { userBalance, transactions } = usePoints();
  const [isSettling, setIsSettling] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [forceRender, setForceRender] = useState<boolean>(false);
  const [showRewardsPanel, setShowRewardsPanel] = useState<boolean>(false);
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [showDareDevilChat, setShowDareDevilChat] = useState<boolean>(false);
  const hasFetchedRef = useRef<boolean>(false);
  
  // Encrypt IP address for display (not actual encryption)
  const getEncryptedIP = () => {
    return "2**.***.***.**8"; // Placeholder for UI purposes
  };

  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Calculate transaction totals
  const calculateTransactionTotals = () => {
    let totalEarned = 0;
    let totalSpent = 0;
    
    transactions.forEach(tx => {
      if (tx.amount > 0) {
        totalEarned += tx.amount;
      } else {
        totalSpent += Math.abs(tx.amount);
      }
    });
    
    return { totalEarned, totalSpent };
  };
  
  const { totalEarned, totalSpent } = calculateTransactionTotals();
  
  // Handle email verification
  const handleVerifyEmail = () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setIsVerifying(true);
    // Simulate verification process
    setTimeout(() => {
      setIsVerifying(false);
      toast.success('Verification email sent. Please check your inbox.');
    }, 1500);
  };
  
  // Refresh data only once when component mounts
  useEffect(() => {
    // Only load data if we haven't already and component is mounted
    if (!hasFetchedRef.current) {
      const loadDashboardData = async () => {
        setIsRefreshing(true);
    try {
          // First refresh matches, then bets to ensure we have match data available
          await refreshMatches();
          await refreshBets();
          
          // Debug the match cache after loading
          debugCache();
          
          // Mark as fetched
          hasFetchedRef.current = true;
        } catch (error) {
          console.error('Error loading dashboard data:', error);
    } finally {
          // Ensure we set refreshing to false after a minimum delay to avoid flickering
          setTimeout(() => {
            setIsRefreshing(false);
          }, 800);
        }
      };
      
      loadDashboardData();
      
      // Set a timeout to force render content even if loading doesn't complete properly
      setTimeout(() => {
        setForceRender(true);
      }, 3000); // Force render after 3 seconds no matter what
    }
    
    // Cleanup function
    return () => {
      // Reset the ref when component unmounts
      hasFetchedRef.current = false;
      setForceRender(false);
    };
  }, []); // Empty dependency array to ensure it only runs once when mounted
  
  const handleSettleBet = async (betId: string) => {
    setIsSettling(betId);
    try {
      await settleBet(betId);
    } finally {
      setIsSettling(null);
    }
  };
  
  const getTerminalTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  const getSessionID = () => {
    // Generate a random session ID that remains consistent during the session
    if (!window.sessionStorage.getItem('session_id')) {
      const sessionId = Math.floor(Math.random() * 900000) + 100000;
      window.sessionStorage.setItem('session_id', sessionId.toString());
    }
    return window.sessionStorage.getItem('session_id');
  };
  
  // Show loading state only on initial load to prevent flickering on data refresh
  // Add forceRender check to ensure we don't get stuck in loading state
  const isLoading = !forceRender && (loadingBets || loadingMatches || isRefreshing);
  
  // Add a manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First refresh matches, then bets to ensure we have match data available
      await refreshMatches();
      await refreshBets();
      
      // Debug the match cache after refresh
      debugCache();
      
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      // Ensure we set refreshing to false after a minimum delay to avoid flickering
      setTimeout(() => {
        setIsRefreshing(false);
      }, 800);
    }
  };
  
  // Ensure we have arrays even if they're null/undefined to prevent rendering errors
  const userBetsToDisplay = userBets || [];
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header with title and banner (keep this to maintain consistent UI layout) */}
        <div className="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
          <div className="bg-console-blue/90 p-2 flex items-center justify-between">
            <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ BET_TERMINAL ]</div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 text-xs text-console-white font-mono tracking-wide opacity-80 hover:opacity-100 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>[ REFRESH ]</span>
              </button>
              <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ SESSION: {getSessionID()} ]</div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-center mb-3">
              <Database className="text-console-blue-bright h-8 w-8 mr-2" />
              <h1 className="text-2xl md:text-3xl font-display uppercase text-console-white tracking-widest">
                BETTING DASHBOARD
              </h1>
            </div>
            <div className="font-mono text-console-white-muted text-sm flex flex-wrap justify-center items-center gap-2">
              <span>USER: AUTHORIZED</span>
              <span className="h-1.5 w-1.5 bg-console-blue-bright rounded-full animate-pulse"></span>
              <span>SYSTEM: ONLINE</span>
              <span className="h-1.5 w-1.5 bg-console-blue-bright rounded-full animate-pulse"></span>
              <span>TIME: {getTerminalTime()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center items-center py-12 bg-console-gray-terminal/60 backdrop-blur-xs border-1 border-console-blue shadow-terminal">
          <div className="text-console-white font-mono mr-3">INITIALIZING_DATA</div>
          <LoadingSpinner size={6} color="text-console-blue-bright" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with title and banner */}
      <div className="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
        <div className="bg-console-blue/90 p-2 flex items-center justify-between">
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ BET_TERMINAL ]</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-console-black/30 px-2 py-1 border-1 border-console-blue-dim text-xs text-console-white font-mono">
                <span>$DARE: </span>
                <span className="text-[#E5FF03]">{userBalance}</span>
              </div>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 text-xs text-console-white font-mono tracking-wide opacity-80 hover:opacity-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>[ REFRESH ]</span>
            </button>
            <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ SESSION: {getSessionID()} ]</div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-center mb-3">
            <Database className="text-console-blue-bright h-8 w-8 mr-2" />
            <h1 className="text-2xl md:text-3xl font-display uppercase text-console-white tracking-widest">
              BETTING DASHBOARD
            </h1>
          </div>
          <div className="font-mono text-console-white-muted text-sm flex flex-wrap justify-center items-center gap-2">
            <span>USER: AUTHORIZED</span>
            <span className="h-1.5 w-1.5 bg-console-blue-bright rounded-full animate-pulse"></span>
            <span>SYSTEM: ONLINE</span>
            <span className="h-1.5 w-1.5 bg-console-blue-bright rounded-full animate-pulse"></span>
            <span>TIME: {getTerminalTime()}</span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link 
          to="/matches" 
          className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 hover:shadow-glow transition-all flex flex-col items-center justify-center gap-2"
        >
          <Activity className="h-6 w-6 text-console-blue-bright" />
          <span className="text-console-white font-mono">BROWSE MATCHES</span>
        </Link>
        
        <Link 
          to="/chat" 
          className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-[#00A4FF] shadow-terminal p-4 hover:shadow-glow transition-all flex flex-col items-center justify-center gap-2"
        >
          <Users className="h-6 w-6 text-[#00A4FF]" />
          <span className="text-console-white font-mono">GLOBAL CHAT</span>
        </Link>
        
        <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-[#00A4FF] shadow-glow p-4 flex flex-col items-center justify-center gap-2">
          <div className="relative">
            <Database className="h-6 w-6 text-[#00A4FF]" />
            {userBetsToDisplay.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-[#00A4FF] text-white h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold">
                {userBetsToDisplay.length}
              </div>
            )}
          </div>
          <span className="text-console-white font-mono">MY BETS</span>
        </div>
        
        {/* DareDevil Chat Button */}
        <button
          onClick={() => setShowDareDevilChat(true)}
          className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-red-600 shadow-glow-red p-4 hover:shadow-glow-red transition-all flex flex-col items-center justify-center gap-2"
        >
          <div className="relative">
            <MessageSquare className="h-6 w-6 text-red-500" />
            <div className="absolute -top-2 -right-2 bg-red-600 text-white h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold">
              AI
            </div>
          </div>
          <span className="text-console-white font-mono">CONSULT DAREDEVIL</span>
        </button>
        
        {/* Single consolidated DARE Points button */}
        <button 
          onClick={() => setShowRewardsPanel(!showRewardsPanel)}
          className={`bg-console-gray-terminal/70 backdrop-blur-xs border-1 col-span-2 md:col-span-4 border-[#E5FF03] ${showRewardsPanel ? 'shadow-yellow-glow' : 'shadow-terminal'} p-4 hover:shadow-yellow-glow transition-all flex flex-col items-center justify-center gap-2`}
        >
          <div className="relative">
            <Trophy className="h-6 w-6 text-[#E5FF03]" />
            <div className="absolute -top-2 -right-2 bg-[#E5FF03] text-black h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold">
              $
            </div>
          </div>
          <span className="text-console-white font-mono">$DARE POINTS DASHBOARD</span>
        </button>
      </div>
      
      {/* $DARE Points Dashboard Panel - shown only when activated */}
      {showRewardsPanel && (
        <div className="bg-console-gray-terminal/60 backdrop-blur-xs border-1 border-[#E5FF03] shadow-yellow-glow mb-6">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Trophy className="h-5 w-5 text-[#E5FF03] mr-2" />
              <h2 className="text-console-white font-mono text-lg">$DARE POINTS DASHBOARD</h2>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="px-3 py-1 bg-black/50 border-1 border-[#E5FF03] text-[#E5FF03]">
                BALANCE: {userBalance} $DARE
              </div>
            </div>
          </div>
          
          <div className="h-0.5 w-full bg-[#E5FF03]/30"></div>
          
          <div className="p-6 grid md:grid-cols-2 gap-6">
            {/* User Info Section */}
            <div className="bg-console-black/50 backdrop-blur-xs p-4 border-1 border-console-blue">
              <h3 className="text-console-white font-mono mb-4 border-b border-console-blue pb-2">USER INFORMATION</h3>
              
              <div className="space-y-4">
                {/* Wallet Address */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-console-white-dim font-mono text-sm">
                    <Wallet className="h-4 w-4 text-console-blue-bright" />
                    <span>WALLET ADDRESS</span>
                  </div>
                  <div className="bg-console-black/70 p-2 border-1 border-console-blue text-console-white font-mono text-sm">
                    {account ? truncateAddress(account) : 'WALLET NOT CONNECTED'}
                  </div>
                </div>
                
                {/* Encrypted IP */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-console-white-dim font-mono text-sm">
                    <Shield className="h-4 w-4 text-console-blue-bright" />
                    <span>ENCRYPTED IP</span>
                  </div>
                  <div className="bg-console-black/70 p-2 border-1 border-console-blue text-console-white font-mono text-sm">
                    {getEncryptedIP()}
                  </div>
                </div>
                
                {/* Email Verification */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-console-white-dim font-mono text-sm">
                    <Mail className="h-4 w-4 text-console-blue-bright" />
                    <span>EMAIL ADDRESS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="ENTER_YOUR_EMAIL"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="bg-console-black/70 p-2 border-1 border-console-blue text-console-white font-mono text-sm flex-grow focus:outline-none focus:border-[#E5FF03]"
                    />
                    <button
                      onClick={handleVerifyEmail}
                      disabled={isVerifying || !emailAddress}
                      className="bg-[#E5FF03] text-black px-3 py-2 font-mono text-sm disabled:opacity-50"
                    >
                      {isVerifying ? 'VERIFYING...' : 'VERIFY'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Points Info & Rewards */}
            <div className="bg-console-black/50 backdrop-blur-xs p-4 border-1 border-console-blue">
              <h3 className="text-console-white font-mono mb-4 border-b border-console-blue pb-2">REWARDS SYSTEM</h3>
              
              <div className="space-y-4">
                <div className="text-center p-4 bg-console-black/30 border-1 border-[#E5FF03]">
                  <div className="text-3xl font-mono text-[#E5FF03] mb-2">{userBalance} $DARE</div>
                  <div className="text-console-white-dim text-sm">CURRENT BALANCE</div>
                </div>
                
                <div className="font-mono text-console-white-dim text-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span>TOTAL EARNED:</span>
                    <span className="text-[#E5FF03]">{totalEarned} $DARE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>TOTAL SPENT:</span>
                    <span className="text-[#E5FF03]">{totalSpent} $DARE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>NEXT REWARD IN:</span>
                    <span className="text-console-white">5 BETS</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-console-blue/30">
                  <h4 className="text-console-white font-mono mb-2">HOW TO EARN $DARE POINTS</h4>
                  <ul className="list-disc list-inside text-console-white-dim font-mono text-sm space-y-1">
                    <li>Place a bet: +10 $DARE</li>
                    <li>Win a bet: +50 $DARE</li>
                    <li>Refer a friend: +100 $DARE</li>
                    <li>Daily login: +5 $DARE</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bets Content */}
      <div className="bg-console-gray-terminal/60 backdrop-blur-xs border-1 border-console-blue shadow-terminal">
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-console-white font-mono text-lg">YOUR ACTIVE BETS</h2>
          
          <div className="flex items-center gap-2 text-xs text-console-white-dim font-mono">
            <span className="flex items-center px-2 py-0.5 bg-blue-900/30 border-1 border-[#00A4FF]">
              <span className="text-[#00A4FF] mr-1">{userBetsToDisplay.length}</span> TOTAL BETS
            </span>
          </div>
        </div>
        
        <div className="h-0.5 w-full bg-console-blue/30"></div>
        
        {userBetsToDisplay.length === 0 ? (
          <div className="bg-console-black/50 backdrop-blur-xs p-8 text-center">
            <Terminal className="h-10 w-10 text-console-blue-bright mx-auto mb-4" />
            <p className="text-console-white-muted font-mono mb-4">NO_ACTIVE_BETS_FOUND</p>
            <Link
              to="/matches" 
              className="inline-block bg-[#E5FF03]/90 backdrop-blur-xs border-1 border-[#E5FF03] px-4 py-2 text-black font-mono hover:shadow-button transition-all"
            >
              PLACE_NEW_BET
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
            {userBetsToDisplay.map((bet) => (
              <BetCard 
                key={bet.id} 
                bet={bet} 
                onSettle={handleSettleBet} 
                isSettling={isSettling === bet.id} 
              />
            ))}
          </div>
        )}
      </div>
      
      {/* DareDevil Chat Modal */}
      <DareDevilChatModal 
        isOpen={showDareDevilChat} 
        onClose={() => setShowDareDevilChat(false)} 
      />
    </div>
  );
};

export default DashboardPage;