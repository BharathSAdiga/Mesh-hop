import { useState, useRef, useEffect } from 'react';
import { RoutingEngine } from '../network/routing/RoutingEngine';
import type { RoutingEvent } from '../network/routing/RoutingEngine';
import type { TransportAdapter } from '../network/transports/TransportAdapter';
import type { RescuePacket, Priority, EventType } from '@rescuenet/shared';
import type { StoredPacket } from '../storage/db';
import { v4 as uuidv4 } from 'uuid';

class SimGatewayTransport implements TransportAdapter {
  readonly name = 'SimGateway';
  public isConnected = false;
  public inbox: StoredPacket[] = [];

  async initialize(): Promise<void> {}
  async startListening(_handler: (p: RescuePacket) => void): Promise<void> {}
  async stopListening(): Promise<void> {}
  async discover(): Promise<string[]> {
    return this.isConnected ? ['gateway_peer'] : [];
  }
  async sendPacket(packet: RescuePacket): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    // Simulate gateway receiving and delivering
    this.inbox.push({ ...packet, state: 'DELIVERED', retryCount: 0 });
    return true;
  }
  async receivePacket(): Promise<RescuePacket | null> {
    return null;
  }
  getStatus() {
    return this.isConnected ? ('connected' as const) : ('disconnected' as const);
  }
  async disconnect(): Promise<void> {
    this.isConnected = false;
  }
}

