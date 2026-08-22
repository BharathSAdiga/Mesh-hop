import { MapView } from '../components/MapView';

export function SafeZones() {
  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Safe Zones</h2>
      <p className="text-gray-500 text-sm">
        Verified shelters, medical tents, and evacuation points.
      </p>

      <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden min-h-[300px]">
        <MapView 
          center={[40.7128, -74.0060]} 
          markers={[
            { id: 'sz1', position: [40.7158, -74.0100], label: 'Central High School Shelter', isSafeZone: true },
            { id: 'sz2', position: [40.7098, -74.0020], label: 'City Hall Medical Post', isSafeZone: true },
          ]}
        />
      </div>

      <div className="space-y-3">
        <div className="bg-white p-4 rounded-xl border border-green-200 flex justify-between items-center shadow-sm">
          <div>
            <h3 className="font-bold text-green-800">Central High School Shelter</h3>
            <p className="text-sm text-gray-500">300m away • Capacity: High</p>
          </div>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">OPEN</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-green-200 flex justify-between items-center shadow-sm">
          <div>
            <h3 className="font-bold text-green-800">City Hall Medical Post</h3>
            <p className="text-sm text-gray-500">800m away • Basic First Aid</p>
          </div>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">OPEN</span>
        </div>
      </div>
    </div>
  );
}
