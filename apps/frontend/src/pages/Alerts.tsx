import { useState } from 'react';
import { AlertList } from '../components/AlertList';
import type { AlertData } from '../components/AlertList';
import { MapView } from '../components/MapView';

export function Alerts() {
  const [view, setView] = useState<'list' | 'map'>('list');

  const mockAlerts: AlertData[] = [
    { id: '1', type: 'SUDDEN_IMPACT', priority: 'HIGH', distance: 150, timeAgo: '2m ago', confidence: 0.85 },
    { id: '2', type: 'COLLAPSE_PATTERN', priority: 'CRITICAL', distance: 400, timeAgo: '10m ago', confidence: 0.95 },
    { id: '3', type: 'SOS', priority: 'CRITICAL', distance: 800, timeAgo: '15m ago', confidence: 1.0 },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Nearby Alerts</h2>
        <div className="flex bg-gray-200 rounded-lg p-1">
          <button 
            onClick={() => setView('list')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${view === 'list' ? 'bg-white shadow' : 'text-gray-500'}`}
          >
            List
          </button>
          <button 
            onClick={() => setView('map')}
            className={`px-3 py-1 text-sm font-medium rounded-md ${view === 'map' ? 'bg-white shadow' : 'text-gray-500'}`}
          >
            Map
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <AlertList alerts={mockAlerts} />
      ) : (
        <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden min-h-[400px]">
          <MapView 
            center={[40.7128, -74.0060]} 
            markers={[
              { id: '1', position: [40.7138, -74.0050], label: 'Impact Detected' },
              { id: '2', position: [40.7118, -74.0080], label: 'Collapse Detected' },
              { id: '3', position: [40.7148, -74.0030], label: 'SOS Signal' },
            ]}
          />
        </div>
      )}
    </div>
  );
}
