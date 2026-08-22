import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useNetworkStatus } from '../network/NetworkManager';
import { PacketRepository } from '../storage/repositories/PacketRepository';
import { 
  RadioIcon, 
  BellIcon, 
  MapPinIcon, 
  BookOpenIcon, 
  ShieldIcon, 
  ActivityIcon,
  ServerIcon
} from '../components/Icons';

export function CitizenLayout() {
  const location = useLocation();
  const isOnline = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [gatewayAvailable, setGatewayAvailable] = useState<boolean>(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const packets = await PacketRepository.getPendingPackets();
        setPendingCount(packets.length);
      } catch {
        // storage fallback
      }
      try {
        const res = await fetch('http://localhost:3001/gateway/status', { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const data = await res.json();
          setGatewayAvailable(data.state === 'ONLINE' || data.isBackendConnected);
        } else {
          setGatewayAvailable(false);
        }
      } catch {
        setGatewayAvailable(false);
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: '/', label: 'SOS', icon: RadioIcon, activeClass: 'text-red-500 font-bold' },
    { path: '/alerts', label: 'Alerts', icon: BellIcon, activeClass: 'text-amber-400 font-bold' },
    { path: '/safe-zones', label: 'Safe Zones', icon: MapPinIcon, activeClass: 'text-emerald-400 font-bold' },
    { path: '/instructions', label: 'Guides', icon: BookOpenIcon, activeClass: 'text-cyan-400 font-bold' },
    { path: '/report', label: 'Report', icon: ActivityIcon, activeClass: 'text-orange-400 font-bold' },
    { path: '/network', label: 'Network', icon: ShieldIcon, activeClass: 'text-slate-200 font-bold' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-red-500 selection:text-white">
      {/* Top Emergency Status Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <RadioIcon size={18} />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold tracking-tight text-white text-base">RESCUENet</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800/60 text-red-400">
                  Citizen PWA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wide">Consensus Emergency Network</p>
            </div>
          </Link>

          {/* Right Action: Network Status Pill & Command Center Switch */}
          <div className="flex items-center space-x-2">
            <Link 
              to="/network"
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition ${
                isOnline 
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400' 
                  : gatewayAvailable
                  ? 'bg-cyan-950/60 border-cyan-800/60 text-cyan-400'
                  : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : gatewayAvailable ? 'bg-cyan-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="font-semibold text-[11px]">
                {isOnline ? 'CONNECTED' : gatewayAvailable ? 'LOCAL GATEWAY' : 'OFFLINE'}
              </span>
            </Link>

            <Link
              to="/command-center"
              title="Switch to Operator Command Center"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1"
            >
              <ServerIcon size={14} />
              <span className="text-[11px] font-medium hidden sm:inline">Ops</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Offline Stored Packets Floating Pill (if any pending) */}
      {pendingCount > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 text-center">
          <p className="text-xs font-mono text-amber-300">
            ⚠️ <strong>{pendingCount}</strong> emergency packet{pendingCount > 1 ? 's' : ''} stored locally in memory queue. Will sync upon backhaul.
          </p>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4">
        <Outlet />
      </main>

      {/* Bottom Citizen Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 py-2 px-2">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition duration-150 ${
                  isActive
                    ? 'bg-slate-800/80 ' + item.activeClass
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <IconComponent size={20} className={isActive ? '' : 'opacity-70'} />
                <span className={`text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