export function StoreCarryForwardSimulator() {
  const [isRelayConnected, setIsRelayConnected] = useState<boolean>(false);
  const [eventType, setEventType] = useState<EventType>('SOS');
  const [priority, setPriority] = useState<Priority>('CRITICAL');
  const [initialTTL, setInitialTTL] = useState<number>(5);
  const [queuedPackets, setQueuedPackets] = useState<StoredPacket[]>([]);
  const [gatewayInbox, setGatewayInbox] = useState<StoredPacket[]>([]);
  const [events, setEvents] = useState<RoutingEvent[]>([]);
  const [hasSentPacket, setHasSentPacket] = useState<boolean>(false);

  const engineRef = useRef<RoutingEngine | null>(null);
  const transportRef = useRef<SimGatewayTransport | null>(null);
  const lastPacketRef = useRef<RescuePacket | null>(null);

  const updateState = () => {
    if (engineRef.current && transportRef.current) {
      setQueuedPackets(engineRef.current.queue.getPackets());
      setGatewayInbox([...transportRef.current.inbox]);
    }
  };

  useEffect(() => {
    const engine = new RoutingEngine('ORIGIN_NODE');
    const transport = new SimGatewayTransport();
    engine.registerTransport(transport);

    engine.onRoutingEvent((event) => {
      setEvents(prev => [event, ...prev.slice(0, 30)]);
      updateState();
    });

    engineRef.current = engine;
    transportRef.current = transport;

    updateState();
  }, []);

  const handleToggleConnection = () => {
    if (!engineRef.current || !transportRef.current) return;
    const newStatus = !isRelayConnected;
    setIsRelayConnected(newStatus);
    transportRef.current.isConnected = newStatus;
    engineRef.current.setRelayAvailable(newStatus);
    updateState();
  };

  const handleSendPacket = async () => {
    if (!engineRef.current) return;

    const packet: RescuePacket = {
      packetId: `pkt_${uuidv4()}`,
      senderId: 'device_node_origin',
      eventType,
      timestamp: Date.now(),
      anomalyScore: 0.9,
      consensusScore: 1.0,
      priority,
      ttl: initialTTL,
      hopCount: 0,
      createdAt: Date.now(),
    };

    lastPacketRef.current = packet;
    setHasSentPacket(true);

    await engineRef.current.ingestLocalPacket(packet);
    updateState();
  };

  const handleSendDuplicate = async () => {
    if (!engineRef.current || !lastPacketRef.current) return;
    await engineRef.current.forwardPacket(lastPacketRef.current);
    updateState();
  };

  const handleSendExpired = async () => {
    if (!engineRef.current) return;
    const expired: RescuePacket = {
      packetId: `pkt_${uuidv4()}`,
      senderId: 'device_node_origin',
      eventType: 'GENERAL_EMERGENCY',
      timestamp: Date.now(),
      anomalyScore: 0.5,
      consensusScore: 0.5,
      priority: 'LOW',
      ttl: 0,
      hopCount: 5,
      createdAt: Date.now(),
    };

    await engineRef.current.forwardPacket(expired);
    updateState();
  };

  const handleSendBatch = async () => {
    if (!engineRef.current) return;
    
    // Send Low, Medium, High, Critical in random order to demonstrate priority sorting
    const priorities: Priority[] = ['LOW', 'CRITICAL', 'MEDIUM', 'HIGH'];
    for (const p of priorities) {
      const pkt: RescuePacket = {
        packetId: `pkt_${uuidv4()}`,
        senderId: 'device_node_origin',
        eventType: p === 'CRITICAL' ? 'SOS' : 'GENERAL_EMERGENCY',
        timestamp: Date.now(),
        anomalyScore: 0.8,
        consensusScore: 0.8,
        priority: p,
        ttl: 5,
        hopCount: 0,
        createdAt: Date.now(),
      };
      await engineRef.current.ingestLocalPacket(pkt);
    }
    setHasSentPacket(true);
    updateState();
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Store-Carry-Forward Routing Simulator</h2>
        <p className="text-sm text-gray-500 mt-1">
          Demonstrates asynchronous store-and-carry when disconnected, and opportunistic priority queue drain upon relay connection.
        </p>
      </div>

      {/* Network Relay Connection Toggle */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <span className="text-xs font-bold uppercase text-gray-400 block tracking-wider">Gateway / Relay Link</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`w-3 h-3 rounded-full ${isRelayConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-bold text-gray-800 text-lg">
              {isRelayConnected ? 'RELAY CONNECTED (Opportunistic Forward)' : 'DISCONNECTED (Store & Carry)'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isRelayConnected 
              ? 'Transmitting packets in strict priority order (CRITICAL > HIGH > MEDIUM > LOW).' 
              : 'No gateway in range. Packets are stored locally in IndexedDB as PENDING.'}
          </p>
        </div>

        <button
          onClick={handleToggleConnection}
          className={`px-5 py-3 rounded-xl font-bold text-sm shadow-sm transition ${
            isRelayConnected 
              ? 'bg-red-100 hover:bg-red-200 text-red-700' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isRelayConnected ? '⚡ Disconnect Relay' : '📶 Connect Relay'}
        </button>
      </div>

      {/* Origin Control Panel */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Generate Emergency Packets</h3>
        
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Event Type</label>
            <select 
              value={eventType} 
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full p-2 border rounded-lg text-sm bg-gray-50"
            >
              <option value="SOS">SOS</option>
              <option value="STRUCTURAL_COLLAPSE">STRUCTURAL_COLLAPSE</option>
              <option value="STAMPEDE">STAMPEDE</option>
              <option value="FIRE">FIRE</option>
              <option value="FLOOD">FLOOD</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full p-2 border rounded-lg text-sm bg-gray-50"
            >
              <option value="CRITICAL">CRITICAL (Top)</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">TTL</label>
            <input 
              type="number" 
              min="1" 
              max="10" 
              value={initialTTL} 
              onChange={(e) => setInitialTTL(Number(e.target.value))}
              className="w-full p-2 border rounded-lg text-sm bg-gray-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2">
          <button 
            onClick={handleSendPacket}
            className="py-3 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm text-xs"
          >
            🚨 Ingest Packet
          </button>
          
          <button 
            onClick={handleSendBatch}
            className="py-3 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm text-xs"
          >
            📦 Ingest 4 Priorities
          </button>

          <button 
            onClick={handleSendDuplicate}
            disabled={!hasSentPacket}
            className="py-3 px-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl shadow-sm text-xs"
          >
            🔄 Send Duplicate
          </button>

          <button 
            onClick={handleSendExpired}
            className="py-3 px-3 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-xl shadow-sm text-xs"
          >
            ⏱️ Send TTL=0
          </button>
        </div>
      </div>

      {/* Two Columns: Local Priority Queue vs Destination Gateway Inbox */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Origin Local Priority Queue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-gray-800 text-sm">
              📥 Local Storage Queue ({queuedPackets.length})
            </h4>
            <span className="text-xs bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded">
              PENDING
            </span>
          </div>

          {queuedPackets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs border border-dashed rounded-lg">
              Queue is empty.
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {queuedPackets.map((pkt) => (
                <div key={pkt.packetId} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">{pkt.packetId.slice(0, 10)}...</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      pkt.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      pkt.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      pkt.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {pkt.priority}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-[11px]">
                    <span>Event: <strong>{pkt.eventType}</strong></span>
                    <span>TTL: <strong>{pkt.ttl}</strong> | Hops: <strong>{pkt.hopCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Destination Gateway Inbox */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-gray-800 text-sm">
              🏁 Gateway Command Inbox ({gatewayInbox.length})
            </h4>
            <span className="text-xs bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded">
              DELIVERED
            </span>
          </div>

          {gatewayInbox.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs border border-dashed rounded-lg">
              No delivered packets yet. Connect relay to drain queue.
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {gatewayInbox.map((pkt, idx) => (
                <div key={`${pkt.packetId}-${idx}`} className="p-3 bg-green-50 rounded-lg border border-green-200 text-xs font-mono space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-900">{pkt.packetId.slice(0, 10)}...</span>
                    <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded font-bold">
                      {pkt.priority}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-700 text-[11px]">
                    <span>Event: <strong>{pkt.eventType}</strong></span>
                    <span>Hops: <strong>{pkt.hopCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Routing Action Stream */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Live Protocol Audit Stream</h3>
          <button onClick={() => setEvents([])} className="text-xs text-gray-500 hover:text-red-600">Clear</button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm border border-dashed rounded-lg">
            No events logged yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {events.map((evt, idx) => (
              <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    evt.action === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                    evt.action === 'TRANSMITTING' ? 'bg-blue-100 text-blue-800' :
                    evt.action === 'STORED_PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    evt.action === 'DROP_DUPLICATE' ? 'bg-orange-100 text-orange-800' :
                    evt.action === 'EXPIRED' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {evt.action}
                  </span>
                  <span className="font-bold text-gray-700">{evt.packet.packetId?.slice(0, 8)}...</span>
                  <span className="text-gray-600 font-sans">{evt.details}</span>
                </div>
                <div className="text-gray-400">
                  Priority: <strong className="text-gray-700">{evt.packet.priority}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
