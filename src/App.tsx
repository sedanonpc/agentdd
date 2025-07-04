import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import MatchesPage from './pages/MatchesPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import AcceptBetPage from './pages/AcceptBetPage';
import LoginPage from './pages/LoginPage';
import LeaderboardPage from './pages/Leaderboard';
import { Web3Provider } from './context/Web3Context';
import { AuthProvider } from './context/AuthContext';
import { BettingProvider } from './context/BettingContext';
import { ChatProvider } from './context/ChatContext';
import { PointsProvider } from './context/PointsContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import { isSupabaseConfigured } from './services/supabaseService';
import { ConsoleThemeProvider } from './theme/muiTheme';

// Load custom fonts
const loadFonts = () => {
  const VT323 = document.createElement('link');
  VT323.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
  VT323.rel = 'stylesheet';
  
  const Orbitron = document.createElement('link');
  Orbitron.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap';
  Orbitron.rel = 'stylesheet';
  
  document.head.appendChild(VT323);
  document.head.appendChild(Orbitron);
};

function App() {
  // Force dark mode and load fonts
  useEffect(() => {
    document.documentElement.classList.add('dark');
    loadFonts();
    
    // Add the console effect to body
    document.body.classList.add('bg-console-black');
    
    return () => {
      document.body.classList.remove('bg-console-black');
    };
  }, []);

  // Check Supabase configuration
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      toast.info('Running in local mode - data will not be saved to the cloud');
    }
  }, []);

  return (
    <Web3Provider>
      <AuthProvider>
        <PointsProvider>
          <BettingProvider>
            <ChatProvider>
              <ConsoleThemeProvider>
                <div className="min-h-screen font-mono text-console-white bg-console-black bg-terminal-grid bg-grid relative">
                  {/* Scanline effect - positioned below content but above background */}
                  <div className="pointer-events-none fixed inset-0 h-full w-full animate-terminal-scan opacity-10 z-[5] bg-gradient-to-b from-transparent via-console-blue-glow to-transparent"></div>
                  
                  {/* Terminal glow effect - always at the bottom layer */}
                  <div className="pointer-events-none fixed inset-0 h-full w-full opacity-20 bg-console-blue-dark z-[1]"></div>
                  
                  {/* Content container - ensures content is above effects but below navbar */}
                  <div className="relative z-[10]">
                    <main className="container mx-auto px-2 sm:px-4 pt-16 pb-20">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/matches" element={
                        <ProtectedRoute>
                          <MatchesPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/accept-bet" element={<AcceptBetPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route 
                        path="/dashboard" 
                        element={
                          <ProtectedRoute>
                            <DashboardPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/chat" 
                        element={
                          <ProtectedRoute>
                            <ChatPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/chat/:betId" 
                        element={
                          <ProtectedRoute>
                            <ChatPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/leaderboard" 
                        element={<LeaderboardPage />} 
                      />
                    </Routes>
                  </main>
                    
                    {/* Navbar is positioned with highest z-index to be on top */}
                    <Navbar />
                    
                    <ToastContainer 
                      position="bottom-right" 
                      theme="dark"
                      toastClassName="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue text-console-white shadow-terminal"
                      progressClassName="bg-console-blue-bright"
                      limit={3}
                      newestOnTop={true}
                      closeOnClick
                      autoClose={3000}
                      pauseOnHover
                    />
                  </div>
                </div>
              </ConsoleThemeProvider>
            </ChatProvider>
          </BettingProvider>
        </PointsProvider>
      </AuthProvider>
    </Web3Provider>
  );
}

export default App;