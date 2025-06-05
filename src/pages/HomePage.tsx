import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Terminal, Cpu, Code } from 'lucide-react';

const HomePage: React.FC = () => {
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

  return (
    <div className="flex flex-col gap-6 pt-6">
      {/* Original Image Banner Section - brought back */}
      <section className="w-full bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
        <div className="bg-console-blue/90 p-2 text-black flex items-center justify-between">
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ TERMINAL_MODE ]</div>
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ TIME: {getTerminalTime()} ]</div>
        </div>
        
        {/* Full-width image container */}
        <div className="relative w-full border-b-1 border-console-blue bg-console-blue/10 backdrop-blur-xs overflow-hidden">
          <div className="relative max-w-6xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-console-blue/20 via-transparent to-console-blue/20 z-10"></div>
            <img 
              src="https://i.ibb.co/9mbQWVmn/DD-2-hue-fix.png" 
              alt="NBA Betting Agent" 
              className="w-full h-auto object-contain mx-auto relative z-0"
            />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-console-black/70 to-transparent z-20"></div>
          </div>
        </div>
      </section>
      
      {/* Daredevil Banner - Added from photo */}
      <section className="w-full bg-console-blue-bright/90 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden">
        <div className="bg-console-blue/90 p-2 text-black flex items-center justify-between">
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ TERMINAL_MODE ]</div>
          <div className="text-xs text-console-white font-mono tracking-wide opacity-80">[ TIME: {getTerminalTime()} ]</div>
        </div>
        
        {/* Full-width image container */}
        <div className="relative w-full border-b-1 border-console-blue bg-console-blue-bright/80 backdrop-blur-xs overflow-hidden">
          <div className="relative max-w-6xl mx-auto">
            <img 
              src="https://i.ibb.co/Q7mKsRBc/nba-banner.png"
              alt="Agent Daredevil - Wanna Bet?" 
              className="w-full h-auto object-contain mx-auto relative z-0"
            />
          </div>
        </div>
      </section>
      
      {/* Game Banner Section - keep this */}
      <div className="w-full bg-console-black/60 backdrop-blur-xs border-1 border-console-blue shadow-terminal">
        <div className="bg-console-blue/90 p-2 text-black flex items-center justify-between">
          <div className="text-xs text-console-white font-mono tracking-wide">[ FEATURED_MATCH ]</div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-console-white font-mono tracking-wide">[ EASTERN_CONFERENCE ]</div>
            <div className="text-xs text-console-white font-mono tracking-wide opacity-80">SYS_TIME: {getTerminalTime()}</div>
          </div>
        </div>
        
        <div className="relative w-full overflow-hidden">
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-console-blue/40 to-console-black/40 z-10"></div>
          
          {/* Game info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-console-black/90 to-transparent p-6 z-20">
            <div className="flex justify-between items-center">
              <div className="font-mono text-console-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-console-blue-bright">PLAYOFF SERIES</span>
                  <span className="bg-yellow-500/80 text-black text-xs px-2 py-0.5">FEATURED GAME</span>
                </div>
                <div className="text-2xl mb-2">Minnesota Timberwolves vs Oklahoma City Thunder</div>
                <div className="flex items-center gap-3 text-console-white-dim">
                  <span>Game 1</span>
                  <span>•</span>
                  <span>Series tied 0-0</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="bg-console-black/50 px-2 py-1 border-1 border-console-blue">
                    <span className="text-console-white-dim text-xs">MIN</span>
                    <span className="text-console-white ml-1">+2.5</span>
                  </div>
                  <div className="bg-console-black/50 px-2 py-1 border-1 border-console-blue">
                    <span className="text-console-white-dim text-xs">OKC</span>
                    <span className="text-console-white ml-1">-2.5</span>
                  </div>
                  <div className="bg-console-black/50 px-2 py-1 border-1 border-console-blue">
                    <span className="text-console-white-dim text-xs">O/U</span>
                    <span className="text-console-white ml-1">221.5</span>
                  </div>
                </div>
              </div>
              <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-3 text-console-white font-mono">
                <div className="text-xs text-console-white-dim mb-1">TIPOFF</div>
                <div className="text-xl text-yellow-300">8:30 PM EDT</div>
              </div>
            </div>
          </div>
          

        </div>
        
        {/* Bottom bar with quick stats */}
        <div className="bg-console-black/80 backdrop-blur-xs p-3 border-t border-console-blue/50">
          <div className="flex justify-between items-center font-mono text-sm text-console-white-dim">
            <div className="flex items-center gap-4">
              <span className="text-console-blue-bright">MIN 49-33</span>
              <span>|</span>
              <span className="text-console-blue-bright">OKC 57-25</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs">LIVE</span>
              <Link 
                to="/matches" 
                className="bg-red-600/90 text-white px-3 py-1 text-xs font-mono hover:bg-red-500 transition-colors flex items-center gap-1"
              >
                <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
                <span>WATCH LIVE</span>
              </Link>
              <Link 
                to="/matches"
                className="bg-yellow-500/90 text-black px-3 py-1 text-xs font-mono hover:bg-yellow-400 transition-colors"
              >
                BET NOW
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hero Section */}
      <section className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-6 mx-auto max-w-5xl">
        <div className="space-y-6">
          <div className="flex items-center justify-center md:justify-start">
            <Terminal className="text-console-blue-bright h-8 w-8 mr-3" />
            <h1 className="text-3xl md:text-4xl font-display uppercase text-console-white tracking-wider text-center md:text-left">
              P2P <span className="text-console-blue-bright">BETTING</span> WEB3 AGENT
            </h1>
          </div>
          
          <p className="text-console-white-dim font-mono text-lg text-center md:text-left max-w-3xl mx-auto md:mx-0">
            CREATE SECURE P2P BETS ON NBA GAMES WITH BLOCKCHAIN ESCROW AND AI ANALYSIS FOR OPTIMAL DECISION MAKING.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start">
            <Link 
              to="/matches" 
              className="bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-6 py-3 shadow-button hover:shadow-glow transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>ACCESS_MATCHES</span>
                <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/matches"
              className="bg-black/50 backdrop-blur-xs border-1 border-yellow-400 text-yellow-300 font-mono uppercase tracking-wider px-6 py-3 hover:shadow-yellow transition-all flex items-center justify-center gap-2 shadow-yellow-glow animate-pulse-subtle"
            >
              <span>MAKE A BET NOW!</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 max-w-6xl mx-auto">
        <div className="bg-console-gray-terminal/40 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-6 mb-8">
          <h2 className="text-2xl md:text-3xl font-display uppercase text-console-white tracking-wider text-center">SYSTEM_FEATURES</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-6 flex flex-col items-center text-center transform hover:translate-y-[-5px] transition-transform duration-300">
            <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-3 rounded-full mb-4">
              <Code className="h-8 w-8 text-console-blue-bright" />
            </div>
            <h3 className="text-xl font-display uppercase text-console-white mb-2">P2P_BETTING</h3>
            <p className="text-console-white-muted font-mono">
              CREATE SECURE BETS ON NBA GAMES AND MATCH WITH USERS ON THE OPPOSITE SIDE.
            </p>
          </div>
          
          <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-6 flex flex-col items-center text-center transform hover:translate-y-[-5px] transition-transform duration-300">
            <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-3 rounded-full mb-4">
              <Shield className="h-8 w-8 text-console-blue-bright" />
            </div>
            <h3 className="text-xl font-display uppercase text-console-white mb-2">SECURE_ESCROW</h3>
            <p className="text-console-white-muted font-mono">
              FUNDS HELD IN SMART CONTRACT ESCROW UNTIL GAME COMPLETION FOR SECURE PAYOUTS.
            </p>
          </div>
          
          <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-6 flex flex-col items-center text-center transform hover:translate-y-[-5px] transition-transform duration-300">
            <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-3 rounded-full mb-4">
              <Cpu className="h-8 w-8 text-console-blue-bright" />
            </div>
            <h3 className="text-xl font-display uppercase text-console-white mb-2">AI_ANALYTICS</h3>
            <p className="text-console-white-muted font-mono">
              ADVANCED ALGORITHMS PROVIDE REAL-TIME INSIGHTS ON GAMES AND BETTING PATTERNS.
            </p>
          </div>
        </div>
      </section>

      {/* League Stats Section - Replaced CTA Section */}
      <section className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-console-blue/50">
          <h2 className="text-2xl md:text-3xl font-display uppercase text-console-white tracking-wider">LEAGUE_STATS</h2>
          <div className="text-xs text-console-white-dim font-mono bg-console-blue/20 px-3 py-1">
            2024/2025 SEASON
          </div>
        </div>
        
        {/* Conference Tabs */}
        <div className="flex mb-4 border-b border-console-blue/30">
          <button className="px-4 py-2 font-mono text-console-white bg-console-blue/90 border-t border-l border-r border-console-blue">
            EASTERN
          </button>
          <button className="px-4 py-2 font-mono text-console-white-dim hover:text-console-white transition-colors">
            WESTERN
          </button>
        </div>
        
        {/* Standings Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm font-mono">
            <thead className="bg-console-black/70 text-console-white-dim">
              <tr>
                <th className="px-3 py-2 text-left">TEAM</th>
                <th className="px-3 py-2 text-center">W</th>
                <th className="px-3 py-2 text-center">L</th>
                <th className="px-3 py-2 text-center">PCT</th>
                <th className="px-3 py-2 text-center">LAST 10</th>
                <th className="px-3 py-2 text-center">STREAK</th>
              </tr>
            </thead>
            <tbody>
              {/* Atlantic Division */}
              <tr className="bg-console-blue/10 border-b border-t border-console-blue/30">
                <td colSpan={6} className="px-3 py-1 text-console-blue-bright font-bold">ATLANTIC</td>
              </tr>
              <tr className="border-b border-console-blue/20 hover:bg-console-blue/5">
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span>Boston</span>
                    <span className="ml-1 text-xs text-yellow-300">y</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center text-console-white">61</td>
                <td className="px-3 py-2 text-center text-console-white-dim">21</td>
                <td className="px-3 py-2 text-center">.744</td>
                <td className="px-3 py-2 text-center">8-2</td>
                <td className="px-3 py-2 text-center text-green-400">W-2</td>
              </tr>
              <tr className="border-b border-console-blue/20 hover:bg-console-blue/5">
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span>New York</span>
                    <span className="ml-1 text-xs text-console-blue-bright">x</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center text-console-white">51</td>
                <td className="px-3 py-2 text-center text-console-white-dim">31</td>
                <td className="px-3 py-2 text-center">.622</td>
                <td className="px-3 py-2 text-center">6-4</td>
                <td className="px-3 py-2 text-center text-green-400">W-1</td>
              </tr>
              <tr className="border-b border-console-blue/20 hover:bg-console-blue/5">
                <td className="px-3 py-2 text-left">Toronto</td>
                <td className="px-3 py-2 text-center text-console-white">30</td>
                <td className="px-3 py-2 text-center text-console-white-dim">52</td>
                <td className="px-3 py-2 text-center">.366</td>
                <td className="px-3 py-2 text-center">5-5</td>
                <td className="px-3 py-2 text-center text-red-400">L-2</td>
              </tr>
              
              {/* Central Division */}
              <tr className="bg-console-blue/10 border-b border-t border-console-blue/30">
                <td colSpan={6} className="px-3 py-1 text-console-blue-bright font-bold">CENTRAL</td>
              </tr>
              <tr className="border-b border-console-blue/20 hover:bg-console-blue/5">
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span>Cleveland</span>
                    <span className="ml-1 text-xs text-green-400">z</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center text-console-white">64</td>
                <td className="px-3 py-2 text-center text-console-white-dim">18</td>
                <td className="px-3 py-2 text-center">.780</td>
                <td className="px-3 py-2 text-center">6-4</td>
                <td className="px-3 py-2 text-center text-red-400">L-1</td>
              </tr>
              <tr className="border-b border-console-blue/20 hover:bg-console-blue/5">
                <td className="px-3 py-2 text-left">Indiana</td>
                <td className="px-3 py-2 text-center text-console-white">50</td>
                <td className="px-3 py-2 text-center text-console-white-dim">32</td>
                <td className="px-3 py-2 text-center">.610</td>
                <td className="px-3 py-2 text-center">8-2</td>
                <td className="px-3 py-2 text-center text-green-400">W-1</td>
              </tr>
              <tr className="border-b border-console-blue/20 hover:bg-console-blue/5">
                <td className="px-3 py-2 text-left">Milwaukee</td>
                <td className="px-3 py-2 text-center text-console-white">48</td>
                <td className="px-3 py-2 text-center text-console-white-dim">34</td>
                <td className="px-3 py-2 text-center">.585</td>
                <td className="px-3 py-2 text-center">8-2</td>
                <td className="px-3 py-2 text-center text-green-400">W-8</td>
              </tr>
              
              {/* Southeast Division */}
              <tr className="bg-console-blue/10 border-b border-t border-console-blue/30">
                <td colSpan={6} className="px-3 py-1 text-console-blue-bright font-bold">SOUTHEAST</td>
              </tr>
              <tr className="border-b border-console-blue/20 hover:bg-console-blue/5">
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <span>Orlando</span>
                    <span className="ml-1 text-xs text-yellow-300">y</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center text-console-white">41</td>
                <td className="px-3 py-2 text-center text-console-white-dim">41</td>
                <td className="px-3 py-2 text-center">.500</td>
                <td className="px-3 py-2 text-center">7-3</td>
                <td className="px-3 py-2 text-center text-red-400">L-1</td>
              </tr>
              <tr className="border-b border-console-blue/20 hover:bg-console-blue/5">
                <td className="px-3 py-2 text-left">Atlanta</td>
                <td className="px-3 py-2 text-center text-console-white">40</td>
                <td className="px-3 py-2 text-center text-console-white-dim">42</td>
                <td className="px-3 py-2 text-center">.488</td>
                <td className="px-3 py-2 text-center">5-5</td>
                <td className="px-3 py-2 text-center text-green-400">W-3</td>
              </tr>
              <tr className="border-b border-console-blue/20 hover:bg-console-blue/5">
                <td className="px-3 py-2 text-left">Miami</td>
                <td className="px-3 py-2 text-center text-console-white">37</td>
                <td className="px-3 py-2 text-center text-console-white-dim">45</td>
                <td className="px-3 py-2 text-center">.451</td>
                <td className="px-3 py-2 text-center">6-4</td>
                <td className="px-3 py-2 text-center text-red-400">L-1</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-between items-center mt-6 pt-2 border-t border-console-blue/50">
          <div className="text-xs text-console-white-dim flex flex-col gap-1">
            <div>
              <span className="text-console-blue-bright">*</span> Stats provided by Yahoo Sports
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-green-400"></span> Win</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-red-400"></span> Loss</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-1">
              <span className="flex items-center gap-1"><span className="text-console-blue-bright text-xs">x</span> Clinched Playoff</span>
              <span className="flex items-center gap-1"><span className="text-yellow-300 text-xs">y</span> Clinched Division</span>
              <span className="flex items-center gap-1"><span className="text-green-400 text-xs">z</span> Clinched Home Court</span>
            </div>
          </div>
          <div className="flex gap-4">
          <Link
            to="/matches"
              className="bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-4 py-2 shadow-button hover:shadow-glow transition-all duration-300 text-sm flex items-center justify-center gap-2"
          >
              <span>VIEW MATCHES</span>
          </Link>
            <Link
              to="/matches"
              className="bg-black/50 backdrop-blur-xs border-1 border-yellow-400 text-yellow-300 font-mono uppercase tracking-wider px-4 py-2 hover:shadow-yellow transition-all text-sm flex items-center justify-center gap-2 shadow-yellow-glow animate-pulse-subtle"
            >
              <span>PLACE BETS</span>
            </Link>
          </div>
        </div>
        
        {/* Live Game Updates */}
        <div className="mt-4 bg-console-black/40 border-1 border-console-blue p-3 text-xs font-mono">
          <div className="flex justify-between items-center border-b border-console-blue/30 pb-1 mb-2">
            <span className="text-console-blue-bright">LIVE GAMES</span>
            <span className="animate-pulse text-red-400">● LIVE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-console-white">MIN @ OKC</span>
            <span className="text-yellow-300">MIN 64 - 59 OKC</span>
            <span className="text-console-white-dim">Q3 5:22</span>
          </div>
        </div>
      </section>
      
      {/* Session ID indicator at bottom */}
      <div className="fixed bottom-20 left-4 bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue px-3 py-1 text-console-white-dim font-mono text-xs z-[40]">
        SESSION: {getSessionID()}
      </div>
    </div>
  );
};

export default HomePage;