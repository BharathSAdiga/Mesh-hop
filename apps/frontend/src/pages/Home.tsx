import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SosService } from '../services/SosService';
import { PacketRepository } from '../storage/repositories/PacketRepository';
import { 
  RadioIcon, 
  AlertTriangleIcon, 
  MapPinIcon, 
  BellIcon, 
  ShieldIcon, 
  CheckCircleIcon, 
  ArrowRightIcon 
} from '../components/Icons';

export function Home() {
  const navigate = useNavigate();
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [sosSent, setSosSent] = useState(false);
  const [pendingPacketsCount, setPendingPacketsCount] = useState(0);
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const HOLD_DURATION_MS = 2000;

  useEffect(() => {
    async function loadStats() {
      try {
        const packets = await PacketRepository.getPendingPackets();
        setPendingPacketsCount(packets.length);
      } catch {
        // storage fallback
      }
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          setLocationStatus(status.state as any);
        } catch {
          // ignore
        }
      }
    }
    loadStats();
  }, []);

  const startHold = () => {
    if (sosSent || isTransmitting) return;
    setIsHolding(true);
    startTimeRef.current = Date.now();

    if ('vibrate' in navigator) {
      try { navigator.vibrate(50); } catch { /* ignore */ }
    }

    holdTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(progress);

      if (elapsed >= HOLD_DURATION_MS) {
        clearInterval(holdTimerRef.current!);
        holdTimerRef.current = null;
        triggerImmediateSOS();
      }
    }, 30);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const triggerImmediateSOS = async () => {
    setIsTransmitting(true);
    if ('vibrate' in navigator) {
      try { navigator.vibrate([100, 50, 200]); } catch { /* ignore */ }
    }

    try {
      await SosService.sendSOS(true);
      setSosSent(true);
      setTimeout(() => {
        navigate('/sos');
      }, 1000);
    } catch {
      // Offline fallback
      setSosSent(true);
      setTimeout(() => {
        navigate('/sos');
      }, 1000);
    } finally {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5 pb-6">
      
      {/* Emergency Guidance Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-start space-x-3 shadow-lg">
        <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 shrink-0">
          <AlertTriangleIcon size={20} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Active Emergency Channel</h2>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            In life-threatening situations, hold the SOS button below. Your distress signal will propagate across local peer devices.
          </p>
        </div>
      </div>

      {/* Main Hold-To-Send SOS Control */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative flex items-center justify-center">
          {/* Circular Progress Ring */}
          <svg className="w-56 h-56 transform -rotate-90">
            <circle
              cx="112"
              cy="112"
              r="98"
              stroke="#1e293b"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="112"
              cy="112"
              r="98"
              stroke="#ef4444"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray="615.75"
              strokeDashoffset={615.75 - (615.75 * holdProgress) / 100}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          {/* Core Interactive SOS Button */}
          <button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            disabled={sosSent || isTransmitting}
            aria-label="Emergency SOS button. Hold for two seconds to broadcast emergency distress."
            className={`absolute w-44 h-44 rounded-full flex flex-col items-center justify-center select-none shadow-2xl transition duration-150 active:scale-95 ${
              sosSent
                ? 'bg-emerald-600 text-white shadow-emerald-900/50'
                : isHolding
                ? 'bg-red-700 text-white shadow-red-950/80 scale-95 ring-8 ring-red-500/30'
                : 'bg-gradient-to-b from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 shadow-red-950/60 ring-4 ring-red-500/20'
            }`}
          >
            {sosSent ? (
              <>
                <CheckCircleIcon size={44} className="mb-1" />
                <span className="text-base font-extrabold tracking-wider uppercase">BROADCASTING</span>
                <span className="text-[10px] font-mono opacity-80 mt-0.5">OPENING STATUS...</span>
              </>
            ) : isTransmitting ? (
              <>
                <RadioIcon size={38} className="animate-spin mb-1" />
                <span className="text-sm font-extrabold tracking-wider uppercase">PACKAGING</span>
              </>
            ) : (
              <>
                <RadioIcon size={34} className={isHolding ? 'animate-pulse text-white' : 'text-red-200'} />
                <span className="text-3xl font-black tracking-wider uppercase mt-1">SOS</span>
                <span className="text-[10px] font-mono font-bold tracking-widest text-red-100 uppercase mt-0.5">
                  {isHolding ? `${Math.ceil((100 - holdProgress) / 50)}s TO CONFIRM` : 'HOLD TO SEND'}
                </span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 font-medium text-center mt-4">
          Press and hold for 2 seconds to broadcast emergency alert.<br/>
          <span className="text-slate-500">Tap-and-release is prevented to stop false alarms.</span>
        </p>
      </div>

      {/* Primary Emergency Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Report Incident */}
        <Link 
          to="/report"
          className="group bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-4 flex flex-col justify-between transition duration-150 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-orange-950/60 border border-orange-800/60 text-orange-400">
              <AlertTriangleIcon size={20} />
            </div>
            <ArrowRightIcon size={16} className="text-slate-600 group-hover:text-orange-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Report Incident</h3>
            <p className="text-xs text-slate-400 mt-0.5">Collapse, Stampede, Fire</p>
          </div>
        </Link>

        {/* Nearby Alerts */}
        <Link 
          to="/alerts"
          className="group bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 flex flex-col justify-between transition duration-150 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400">
              <BellIcon size={20} />
            </div>
            <ArrowRightIcon size={16} className="text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Nearby Alerts</h3>
            <p className="text-xs text-slate-400 mt-0.5">Verified active hazards</p>
          </div>
        </Link>

        {/* Safe Zones */}
        <Link 
          to="/safe-zones"
          className="group bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 flex flex-col justify-between transition duration-150 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <MapPinIcon size={20} />
            </div>
            <ArrowRightIcon size={16} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Safe Zones</h3>
            <p className="text-xs text-slate-400 mt-0.5">Verified offline shelters</p>
          </div>
        </Link>
      </div>

      {/* Citizen Privacy & Device Status Footer */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center space-x-2 text-slate-400">
            <ShieldIcon size={14} className="text-emerald-400" />
            <span>Privacy Protection</span>
          </span>
          <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/60">
            ZERO RAW AUDIO / EDGE ONLY
          </span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
          <span className="text-slate-400">Location Permission</span>
          <span className="font-mono text-[11px] text-slate-300">
            {locationStatus === 'granted' ? '📍 GPS AVAILABLE' : '🛡️ OPTIONAL / DENIED'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
          <span className="text-slate-400">Offline Queue</span>
          <span className="font-mono text-[11px] text-slate-300">
            {pendingPacketsCount > 0 ? `⚠️ ${pendingPacketsCount} PENDING` : '0 QUEUED (CLEAN)'}
          </span>
        </div>
      </div>

    </div>
  );
}
