import { useState, useRef, useEffect } from 'react';
import { MeshManager } from '../network/MeshManager';
import type { PacketProcessingResult } from '../network/MeshManager';
import type { TransportAdapter } from '../network/transports/TransportAdapter';
import type { RescuePacket, Priority, EventType } from '@rescuenet/shared';
import { v4 as uuidv4 } from 'uuid';

// In-browser loopback transport for simulator nodes
class SimLoopbackTransport implements TransportAdapter {
  readonly name = 'SimLoopback';
  private target: SimLoopbackTransport | null = null;
  private onPacketHandler: ((p: RescuePacket) => void) | null = null;

  connectTo(other: SimLoopbackTransport) {
    this.target = other;
    other.target = this;
  }

  async initialize(): Promise<void> {}
  async startListening(handler: (p: RescuePacket) => void): Promise<void> {
    this.onPacketHandler = handler;
  }
  async stopListening(): Promise<void> {
    this.onPacketHandler = null;
  }
  async discover(): Promise<string[]> {
    return this.target ? ['sim_peer'] : [];
  }
  async sendPacket(packet: RescuePacket): Promise<boolean> {
    if (this.target && this.target.onPacketHandler) {
      setTimeout(() => {
        this.target?.onPacketHandler?.(packet);
      }, 400); // 400ms visual transmission delay
      return true;
    }
    return false;
  }
  async receivePacket(): Promise<RescuePacket | null> {
    return null;
  }
  getStatus() {
    return 'connected' as const;
  }
  async disconnect(): Promise<void> {}
}

interface LogEntry {
  id: string;
  timestamp: string;
  node: string;
  action: PacketProcessingResult | 'CREATED';
  packetId: string;
  ttl: number;
  hopCount: number;
  priority: Priority;
  details: string;
}

