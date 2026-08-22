import { useState, useEffect } from 'react';
import { SafeZoneService, type SafeZone } from '../services/SafeZoneService';
import { LocationService } from '../services/LocationService';
import { MapView } from '../components/MapView';
import type { Location } from '@rescuenet/shared';

export function SafeZones() {
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  useEffect(() => {
    loadZones();
    requestLocation();
  }, []);

  const loadZones = (loc?: Location | null) => {
    const data = SafeZoneService.getSafeZones(loc || userLocation);
    setSafeZones(data.safeZones);
    setIsLive(data.isLive);
  };

  const requestLocation = async () => {
    setIsLocating(true);
    const loc = await LocationService.getCurrentLocation();
    setIsLocating(false);
    if (loc) {
      setUserLocation(loc);
      loadZones(loc);
    }
  };

  const filteredZones = safeZones.filter(z => {
    if (selectedType === 'ALL') return true;
    return z.type === selectedType;
  });

  const mapMarkers = filteredZones.map(z => ({
    id: z.id,
    position: [z.location.latitude, z.location.longitude] as [number, number],
    label: `${z.name} (${z.status} - ${z.capacityPercent}% capacity)`,
    isSafeZone: true,
  }));

  const mapCenter: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : safeZones.length > 0
    ? [safeZones[0].location.latitude, safeZones[0].location.longitude]
    : [12.9716, 77.5946];

  return (
    <div className="flex flex-col h-full space-y-4 max-w-3xl mx-auto pb-10">
      {/* Header & Provenance Badge */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <span>🛡️</span> Verified Safe Zones
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Designated emergency shelters, trauma medical posts, and evacuation staging areas
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className={`px-2.5 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
            isLive
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isLive ? 'LIVE NETWORK INFORMATION' : 'LOCAL CACHED INFORMATION'}
          </span>
        </div>
      </div>

      {/* GPS Status & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-wrap justify-between items-center gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-gray-700">Distance Reference:</span>
          {isLocating ? (
            <span className="text-blue-600 font-mono animate-pulse">Acquiring GPS fix...</span>
          ) : userLocation ? (
            <span className="text-green-700 font-mono font-bold">
              ✓ GPS Active ({userLocation.latitude.toFixed(3)}, {userLocation.longitude.toFixed(3)})
            </span>
          ) : (
            <button
              onClick={requestLocation}
              className="text-blue-600 underline hover:text-blue-800 font-semibold"
            >
              Enable GPS for exact distance
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
          {['ALL', 'SHELTER', 'MEDICAL_POST', 'EVACUATION_POINT', 'SUPPLY_DISTRIBUTION'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                selectedType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'ALL' ? 'All' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Leaflet Map */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm min-h-[300px] h-[300px]">
        <MapView center={mapCenter} zoom={13} markers={mapMarkers} />
      </div>

      {/* Safe Zones Cards Grid */}
      <div className="space-y-3">
        {filteredZones.map((zone) => {
          const isOpen = zone.status === 'OPEN';
          const isLimited = zone.status === 'LIMITED';

          return (
            <div
              key={zone.id}
              className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3 hover:border-gray-300 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {zone.type === 'SHELTER' ? '🏠' : zone.type === 'MEDICAL_POST' ? '🏥' : zone.type === 'EVACUATION_POINT' ? '🚁' : '📦'}
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm">{zone.name}</h3>
                  </div>
                  {zone.location.address && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-6">{zone.location.address}</p>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs ${
                    isOpen ? 'bg-green-100 text-green-800' : isLimited ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {zone.status}
                  </span>
                  {zone.distanceMeters !== undefined && (
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {zone.distanceMeters >= 1000
                        ? `${(zone.distanceMeters / 1000).toFixed(1)} km away`
                        : `${zone.distanceMeters}m away`}
                    </span>
                  )}
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-600 font-mono">
                  <span>Occupancy Capacity:</span>
                  <span className="font-bold">{zone.capacityPercent}% Filled</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      zone.capacityPercent > 80 ? 'bg-red-500' : zone.capacityPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${zone.capacityPercent}%` }}
                  />
                </div>
              </div>

              {/* Services & Contact */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-[11px] text-gray-600">
                <div className="flex flex-wrap gap-1">
                  {zone.services.map((svc, i) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                      ✓ {svc}
                    </span>
                  ))}
                </div>
                {zone.contactRadio && (
                  <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                    📻 {zone.contactRadio}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
