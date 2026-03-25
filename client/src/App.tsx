import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import { useState } from 'react';
import { isConnected, requestAccess, getAddress } from '@stellar/freighter-api';
import Dashboard from './components/Dashboard';
import AIAdvisor from './components/AIAdvisor';
import Vault from './components/Vault';
import PortfolioPage from './components/portfolio/PortfolioPage';
import { Wallet, LayoutDashboard, BrainCircuit, Landmark, PieChart, Loader2, LogOut } from 'lucide-react';
import './index.css';

const truncateKey = (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`;

// Layout Component
const RootLayout = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Check if Freighter extension is installed
      const connectionResult = await isConnected();

      if (connectionResult.error || !connectionResult.isConnected) {
        alert('Freighter wallet extension not found. Please install Freighter to connect.');
        setConnecting(false);
        return;
      }

      // Request access — prompts user in the Freighter popup
      const accessResult = await requestAccess();

      if (accessResult.error) {
        console.error('Access denied:', accessResult.error);
        setConnecting(false);
        return;
      }

      // Retrieve the active public key
      const addressResult = await getAddress();

      if (addressResult.error) {
        console.error('Failed to get address:', addressResult.error);
        setConnecting(false);
        return;
      }

      setWalletAddress(addressResult.address);
    } catch (e) {
      console.error('Wallet connection failed:', e);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="glass-panel mx-4 mt-6 px-6 py-4 flex justify-between items-center mb-8 sticky top-4 z-50 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="font-bold text-xl tracking-tighter">SY</span>
          </div>
          <h1 className="text-xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Stellar Yield
          </h1>
        </div>
        
        <div className="flex gap-8 items-center text-sm font-medium text-gray-300">
          <Link to="/" className="hover:text-white transition-colors flex items-center gap-2">
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link to="/ai-advisor" className="hover:text-white transition-colors flex items-center gap-2">
            <BrainCircuit size={18} /> AI Advisor
          </Link>
          <Link to="/vault" className="hover:text-white transition-colors flex items-center gap-2">
            <Landmark size={18} /> Vaults
          </Link>
          {walletAddress && (
            <Link to="/portfolio" className="hover:text-white transition-colors flex items-center gap-2">
              <PieChart size={18} /> Portfolio
            </Link>
          )}
        </div>

        <div>
          {walletAddress ? (
            <button
              onClick={handleDisconnect}
              className="glass-card px-4 py-2 flex items-center gap-2 border-[#6C5DD3]/50 cursor-pointer hover:border-red-500/50 transition-colors group"
              title="Click to disconnect"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse group-hover:bg-red-500"></div>
              <span>{truncateKey(walletAddress)}</span>
              <LogOut size={14} className="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity" />
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn-primary flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Wallet size={18} />
              )}
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Outlet context={{ walletAddress }} />
      </main>
    </div>
  );
};

// Router Configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <Dashboard />,
      },
      {
        path: '/ai-advisor',
        element: <AIAdvisor />,
      },
      {
        path: '/vault',
        element: <Vault />,
      },
      {
        path: '/portfolio',
        element: <PortfolioPage />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