export function TransportSimulator() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activePacket, setActivePacket] = useState<RescuePacket | null>(null);
  const [priority, setPriority] = useState<Priority>('CRITICAL');
  const [eventType, setEventType] = useState<EventType>('SOS');
  const [initialTTL, setInitialTTL] = useState<number>(5);
  const [currentNodeActive, setCurrentNodeActive] = useState<string | null>(null);
  const [hasSentPacket, setHasSentPacket] = useState<boolean>(false);

  // MeshManager instances for each node
  const nodesRef = useRef<{
    nodeA: MeshManager;
    nodeB: MeshManager;
    nodeC: MeshManager;
    gateway: MeshManager;
  } | null>(null);

  const lastSentPacketRef = useRef<RescuePacket | null>(null);

  useEffect(() => {
    // 1. Instantiate 4 real MeshManager nodes
    const nodeA = new MeshManager('NODE_A');
    const nodeB = new MeshManager('NODE_B');
    const nodeC = new MeshManager('NODE_C');
    const gateway = new MeshManager('GATEWAY', true);

    // 2. Wire transport links: A <-> B <-> C <-> Gateway
    const tA_B = new SimLoopbackTransport();
    const tB_A = new SimLoopbackTransport();
    tA_B.connectTo(tB_A);

    const tB_C = new SimLoopbackTransport();
    const tC_B = new SimLoopbackTransport();
    tB_C.connectTo(tC_B);

    const tC_GW = new SimLoopbackTransport();
    const tGW_C = new SimLoopbackTransport();
    tC_GW.connectTo(tGW_C);

    nodeA.registerTransport(tA_B);
    nodeB.registerTransport(tB_A);
    nodeB.registerTransport(tB_C);
    nodeC.registerTransport(tC_B);
    nodeC.registerTransport(tC_GW);
    gateway.registerTransport(tGW_C);

    // 3. Attach listeners to log packet actions in the UI
    const attachLogger = (manager: MeshManager) => {
      manager.onPacket((packet, action) => {
        setCurrentNodeActive(manager.nodeId);
        setActivePacket({ ...packet });

        const entry: LogEntry = {
          id: uuidv4(),
          timestamp: new Date().toLocaleTimeString(),
          node: manager.nodeId,
          action,
          packetId: packet.packetId.slice(0, 8),
          ttl: packet.ttl,
          hopCount: packet.hopCount,
          priority: packet.priority,
          details: 
            action === 'DELIVERED' ? 'Successfully reached destination Gateway!' :
            action === 'FORWARDED' ? `Forwarded to next hop (TTL: ${packet.ttl})` :
            action === 'DROP_DUPLICATE' ? 'Duplicate packet dropped' :
            action === 'EXPIRED' ? 'Packet dropped because TTL expired' : action,
        };

        setLogs(prev => [entry, ...prev.slice(0, 40)]);
      });
    };

    attachLogger(nodeA);
    attachLogger(nodeB);
    attachLogger(nodeC);
    attachLogger(gateway);

    nodeA.initialize();
    nodeB.initialize();
    nodeC.initialize();
    gateway.initialize();

    nodesRef.current = { nodeA, nodeB, nodeC, gateway };
  }, []);

  const handleSendNewPacket = async () => {
    if (!nodesRef.current) return;

    const packet: RescuePacket = {
      packetId: `pkt_${uuidv4()}`,
      senderId: 'device_node_a',
      eventType,
      timestamp: Date.now(),
      anomalyScore: 0.95,
      consensusScore: 1.0,
      priority,
      ttl: initialTTL,
      hopCount: 0,
      createdAt: Date.now(),
    };

    lastSentPacketRef.current = packet;
    setHasSentPacket(true);
    setCurrentNodeActive('NODE_A');
    setActivePacket(packet);

    setLogs(prev => [{
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString(),
      node: 'NODE_A',
      action: 'CREATED',
      packetId: packet.packetId.slice(0, 8),
      ttl: packet.ttl,
      hopCount: 0,
      priority: packet.priority,
      details: `Originating new ${packet.eventType} (${packet.priority}) on Node A`,
    }, ...prev]);

    await nodesRef.current.nodeA.createAndSendPacket(packet);
  };

  const handleSendDuplicate = async () => {
    if (!nodesRef.current || !lastSentPacketRef.current) return;
    const dup = { ...lastSentPacketRef.current };
    
    setLogs(prev => [{
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString(),
      node: 'NODE_B',
      action: 'CREATED',
      packetId: dup.packetId.slice(0, 8),
      ttl: dup.ttl,
      hopCount: dup.hopCount,
      priority: dup.priority,
      details: `Re-injecting duplicate packet ${dup.packetId.slice(0, 8)} into Node B`,
    }, ...prev]);

    await nodesRef.current.nodeB.handleIncomingPacket(dup);
  };

  const handleSendExpired = async () => {
    if (!nodesRef.current) return;
    const expired: RescuePacket = {
      packetId: `pkt_${uuidv4()}`,
      senderId: 'device_node_a',
      eventType: 'GENERAL_EMERGENCY',
      timestamp: Date.now(),
      anomalyScore: 0.8,
      consensusScore: 0.8,
      priority: 'LOW',
      ttl: 0, // Expired TTL
      hopCount: 10,
      createdAt: Date.now(),
    };

    setLogs(prev => [{
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString(),
      node: 'NODE_A',
      action: 'CREATED',
      packetId: expired.packetId.slice(0, 8),
      ttl: 0,
      hopCount: 10,
      priority: 'LOW',
      details: 'Sending packet with TTL = 0 to verify expiration handling',
    }, ...prev]);

    await nodesRef.current.nodeB.handleIncomingPacket(expired);
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Transport & Multi-Hop Simulator</h2>
        <p className="text-sm text-gray-500 mt-1">
          Demonstrates store-and-forward mesh routing across 4 real <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">MeshManager</code> instances (A → B → C → Gateway).
        </p>
      </div>

      {/* Network Topology Visualization */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Multi-Hop Mesh Topology</h3>
        
        <div className="grid grid-cols-4 gap-2 items-center text-center">
          {/* Node A */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            currentNodeActive === 'NODE_A' ? 'border-red-500 bg-red-50 shadow-md scale-105' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="w-10 h-10 mx-auto rounded-full bg-red-600 text-white font-bold flex items-center justify-center mb-2">A</div>
            <div className="font-bold text-gray-800 text-sm">Node A</div>
            <div className="text-xs text-gray-500">Origin Node</div>
          </div>

          {/* Node B */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            currentNodeActive === 'NODE_B' ? 'border-blue-500 bg-blue-50 shadow-md scale-105' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="w-10 h-10 mx-auto rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-2">B</div>
            <div className="font-bold text-gray-800 text-sm">Node B</div>
            <div className="text-xs text-gray-500">Mesh Relay 1</div>
          </div>

          {/* Node C */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            currentNodeActive === 'NODE_C' ? 'border-indigo-500 bg-indigo-50 shadow-md scale-105' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="w-10 h-10 mx-auto rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center mb-2">C</div>
            <div className="font-bold text-gray-800 text-sm">Node C</div>
            <div className="text-xs text-gray-500">Mesh Relay 2</div>
          </div>

          {/* Gateway */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            currentNodeActive === 'GATEWAY' ? 'border-green-500 bg-green-50 shadow-md scale-105' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="w-10 h-10 mx-auto rounded-full bg-green-600 text-white font-bold flex items-center justify-center mb-2">GW</div>
            <div className="font-bold text-gray-800 text-sm">Gateway</div>
            <div className="text-xs text-gray-500">Command Center</div>
          </div>
        </div>

        {activePacket && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg text-white text-xs font-mono flex justify-between items-center">
            <span>In-Transit: <strong className="text-yellow-400">{activePacket.packetId.slice(0, 10)}...</strong> ({activePacket.eventType})</span>
            <span>TTL: <strong className="text-red-400">{activePacket.ttl}</strong> | Hops: <strong className="text-green-400">{activePacket.hopCount}</strong> | Priority: <strong className="text-blue-400">{activePacket.priority}</strong></span>
          </div>
        )}
      </div>

      {/* Simulation Controls */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Simulation Controls</h3>
        
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
              <option value="SUDDEN_IMPACT">SUDDEN_IMPACT</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full p-2 border rounded-lg text-sm bg-gray-50"
            >
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Initial TTL</label>
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

        <div className="grid grid-cols-3 gap-3 pt-2">
          <button 
            onClick={handleSendNewPacket}
            className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm text-sm"
          >
            🚀 Send A → B → C → GW
          </button>
          
          <button 
            onClick={handleSendDuplicate}
            disabled={!hasSentPacket}
            className="py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl shadow-sm text-sm"
          >
            🔄 Send Duplicate Packet
          </button>

          <button 
            onClick={handleSendExpired}
            className="py-3 px-4 bg-gray-700 hover:bg-gray-800 text-white font-bold rounded-xl shadow-sm text-sm"
          >
            ⏱️ Send Expired (TTL=0)
          </button>
        </div>
      </div>

      {/* Live Event Stream */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Live Routing Event Stream</h3>
          <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-red-600">Clear Logs</button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm border border-dashed rounded-lg">
            No packets routed yet. Click "Send A → B → C → GW" to simulate!
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">{log.timestamp}</span>
                  <span className="font-bold px-2 py-0.5 rounded bg-gray-800 text-white">{log.node}</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    log.action === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                    log.action === 'FORWARDED' ? 'bg-blue-100 text-blue-800' :
                    log.action === 'DROP_DUPLICATE' ? 'bg-orange-100 text-orange-800' :
                    log.action === 'EXPIRED' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-gray-700 font-sans">{log.details}</span>
                </div>
                <div className="text-gray-500 flex space-x-2">
                  <span>TTL: <strong>{log.ttl}</strong></span>
                  <span>Hops: <strong>{log.hopCount}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
