import { useState, useEffect } from 'react';
import { AlertService, type LocalAlert } from '../services/AlertService';
import { MapView } from '../components/MapView';

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
    <div className="flex flex-col h-full space-y-4 max-w-2xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Nearby Disaster Alerts</h2>
          <p className="text-xs text-gray-500 mt-0.5">Live emergency reports received over mesh and backhaul</p>
        </div>
        <div className="flex bg-gray-200 rounded-lg p-1">
          <button 
            onClick={() => setView('list')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
          >
            List ({alerts.length})
          </button>
          <button 
            onClick={() => setView('map')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${view === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
          >
            Map
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center text-gray-500 py-12 bg-white rounded-2xl border border-dashed border-gray-300">
              No active disaster alerts in your sector.
            </div>
          ) : (
            alerts.map((alert) => {
              const isResolved = alert.acknowledgementState === 'RESOLVED';
              const isCritical = alert.priority === 'CRITICAL';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition space-y-3 bg-white shadow-sm ${
                    isResolved
                      ? 'border-gray-200 opacity-60'
                      : isCritical
                      ? 'border-red-200 bg-red-50/20'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isResolved ? 'bg-gray-400' : isCritical ? 'bg-red-600 animate-ping' : 'bg-orange-500'
                      }`} />
                      <span className="font-bold text-gray-900 text-sm">{alert.type}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        alert.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                        alert.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                        alert.priority === 'MEDIUM' ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
                      }`}>
                        {alert.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        alert.acknowledgementState === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        alert.acknowledgementState === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                        alert.acknowledgementState === 'RESOLVED' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.acknowledgementState || 'RECEIVED'}
                      </span>
                    </div>
                  </div>

                  {alert.description && (
                    <p className="text-xs text-gray-700 font-sans">{alert.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500 font-mono">
                    <div>Source: <span className="text-gray-800 font-bold">{alert.source || 'Local Mesh'}</span></div>
                    <div>Confidence: <span className="text-purple-700 font-bold">{(alert.confidence * 100).toFixed(0)}%</span></div>
                    <div>
                      Location:{' '}
                      <span className="text-gray-800">
                        {alert.location
                          ? `${alert.location.latitude.toFixed(3)}, ${alert.location.longitude.toFixed(3)}`
                          : 'Omitted'}
                      </span>
                    </div>
                    <div>
                      Time:{' '}
                      <span className="text-gray-800">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {!isResolved && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="text-xs font-bold px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                      >
                        ✓ Mark as Handled
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden min-h-[420px] border border-gray-200">
          <MapView 
            center={mapMarkers.length > 0 ? mapMarkers[0].position : [40.7128, -74.0060]} 
            markers={mapMarkers}
          />
        </div>
      )}
    </div>
  );
}
