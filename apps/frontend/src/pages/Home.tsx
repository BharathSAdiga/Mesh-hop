import { Link, useNavigate } from 'react-router-dom';
import { EmergencyButton } from '../components/EmergencyButton';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full space-y-6">
      
      <div className="flex-1 flex flex-col items-center justify-center py-8">
        <EmergencyButton onClick={() => navigate('/sos')} />
        <p className="mt-4 text-gray-500 text-sm font-medium text-center">
          Tap in case of life-threatening emergency.<br/> Will broadcast your location to mesh.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/report" className="bg-orange-500 text-white rounded-xl p-4 flex flex-col items-center shadow-sm active:scale-95 transition">
          <span className="font-bold">Report Disaster</span>
          <span className="text-xs text-orange-100 mt-1">Fire, Collapse, etc.</span>
        </Link>
        
        <Link to="/alerts" className="bg-white border border-gray-200 text-gray-800 rounded-xl p-4 flex flex-col items-center shadow-sm active:scale-95 transition">
          <span className="font-bold text-red-600">3 Nearby Alerts</span>
          <span className="text-xs text-gray-500 mt-1">View Map</span>
        </Link>
        
        <Link to="/safe-zones" className="bg-white border border-gray-200 text-gray-800 rounded-xl p-4 flex flex-col items-center shadow-sm active:scale-95 transition">
          <span className="font-bold text-green-600">Safe Zones</span>
          <span className="text-xs text-gray-500 mt-1">Shelters & Clinics</span>
        </Link>
        
        <Link to="/instructions" className="bg-white border border-gray-200 text-gray-800 rounded-xl p-4 flex flex-col items-center shadow-sm active:scale-95 transition">
          <span className="font-bold text-blue-600">Instructions</span>
          <span className="text-xs text-gray-500 mt-1">Offline Guides</span>
        </Link>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <Link to="/demo" className="w-full block text-center py-3 bg-gray-800 text-white rounded-xl font-medium">
          Open Demo Controls
        </Link>
      </div>
    </div>
  );
}
