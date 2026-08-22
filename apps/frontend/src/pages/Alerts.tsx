import { useState, useEffect } from 'react';
import { AlertService, type LocalAlert } from '../services/AlertService';
import { MapView } from '../components/MapView';
import { 
  BellIcon, 
  CheckCircleIcon, 
  LayersIcon 
} from '../components/Icons';

export function Alerts() {
  const [view, setView] = useState<'list' | 'map'>('list');
  const [alerts, setAlerts] = useState<LocalAlert[]>([]);

  useEffect(() => {
    const unsubscribe = AlertService.subscribe((updatedAlerts) => {
      setAlerts(updatedAlerts);
    });
    return unsubscribe;
  }, []);

  const handleAcknowledge = (id: string) => {
    AlertService.resolveAlert(id);
  };

  const mapMarkers = alerts
    .filter(a => a.location)
    .map(a => ({
      id: a.id,
      position: [a.location!.latitude, a.location!.longitude] as [number, number],
      label: `${a.type} (${a.priority}) - ${a.acknowledgementState || 'ACTIVE'}`,
    }));

  return (
    <div className="flex flex-col space-y-4 max-w-2xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-400">
              <BellIcon size={18} />
            </span>
            <h1 className="text-xl font-black text-white tracking-tight">Nearby Emergency Alerts</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time verified hazard reports propagating via mesh and local gateways.
          </p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 self-start sm:self-auto">
          <button 
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              view === 'list' 
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Feed ({alerts.length})
          </button>
          <button 
            onClick={() => setView('map')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              view === 'map' 
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tactical Map
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-dashed border-slate-800 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <LayersIcon size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-300">No Active Disaster Alerts</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No acute collapse, crowd surge, or manual SOS hazards currently reported in this sector.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isResolved = alert.acknowledgementState === 'RESOLVED';
              const isCritical = alert.priority === 'CRITICAL';
              const isHigh = alert.priority === 'HIGH';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition duration-150 space-y-3 bg-slate-900/90 shadow-md ${
                    isResolved
                      ? 'border-slate-800/60 opacity-60'
                      : isCritical
                      ? 'border-red-600/60 bg-red-950/20 ring-1 ring-red-600/30'
                      : isHigh
                      ? 'border-orange-500/50 bg-orange-950/20'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-3 h-3 rounded-full ${
                        isResolved 
                          ? 'bg-slate-600' 
                          : isCritical 
                          ? 'bg-red-500 animate-ping' 
                          : isHigh 
                          ? 'bg-orange-500' 
                          : 'bg-blue-500'
                      }`} />
                      <div>
                        <h3 className="font-bold text-white text-sm tracking-tight">{alert.type}</h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {alert.location ? 'Approx. ~0.8 km from sector' : 'Location omitted by sender'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-black tracking-wider uppercase ${
                        alert.priority === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                        alert.priority === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                        alert.priority === 'MEDIUM' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' : 
                        'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {alert.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                        alert.acknowledgementState === 'CONFIRMED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        alert.acknowledgementState === 'PROCESSING' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        alert.acknowledgementState === 'RESOLVED' ? 'bg-slate-800 text-slate-400 border border-slate-700' : 
                        'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {alert.acknowledgementState || 'RECEIVED'}
                      </span>
                    </div>
                  </div>

                  {alert.description && (
                    <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                      {alert.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">SOURCE</span>
                      <span className="text-slate-200 font-semibold">{alert.source || 'Local Mesh'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">CONFIDENCE</span>
                      <span className="text-purple-400 font-bold">{(alert.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">COORDINATES</span>
                      <span className="text-slate-200">
                        {alert.location
                          ? `${alert.location.latitude.toFixed(2)}, ${alert.location.longitude.toFixed(2)}`
                          : 'Omitted'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">TIME</span>
                      <span className="text-slate-200">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {!isResolved && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
                      >
                        <CheckCircleIcon size={14} className="text-emerald-400" />
                        <span>Acknowledge</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden min-h-[440px] border border-slate-800 shadow-xl">
          <MapView 
            center={mapMarkers.length > 0 ? mapMarkers[0].position : [12.9716, 77.5946]} 
            markers={mapMarkers}
          />
        </div>
      )}
    </div>
  );
}
