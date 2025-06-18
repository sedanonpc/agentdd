import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { Lock, Mail, Wallet, AlertTriangle, Info, Smartphone } from 'lucide-react';
import { supabase } from '../services/supabaseService';
import { toast } from 'react-toastify';

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  
  const { loginWithEmail, registerWithEmail, loginWithWallet, isSupabaseAvailable, isAuthenticated } = useAuth();
  const { account, isConnected } = useWeb3();
  const navigate = useNavigate();

  // Check if user is on mobile device
  useEffect(() => {
    const checkMobileDevice = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    
    checkMobileDevice();
  }, []);

  // Auto-redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/matches');
    }
  }, [isAuthenticated, navigate]);

  // Continuously check for wallet connection
  useEffect(() => {
    if (isMobile && localStorage.getItem('pendingMobileConnection') === 'true') {
      setCheckingConnection(true);
      
      // Poll for authentication status
      const checkConnectionInterval = setInterval(() => {
        // If connected and authenticated, navigate to matches page
        if (isConnected && account) {
          console.log("MetaMask connection detected, redirecting...");
          navigate('/matches');
          clearInterval(checkConnectionInterval);
        }
      }, 1000);
      
      return () => {
        clearInterval(checkConnectionInterval);
      };
    }
  }, [isMobile, isConnected, account, navigate]);

  // Check if connected when component mounts
  useEffect(() => {
    if (isConnected && account) {
      console.log("Already connected to wallet, redirecting...");
      navigate('/matches');
    }
  }, [isConnected, account, navigate]);

  // Add debugging effect
  useEffect(() => {
    const getDebugInfo = async () => {
      try {
        console.log("Debug: Supabase URL =", import.meta.env.VITE_SUPABASE_URL);
        console.log("Debug: Supabase Key Present =", !!import.meta.env.VITE_SUPABASE_ANON_KEY);
        
        // Try to make a simple query to check Supabase connection
        let connectionError = null;
        try {
          // This will fail if the table doesn't exist, but that's expected
          const { error } = await supabase.from('user_profiles').select('count').limit(1);
          console.log("Debug: Supabase query result:", error ? "Error" : "Success");
          if (error) {
            console.error("Debug: Supabase query error:", error);
            connectionError = String(error);
          }
        } catch (e: any) {
          console.error("Debug: Supabase connection exception:", e);
          connectionError = String(e);
        }

        // Try a basic auth call
        try {
          const { error: authError } = await supabase.auth.getSession();
          console.log("Debug: Supabase auth check:", authError ? "Error" : "Success");
          if (authError) {
            console.error("Debug: Supabase auth error:", authError);
          }
        } catch (e: any) {
          console.error("Debug: Supabase auth exception:", e);
        }

        setDebugInfo({
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Not set',
          hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          error: connectionError,
          isSupabaseAvailable
        });
      } catch (err: any) {
        console.error("Debug: General error:", err);
        setDebugInfo({
          error: String(err),
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Not set',
          hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          isSupabaseAvailable
        });
      }
    };

    getDebugInfo();
  }, [isSupabaseAvailable]);
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      console.log('Attempting to login with email:', email);
      await loginWithEmail(email, password);
      
      // Show success toast
      toast.success('Login successful!');
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error) {
        // Handle network errors specifically
        if (error.message.includes('fetch') || error.message.includes('network')) {
          setError('Network error. Please check your internet connection and try again.');
          toast.error('Network error. Please check your connection.');
        } else {
          setError(error.message || 'Invalid email or password');
          toast.error(error.message || 'Login failed');
        }
      } else {
        setError('Invalid email or password');
        toast.error('Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Attempting to register with email:', email);
      
      // Check if Supabase is available first
      if (!isSupabaseAvailable) {
        console.warn('Supabase is not available, registration may fail');
        toast.warning('Database connection issue. Registration may fail.');
      }
      
      await registerWithEmail(email, password);
      
      // Show success toast
      toast.success('Registration successful!');
      
      // If we get here, registration or automatic login was successful
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof Error) {
        // Handle network errors specifically
        if (error.message.includes('fetch') || error.message.includes('network')) {
          setError('Network error. Please check your internet connection and try again.');
          toast.error('Network error. Please check your connection.');
        }
        // Provide a more descriptive error message
        else if (error.message.includes('User already registered')) {
          setError('Account already exists. Try logging in instead.');
          toast.info('Account already exists. Try logging in instead.');
          
          // Automatically switch to login tab
          setActiveTab('login');
        } else {
          setError(error.message || 'Registration failed');
          toast.error(error.message || 'Registration failed');
        }
      } else {
        setError('Registration failed');
        toast.error('Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleWalletLogin = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      await loginWithWallet();
      
      if (isMobile) {
        // For mobile, we'll let the polling mechanism handle redirection
        setCheckingConnection(true);
      } else {
        // For desktop, navigate immediately on success
        navigate('/matches');
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || 'Wallet connection failed');
      } else {
        setError('Wallet connection failed');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue p-6">
        <h1 className="text-2xl font-display text-console-white mb-6 text-center uppercase">ACCESS_TERMINAL</h1>
        
        {/* Debug Button */}
        <div className="absolute top-2 right-2">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-console-blue-dim hover:text-console-blue-bright"
          >
            <Info size={20} />
          </button>
        </div>
        
        {/* Debug Info */}
        {showDebug && debugInfo && (
          <div className="mb-6 bg-gray-900/80 border border-console-blue p-3 text-xs font-mono">
            <h3 className="text-console-blue-bright mb-2">DEBUG INFO</h3>
            <p>Supabase URL: {debugInfo.supabaseUrl}</p>
            <p>Anon Key Present: {debugInfo.hasAnonKey ? 'Yes' : 'No'}</p>
            <p>isSupabaseAvailable: {debugInfo.isSupabaseAvailable ? 'Yes' : 'No'}</p>
            <div className="mt-2">
              <p className="text-console-blue-bright">Instructions:</p>
              <ol className="list-decimal pl-4 mt-1 text-console-white-dim">
                <li>Create a <code>.env</code> file in project root</li>
                <li>Add proper Supabase URL and key (see env-instructions.txt)</li>
                <li>Restart the dev server: <code>npm run dev</code></li>
                <li>Clear browser cache and refresh</li>
              </ol>
            </div>
            {debugInfo.error && (
              <div className="mt-2 text-red-400">
                <p>Error: {debugInfo.error}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Supabase Status */}
        {!isSupabaseAvailable && (
          <div className="mb-6 bg-red-900/30 border border-red-500 p-3 flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-console-white-dim">
              <p className="font-bold text-red-400 mb-1">DATABASE CONNECTION ERROR</p>
              <p>Supabase credentials not configured. User data will not be persistent.</p>
              <p className="mt-1">Please add Supabase URL and key to .env file.</p>
            </div>
          </div>
        )}
        
        {/* Mobile wallet info message */}
        {isMobile && (
          <div className="mb-6 bg-blue-900/30 border border-console-blue p-3 flex items-start">
            <Smartphone className="h-5 w-5 text-console-blue mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-console-white-dim">
              <p className="font-bold text-console-blue-bright mb-1">MOBILE WALLET CONNECTION</p>
              <p>You'll be redirected to the MetaMask app. After connecting, return here to complete login.</p>
              {checkingConnection && (
                <p className="text-green-400 mt-2 animate-pulse">Checking for wallet connection...</p>
              )}
            </div>
          </div>
        )}
        
        {/* Auth Method Selection */}
        <div className="flex flex-col space-y-4 mb-8">
          <button
            onClick={handleWalletLogin}
            disabled={isLoading || checkingConnection}
            className="bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-4 py-3 shadow-button hover:shadow-glow transition-all duration-300 flex items-center justify-center"
          >
            <Wallet className="mr-2 h-5 w-5" />
            <span className="mr-1">&gt;</span> 
            {checkingConnection ? "CONNECTING..." : (isMobile ? "OPEN_METAMASK" : "CONNECT_WALLET")}
          </button>
          
          <div className="flex items-center my-4">
            <div className="flex-grow h-px bg-console-blue-dim"></div>
            <span className="mx-4 text-console-white-dim text-sm">OR</span>
            <div className="flex-grow h-px bg-console-blue-dim"></div>
          </div>
          
          {/* Added feature access notification */}
          <div className="mb-4 bg-console-blue/20 border border-console-blue p-3 text-center">
            <p className="text-console-white-dim text-sm">
              <span className="text-console-blue-bright font-bold">NOTE:</span> Both wallet and email login provide full access to all features, including betting.
            </p>
          </div>
        </div>
        
        {/* Email Auth Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-console-blue">
            <button
              onClick={() => setActiveTab('login')}
              className={`py-2 px-4 font-mono text-sm uppercase ${
                activeTab === 'login'
                  ? 'text-console-blue-bright border-b-2 border-console-blue-bright -mb-px'
                  : 'text-console-white-dim'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`py-2 px-4 font-mono text-sm uppercase ${
                activeTab === 'register'
                  ? 'text-console-blue-bright border-b-2 border-console-blue-bright -mb-px'
                  : 'text-console-white-dim'
              }`}
            >
              Register
            </button>
          </div>
        </div>
        
        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-console-white-dim text-sm font-mono">EMAIL_ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-console-blue" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-console-black border border-console-blue pl-10 pr-3 py-2 text-console-white font-mono focus:outline-none focus:border-console-blue-bright"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-console-white-dim text-sm font-mono">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-console-blue" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-console-black border border-console-blue pl-10 pr-3 py-2 text-console-white font-mono focus:outline-none focus:border-console-blue-bright"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-900/30 border border-red-500 p-3 text-red-400 text-sm font-mono mt-2 flex items-start">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">ERROR: </span>
                  {error}
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-4 py-3 shadow-button hover:shadow-glow transition-all duration-300 mt-4"
            >
              {isLoading ? 'PROCESSING...' : '> LOGIN_WITH_EMAIL'}
            </button>
          </form>
        )}
        
        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleEmailRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-console-white-dim text-sm font-mono">EMAIL_ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-console-blue" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-console-black border border-console-blue pl-10 pr-3 py-2 text-console-white font-mono focus:outline-none focus:border-console-blue-bright"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-console-white-dim text-sm font-mono">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-console-blue" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-console-black border border-console-blue pl-10 pr-3 py-2 text-console-white font-mono focus:outline-none focus:border-console-blue-bright"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-console-white-dim text-sm font-mono">CONFIRM_PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-console-blue" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-console-black border border-console-blue pl-10 pr-3 py-2 text-console-white font-mono focus:outline-none focus:border-console-blue-bright"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-900/30 border border-red-500 p-3 text-red-400 text-sm font-mono mt-2 flex items-start">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">ERROR: </span>
                  {error}
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-4 py-3 shadow-button hover:shadow-glow transition-all duration-300 mt-4"
            >
              {isLoading ? 'PROCESSING...' : '> REGISTER_WITH_EMAIL'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage; 