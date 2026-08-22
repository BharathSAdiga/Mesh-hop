import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EventType } from '@rescuenet/shared';
import { LocationPermissionCard } from '../components/LocationPermissionCard';

export function Report() {
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [locationPerm, setLocationPerm] = useState<'pending' | 'granted' | 'denied'>('pending');

  const events: { type: EventType; label: string; desc: string }[] = [
    { type: 'SUDDEN_IMPACT', label: 'Sudden Impact', desc: 'Explosion, crash, or impact' },
    { type: 'COLLAPSE_PATTERN', label: 'Structural Collapse', desc: 'Building or infrastructure falling' },
    { type: 'STAMPEDE_PATTERN', label: 'Stampede / Crowd Panic', desc: 'Mass uncontrolled movement' }
  ];

  const handleReport = () => {
    if (!selectedEvent) return;
    alert(`Reported ${selectedEvent} to mesh network!`);
    navigate('/alerts');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Report an Incident</h2>
      
      {locationPerm === 'pending' && (
        <LocationPermissionCard 
          onGrant={() => setLocationPerm('granted')} 
          onDeny={() => setLocationPerm('denied')} 
        />
      )}

      <div className="space-y-3">
        {events.map((evt) => (
          <div 
            key={evt.type}
            onClick={() => setSelectedEvent(evt.type)}
            className={`p-4 border-2 rounded-xl cursor-pointer transition ${
              selectedEvent === evt.type ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-200'
            }`}
          >
            <h3 className="font-bold text-gray-800">{evt.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{evt.desc}</p>
          </div>
        ))}
      </div>

      <button 
        disabled={!selectedEvent}
        onClick={handleReport}
        className={`w-full py-4 rounded-xl font-bold text-lg transition ${
          selectedEvent ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        Submit Report
      </button>
    </div>
  );
}
