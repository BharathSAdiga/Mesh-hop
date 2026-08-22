interface LocationPermissionCardProps {
  onGrant: () => void;
  onDeny: () => void;
}

export function LocationPermissionCard({ onGrant, onDeny }: LocationPermissionCardProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm">
      <h3 className="font-semibold text-blue-900 mb-2">Enable Location Sharing?</h3>
      <p className="text-sm text-blue-700 mb-4">
        Sharing your location significantly improves rescue response times. Location is attached to SOS packets pseudonymously.
      </p>
      <div className="flex space-x-3">
        <button 
          onClick={onGrant}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium active:scale-95 transition"
        >
          Allow
        </button>
        <button 
          onClick={onDeny}
          className="flex-1 bg-white text-blue-600 border border-blue-600 py-2 rounded-lg font-medium active:scale-95 transition"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
