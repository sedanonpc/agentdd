import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Activity, User, Database, MessageSquare, Terminal } from 'lucide-react';
import { useWeb3 } from '../../context/Web3Context';

const Navbar: React.FC = () => {
  const { account, connectWallet } = useWeb3();
  const location = useLocation();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navLinks = [
    { path: '/', label: 'TERMINAL', icon: Terminal },
    { path: '/matches', label: 'MATCHES', icon: Activity },
    { path: '/dashboard', label: 'DASHBOARD', icon: Database },
    { path: '/chat', label: 'COMMS', icon: MessageSquare },
    { path: '/profile', label: 'USER', icon: User },
  ];

  // Render wallet connect button
  const renderWalletConnect = () => {
    if (!account) {
  return (
              <button
                onClick={connectWallet}
          className="fixed top-4 right-4 bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-4 py-2 shadow-button hover:shadow-glow transition-all duration-300 flex items-center z-[50]"
              >
          <span className="mr-1">&gt;</span> CONNECT_WALLET
              </button>
      );
    }
    return (
      <div className="fixed top-4 right-4 bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue px-3 py-1 text-console-white font-mono text-sm tracking-wider z-[50]">
        <div className="flex items-center">
          <span className="mr-1 text-console-blue-bright">[</span>
          <span className="animate-terminal-flicker">{formatAddress(account)}</span>
          <span className="ml-1 text-console-blue-bright">]</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Fixed wallet connect button */}
      {renderWalletConnect()}
      
      {/* Bottom Navigation - highest z-index to stay on top */}
      <nav className="fixed bottom-0 left-0 right-0 bg-console-gray-terminal/90 backdrop-blur-xs border-t border-console-blue flex justify-around items-center h-16 z-[100] shadow-terminal">
        {navLinks.map((link) => {
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
      
      {/* Padding at the bottom to account for fixed navbar */}
      <div className="pb-16"></div>
    </>
  );
};

export default Navbar;