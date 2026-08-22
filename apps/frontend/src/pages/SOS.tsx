import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SosService } from '../services/SosService';
import type { StoredPacket } from '../storage/db';
import { useNetworkStatus } from '../network/NetworkManager';

export function SOS() {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  
  const [isCreating, setIsCreating] = useState(false);
  const [packet, setPacket] = useState<StoredPacket | null>(null);

  const handleSend = async (withLocation: boolean) => {
    setIsCreating(true);
    try {
      const storedPacket = await SosService.sendSOS(withLocation);
      setPacket(storedPacket);
    } catch (err) {
      console.error('Failed to create SOS:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (packet) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6 text-center max-w-md mx-auto px-4">
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <div>
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">SOS CREATED</h2>
          <p className="text-gray-500 mt-2">Your emergency signal is active.</p>
        </div>

        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3 text-left">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500 text-sm font-medium">Packet ID</span>
            <span className="font-mono text-sm text-gray-800">{packet.packetId.split('_')[1]?.substring(0, 8)}...</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500 text-sm font-medium">Location</span>
            <span className="text-sm font-bold text-gray-800">
              {packet.location ? 'Shared' : 'Not Shared'}
            </span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500 text-sm font-medium">Network</span>
            <span className={`text-sm font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm font-medium">Delivery</span>
            <span className="text-sm font-bold text-blue-600">
              {isOnline ? 'TRANSMITTING' : 'STORED LOCALLY'}
            </span>
          </div>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="w-full py-4 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-200 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-8 text-center max-w-md mx-auto px-4">
      
      <div>
        <div className="w-24 h-24 rounded-full bg-red-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-red-200 animate-pulse mb-6">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Manual SOS</h2>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          This will immediately create a critical priority emergency packet.
        </p>
      </div>

      <div className="w-full space-y-4">
        {isCreating ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <>
            <button 
              onClick={() => handleSend(true)}
              className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow hover:bg-red-700 transition-colors"
            >
              Send SOS with Location
            </button>
            <button 
              onClick={() => handleSend(false)}
              className="w-full py-4 bg-gray-100 text-red-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Send SOS without Location
            </button>
            
            <button 
              onClick={() => navigate(-1)}
              className="mt-8 text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
          </>
        )}
      </div>

    </div>
  );
}
