import { Outlet, Link, useLocation } from 'react-router-dom';
import { OfflineBanner } from '../components/OfflineBanner';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { useNetworkStatus } from '../network/NetworkManager';

export function MainLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isOnline = useNetworkStatus();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <Link to="/queue">
        <OfflineBanner isOffline={!isOnline} />
      </Link>
      
      <header className="bg-white shadow-sm sticky top-0 z-40 px-4 py-3 mt-8 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-red-600 tracking-tight">
          RESCUENet
        </Link>
        <NetworkIndicator meshConnected={true} gatewayConnected={false} />
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      {!isHome && (
        <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-3 px-6 flex justify-between z-40 max-w-lg mx-auto left-0 right-0">
          <Link to="/" className="text-gray-500 flex flex-col items-center">
             <span className="text-xs font-medium mt-1">Home</span>
          </Link>
          <Link to="/sos" className="text-red-500 flex flex-col items-center">
             <span className="text-xs font-bold mt-1">SOS</span>
          </Link>
          <Link to="/alerts" className="text-gray-500 flex flex-col items-center">
             <span className="text-xs font-medium mt-1">Alerts</span>
          </Link>
          <Link to="/network" className="text-gray-500 flex flex-col items-center">
             <span className="text-xs font-medium mt-1">Network</span>
          </Link>
          <Link to="/ai-simulation" className="text-indigo-500 flex flex-col items-center">
             <span className="text-xs font-medium mt-1">AI Sim</span>
          </Link>
          <Link to="/consensus-simulator" className="text-emerald-500 flex flex-col items-center">
             <span className="text-xs font-medium mt-1">Consensus</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
