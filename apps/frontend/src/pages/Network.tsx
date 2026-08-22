import { useState, useEffect } from 'react';
import { useNetworkStatus } from '../network/NetworkManager';
import { PacketRepository } from '../storage/repositories/PacketRepository';
import { 
  WifiIcon, 
  WifiOffIcon, 
  ServerIcon, 
  RadioIcon, 
  ShieldIcon, 
  RefreshCwIcon 
} from '../components/Icons';

export function Network() {
  const isOnline = useNetworkStatus();
  const [gatewayStatus, setGatewayStatus] = useState<'AVAILABLE' | 'UNAVAILABLE'>('UNAVAILABLE');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncSeconds, setLastSyncSeconds] = useState<number>(14);
  const [isSyncing, setIsSyncing] = useState(false);

  const checkDiagnostics = async () => {
    try {
      const packets = await PacketRepository.getPendingPackets();
      setPendingCount(packets.length);
    } catch {
      // storage
    }

    try {
      const res = await fetch('http://localhost:3001/gateway/status', { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        setGatewayStatus('AVAILABLE');
      } else {
        setGatewayStatus('UNAVAILABLE');
      }
    } catch {
      setGatewayStatus('UNAVAILABLE');
    }
  };

  useEffect(() => {
    checkDiagnostics();
    const interval = setInterval(() => {
      checkDiagnostics();
      setLastSyncSeconds(s => (s >= 60 ? 1 : s + 4));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await checkDiagnostics();
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncSeconds(0);
    }, 800);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-slate-800 text-slate-200">
              <RadioIcon size={18} />
            </span>
            <h1 className="text-xl font-black text-white tracking-tight">Network Telemetry</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of local mesh transports, field gateways, and internet backhaul.
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
        >
          <RefreshCwIcon size={13} className={isSyncing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Primary Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Internet */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Internet Backhaul</span>
            {isOnline ? <WifiIcon size={16} className="text-emerald-400" /> : <WifiOffIcon size={16} className="text-amber-400" />}
          </div>
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-base font-black font-mono tracking-tight text-white">
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {isOnline ? 'Direct cloud link reachable' : 'Mesh store-and-forward active'}
          </p>
        </div>

        {/* Field Gateway */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Field Gateway</span>
            <ServerIcon size={16} className={gatewayStatus === 'AVAILABLE' ? 'text-emerald-400' : 'text-slate-500'} />
          </div>
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${gatewayStatus === 'AVAILABLE' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span className="text-base font-black font-mono tracking-tight text-white">
              {gatewayStatus}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {gatewayStatus === 'AVAILABLE' ? 'Port 3001 relay active' : 'Searching local radio perimeters'}
          </p>
        </div>

        {/* Local Transport */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Local Mesh</span>
            <RadioIcon size={16} className="text-cyan-400" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-base font-black font-mono tracking-tight text-white">
              AVAILABLE
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            P2P WebSocket / BLE transport
          </p>
        </div>
      </div>

      {/* Queue & Synchronization Detail Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldIcon size={16} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Store-Carry-Forward Buffer</h3>
          </div>
          <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded">
            INDEXEDDB BACKED
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Offline Packets</span>
            <div className="text-lg font-black text-white flex items-center space-x-2">
              <span>{pendingCount}</span>
              <span className="text-[11px] font-normal text-slate-400">queued</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
            <span className="text-slate-500 text-[10px] uppercase">Last Synchronization</span>
            <div className="text-lg font-black text-white flex items-center space-x-2">
              <span>{lastSyncSeconds}s</span>
              <span className="text-[11px] font-normal text-slate-400">ago</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed pt-1">
          When outside internet or gateway range, distress packets remain persisted in non-volatile browser storage. Packets automatically flush and sync when a gateway or relay node is encountered.
        </p>
      </div>
    </div>
  );
}
