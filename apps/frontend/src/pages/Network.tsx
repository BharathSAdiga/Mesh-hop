import { StatusIndicator } from '../components/StatusIndicator';

export function Network() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Network Diagnostic</h2>

      <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Gateway Connection</span>
          <StatusIndicator status="offline" label="Disconnected" />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Local Mesh (WebRTC/BLE)</span>
          <StatusIndicator status="online" label="Active (3 Peers)" />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Internet Uplink</span>
          <StatusIndicator status="offline" label="Unavailable" />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
        <h3 className="font-bold text-blue-900 mb-1">Store-Carry-Forward</h3>
        <p className="text-sm text-blue-800 mb-3">
          Your device is currently acting as a mesh node. Packets will be stored locally until a connection to a gateway is found.
        </p>
        <div className="flex justify-between text-sm text-blue-600 font-medium border-t border-blue-200 pt-2">
          <span>Packets Queued:</span>
          <span>12</span>
        </div>
      </div>
    </div>
  );
}
