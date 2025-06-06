import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, User, Database, MessageSquare, Terminal, LogOut, Trophy, RefreshCw, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDarePoints } from '../../context/DarePointsContext';
import DarePointsDisplay from '../../components/DarePointsDisplay';

const Navbar: React.FC = () => {
  const { user, authMethod, isAuthenticated, logout } = useAuth();
  const { userBalance } = useDarePoints();
  const location = useLocation();
  const navigate = useNavigate();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getSessionID = () => {
    if (!window.sessionStorage.getItem('session_id')) {
      const sessionId = Math.floor(Math.random() * 900000) + 100000;
      window.sessionStorage.setItem('session_id', sessionId.toString());
    }
    return window.sessionStorage.getItem('session_id');
  };

  const navLinks = [
    { path: '/', label: 'TERMINAL', icon: Terminal },
    { path: '/matches', label: 'MATCHES', icon: Activity },
    { path: '/dashboard', label: 'DASHBOARD', icon: Database, requiresAuth: true },
    { path: '/chat', label: 'COMMS', icon: MessageSquare, requiresAuth: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Simulate a refresh action
  const handleRefresh = () => {
    // We could add actual refresh functionality here
    console.log('Refreshing...');
    window.location.reload();
  };

  return (
    <>
      {/* Top fixed header navbar - made more consistent with screenshots */}
      <div className="fixed top-0 left-0 right-0 bg-console-blue/90 h-12 z-[999] flex items-center border-b border-console-blue shadow-terminal">
        <div className="container mx-auto h-full flex items-center justify-between px-4">
          {/* Left: BET_TERMINAL */}
          <div className="flex items-center h-full">
            <div className="text-xs text-console-white font-mono tracking-wide">[ BET_TERMINAL ]</div>
          </div>
          
          {/* Center: Score and Refresh Button - aligned exactly as in screenshot */}
          <div className="flex items-center gap-6">
            {/* Score */}
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-[#E5FF03]" />
              <div className="text-xs text-console-white font-mono">
                SCORE: <span className="text-[#E5FF03]">500</span>
              </div>
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-1 text-xs text-console-white font-mono tracking-wide hover:text-[#E5FF03] transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>[ REFRESH ]</span>
            </button>
          </div>
          
          {/* Right: User and $DARE */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center">
                {/* User Name */}
                <div className="h-full flex items-center">
                  <span className="text-xs text-console-white font-mono">
                    {authMethod === 'wallet' && user?.walletAddress 
                      ? formatAddress(user.walletAddress) 
                      : user?.email?.split('@')[0] || 'admin'}
                  </span>
                </div>
                
                {/* DARE Points - styled to match the screenshot */}
                <div className="ml-4 flex items-center">
                  <span className="text-xs text-console-white-dim font-mono">$DARE: </span>
                  <span className="ml-1 text-xs text-[#E5FF03] font-mono">{userBalance}</span>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="ml-4 px-3 text-console-white hover:text-[#E5FF03] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center text-xs text-console-white font-mono uppercase tracking-wider hover:text-[#E5FF03] transition-colors"
              >
                <span className="mr-1">&gt;</span> LOGIN
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation - fixed at the bottom */}
      <nav className="fixed bottom-0 left-0 right-0 bg-console-blue/90 backdrop-blur-xs border-t border-console-blue flex justify-around items-center h-16 z-[100] shadow-terminal">
        {navLinks
          .filter(link => !link.requiresAuth || (link.requiresAuth && isAuthenticated))
          .map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center justify-center py-2 px-4 ${
                  isActive 
                    ? 'text-console-white animate-pulse-blue' 
                    : 'text-console-white-muted hover:text-console-white-dim transition-colors'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-console-blue-bright' : ''}`} />
                <span className="text-xs mt-1 font-display tracking-wide">{link.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-console-blue-glow shadow-glow"></span>
                )}
              </Link>
            );
          })}
      </nav>
    </>
  );
};

export default Navbar;