import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SosService } from '../services/SosService';
import type { StoredPacket } from '../storage/db';
import { useNetworkStatus } from '../network/NetworkManager';
import { 
  RadioIcon, 
  CheckCircleIcon, 
  MapPinIcon, 
  ShieldIcon, 
  ArrowRightIcon 
} from '../components/Icons';

export function SOS() {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  
  const [withLocation, setWithLocation] = useState<boolean>(true);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [packet, setPacket] = useState<StoredPacket | null>(null);

  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const HOLD_DURATION_MS = 2000;

  const startHold = () => {
    if (packet || isCreating) return;
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
        executeSosTransmission();
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

  const executeSosTransmission = async () => {
    setIsCreating(true);
    if ('vibrate' in navigator) {
      try { navigator.vibrate([100, 50, 200]); } catch { /* ignore */ }
    }

    try {
      const stored = await SosService.sendSOS(withLocation);
      setPacket(stored);
    } catch (err) {
      console.error('Failed to create SOS:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (packet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] space-y-6 text-center max-w-md mx-auto px-2">
        <div className="w-20 h-20 rounded-full bg-emerald-950/80 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/50 animate-bounce">
          <CheckCircleIcon size={40} />
        </div>
        
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-full">
            {isOnline ? 'SOS SENT' : 'SOS STORED LOCALLY'}
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-3">
            EMERGENCY SIGNAL ACTIVE
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Your emergency beacon is queued and transmitting across local peer nodes.
          </p>
        </div>

        <div className="w-full bg-slate-900/90 rounded-2xl shadow-lg border border-slate-800 p-4 space-y-3 text-left">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
            <span className="text-slate-400 text-xs font-medium">Packet ID</span>
            <span className="font-mono text-xs font-bold text-slate-200">
              {packet.packetId}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
            <span className="text-slate-400 text-xs font-medium">Priority</span>
            <span className="font-mono text-xs font-black text-red-400 bg-red-950/80 border border-red-900/80 px-2 py-0.5 rounded">
              CRITICAL (1.0)
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
            <span className="text-slate-400 text-xs font-medium">Location</span>
            <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
              <MapPinIcon size={13} className={packet.location ? 'text-emerald-400' : 'text-slate-500'} />
              <span>{packet.location ? 'GPS Included' : 'No Location (Omitted)'}</span>
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
            <span className="text-slate-400 text-xs font-medium">Network Status</span>
            <span className={`text-xs font-mono font-bold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE (MESH QUEUE)'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-medium">Delivery State</span>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {packet.state}
            </span>
          </div>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
        >
          <span>RETURN TO SAFETY SCREEN</span>
          <ArrowRightIcon size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-5 max-w-md mx-auto px-2 py-4">
      {/* Header Info */}
      <div className="text-center space-y-1.5">
        <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800/80 text-red-400 font-bold">
          Dedicated Distress Portal
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight">EMERGENCY SOS</h1>
        <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
          Your SOS will be transmitted through the available RescuENet network and stored locally if offline.
        </p>
      </div>

      {/* Location Privacy Selection */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white flex items-center space-x-1.5">
            <MapPinIcon size={16} className="text-cyan-400" />
            <span>Location Sharing</span>
          </label>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            OPTIONAL
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Location sharing is optional. If you deny or omit GPS, responders will still receive your emergency distress beacon.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setWithLocation(true)}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
              withLocation
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 ring-2 ring-emerald-500/30'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
          >
            <MapPinIcon size={14} />
            <span>Share Location</span>
          </button>

          <button
            type="button"
            onClick={() => setWithLocation(false)}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
              !withLocation
                ? 'bg-slate-800 border-slate-500 text-white ring-2 ring-slate-500/30'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
          >
            <ShieldIcon size={14} />
            <span>Send Without</span>
          </button>
        </div>
      </div>

      {/* Hold To Send SOS Action */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative flex items-center justify-center">
          {/* Progress Ring */}
          <svg className="w-48 h-48 transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="84"
              stroke="#1e293b"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="96"
              cy="96"
              r="84"
              stroke="#ef4444"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="527.78"
              strokeDashoffset={527.78 - (527.78 * holdProgress) / 100}
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          </svg>

          {/* Button */}
          <button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            disabled={isCreating}
            aria-label="Hold for 2 seconds to broadcast SOS"
            className={`absolute w-36 h-36 rounded-full flex flex-col items-center justify-center select-none shadow-2xl transition duration-150 active:scale-95 ${
              isHolding
                ? 'bg-red-700 text-white scale-95 ring-8 ring-red-500/30'
                : 'bg-gradient-to-b from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 shadow-red-950/60 ring-4 ring-red-500/20'
            }`}
          >
            {isCreating ? (
              <RadioIcon size={32} className="animate-spin" />
            ) : (
              <>
                <RadioIcon size={30} className={isHolding ? 'animate-pulse text-white' : 'text-red-200'} />
                <span className="text-2xl font-black tracking-wider uppercase mt-0.5">SOS</span>
                <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-red-200">
                  {isHolding ? 'HOLDING...' : 'HOLD 2 SEC'}
                </span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-medium text-center mt-3">
          Hold to broadcast. SOS immediately bypasses consensus algorithms.
        </p>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        Cancel and return
      </button>
    </div>
  );
}
