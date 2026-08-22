import { useEffect, useState } from 'react';
import { PacketRepository } from '../storage/repositories/PacketRepository';
import type { StoredPacket } from '../storage/db';

export function OfflineQueue() {
  const [packets, setPackets] = useState<StoredPacket[]>([]);

  const loadPackets = async () => {
    const all = await PacketRepository.getAllPackets();
    setPackets(all.sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    loadPackets();
    const interval = setInterval(loadPackets, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (packetId: string) => {
    await PacketRepository.retryFailed(packetId);
    loadPackets();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Offline Queue</h2>
      <p className="text-sm text-gray-500">
        Packets waiting to be delivered via the mesh network.
      </p>

      {packets.length === 0 ? (
        <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          Queue is empty.
        </div>
      ) : (
        <div className="space-y-4">
          {packets.map(packet => (
            <div key={packet.packetId} className="bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-col space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs text-gray-500 block">ID: {packet.packetId.slice(0, 8)}...</span>
                  <h3 className="font-bold text-gray-800">{packet.eventType}</h3>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold
                  ${packet.state === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${packet.state === 'DELIVERED' ? 'bg-green-100 text-green-800' : ''}
                  ${packet.state === 'FAILED' ? 'bg-red-100 text-red-800' : ''}
                  ${packet.state === 'EXPIRED' ? 'bg-gray-100 text-gray-800' : ''}
                  ${packet.state === 'TRANSMITTING' ? 'bg-blue-100 text-blue-800' : ''}
                `}>
                  {packet.state}
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-500 mt-2 border-t pt-2">
                <span>Priority: {packet.priority}</span>
                <span>TTL: {packet.ttl}</span>
                <span>Created: {new Date(packet.createdAt).toLocaleTimeString()}</span>
              </div>

              {packet.state === 'FAILED' && (
                <button 
                  onClick={() => handleRetry(packet.packetId)}
                  className="mt-2 w-full py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-semibold hover:bg-orange-200"
                >
                  Retry Transmission
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
