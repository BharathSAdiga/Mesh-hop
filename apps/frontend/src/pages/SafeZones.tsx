import { useState, useEffect } from 'react';
import { SafeZoneService, type SafeZone } from '../services/SafeZoneService';
import { LocationService } from '../services/LocationService';
import { MapView } from '../components/MapView';
import type { Location } from '@rescuenet/shared';
import { 
  MapPinIcon, 
  ShieldIcon, 
  RadioIcon 
} from '../components/Icons';

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
    <div className="flex flex-col space-y-4 max-w-3xl mx-auto pb-8">
      {/* Header & Provenance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <ShieldIcon size={18} />
            </span>
            <h1 className="text-xl font-black text-white tracking-tight">Verified Safe Zones</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Emergency shelters, medical triage posts, and evacuation staging areas.
          </p>
        </div>

        <div className="self-start sm:self-auto font-mono text-[11px]">
          <span className={`px-2.5 py-1 rounded-full font-bold border flex items-center space-x-1.5 ${
            isLive
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
              : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isLive ? 'LIVE NETWORK REFRESH' : 'LOCAL CACHED INFORMATION'}</span>
          </span>
        </div>
      </div>

      {/* GPS Status & Filters */}
      <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 font-medium">Distance Reference:</span>
          {isLocating ? (
            <span className="text-cyan-400 font-mono animate-pulse">Acquiring GPS fix...</span>
          ) : userLocation ? (
            <span className="text-emerald-400 font-mono font-semibold">
              ✓ GPS Active ({userLocation.latitude.toFixed(2)}, {userLocation.longitude.toFixed(2)})
            </span>
          ) : (
            <button
              onClick={requestLocation}
              className="text-cyan-400 underline hover:text-cyan-300 font-medium"
            >
              Enable GPS for exact distance
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          {['ALL', 'SHELTER', 'MEDICAL_POST', 'EVACUATION_POINT', 'SUPPLY_DISTRIBUTION'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight uppercase transition ${
                selectedType === t 
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden min-h-[300px] h-[300px] border border-slate-800 shadow-lg">
        <MapView center={mapCenter} zoom={13} markers={mapMarkers} />
      </div>

      {/* Safe Zones Cards */}
      <div className="space-y-3">
        {filteredZones.map((zone) => {
          const isOpen = zone.status === 'OPEN';
          const isLimited = zone.status === 'LIMITED';

          return (
            <div
              key={zone.id}
              className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition duration-150 space-y-3 shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                      <MapPinIcon size={16} />
                    </span>
                    <h3 className="font-bold text-white text-sm tracking-tight">{zone.name}</h3>
                  </div>
                  {zone.location.address && (
                    <p className="text-xs text-slate-400 mt-1 ml-7">{zone.location.address}</p>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs uppercase ${
                    isOpen 
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                      : isLimited 
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800' 
                      : 'bg-red-950/80 text-red-300 border border-red-800'
                  }`}>
                    {zone.status}
                  </span>
                  {zone.distanceMeters !== undefined && (
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/60">
                      {zone.distanceMeters >= 1000
                        ? `${(zone.distanceMeters / 1000).toFixed(1)} km away`
                        : `${zone.distanceMeters}m away`}
                    </span>
                  )}
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Occupancy Capacity:</span>
                  <span className="font-bold text-slate-200">{zone.capacityPercent}% Filled</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      zone.capacityPercent > 80 
                        ? 'bg-red-500' 
                        : zone.capacityPercent > 50 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${zone.capacityPercent}%` }}
                  />
                </div>
              </div>

              {/* Services & Radio Frequency */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex flex-wrap gap-1.5">
                  {zone.services.map((svc, i) => (
                    <span key={i} className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800 font-medium">
                      ✓ {svc}
                    </span>
                  ))}
                </div>
                {zone.contactRadio && (
                  <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/60 flex items-center space-x-1">
                    <RadioIcon size={12} />
                    <span>{zone.contactRadio}</span>
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
