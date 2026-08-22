import { Outlet, Link, useLocation } from 'react-router-dom';
import { OfflineBanner } from '../components/OfflineBanner';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { useNetworkStatus } from '../network/NetworkManager';

export function MainLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isOnline = useNetworkStatus();
  const isCommandCenter = location.pathname === '/command-center';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <Link to="/queue">
        <OfflineBanner isOffline={!isOnline} />
      </Link>
      
      <header className="bg-white shadow-sm sticky top-0 z-40 px-4 py-3 mt-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold text-red-600 tracking-tight">
            RESCUENet
          </Link>
          <Link
            to="/command-center"
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
              isCommandCenter
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            🚨 Command Center
          </Link>
        </div>
        <NetworkIndicator meshConnected={true} gatewayConnected={false} />
      </header>

      <main className={`flex-1 p-4 mx-auto w-full ${isCommandCenter ? 'max-w-7xl' : 'max-w-lg'}`}>
        <Outlet />
      </main>

      {!isHome && (
        <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-3 px-4 flex justify-between z-40 max-w-lg mx-auto left-0 right-0 overflow-x-auto space-x-3">
          <Link to="/" className="text-gray-500 flex flex-col items-center shrink-0">
             <span className="text-xs font-medium mt-1">Home</span>
          </Link>
          <Link to="/command-center" className="text-red-600 font-bold flex flex-col items-center shrink-0">
             <span className="text-xs font-bold mt-1">Ops Center</span>
          </Link>
          <Link to="/sos" className="text-red-500 flex flex-col items-center shrink-0">
             <span className="text-xs font-bold mt-1">SOS</span>
          </Link>
          <Link to="/alerts" className="text-gray-500 flex flex-col items-center shrink-0">
             <span className="text-xs font-medium mt-1">Alerts</span>
          </Link>
          <Link to="/ai-simulation" className="text-indigo-500 flex flex-col items-center shrink-0">
             <span className="text-xs font-medium mt-1">AI Sim</span>
          </Link>
          <Link to="/consensus-simulator" className="text-emerald-500 flex flex-col items-center shrink-0">
             <span className="text-xs font-medium mt-1">Consensus</span>
          </Link>
          <Link to="/transport-simulator" className="text-purple-600 flex flex-col items-center shrink-0">
             <span className="text-xs font-medium mt-1">Mesh Hop</span>
          </Link>
          <Link to="/store-carry-forward" className="text-amber-600 flex flex-col items-center shrink-0">
             <span className="text-xs font-medium mt-1">Routing</span>
          </Link>
          <Link to="/gateway-simulator" className="text-cyan-600 flex flex-col items-center shrink-0">
             <span className="text-xs font-medium mt-1">Gateway</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
