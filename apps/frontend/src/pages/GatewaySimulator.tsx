import { useState, useRef, useEffect } from 'react';
import type { RescuePacket, Priority, EventType } from '@rescuenet/shared';
import type { StoredPacket } from '../storage/db';
import { v4 as uuidv4 } from 'uuid';

type SimGatewayState = 'ONLINE' | 'OFFLINE' | 'BACKHAUL_UNAVAILABLE' | 'SYNCING';

interface GatewayLogEntry {
  id: string;
  timestamp: string;
  action: 'QUEUED_OFFLINE' | 'UPLOADED' | 'SYNCING' | 'DROP_DUPLICATE' | 'INTERNET_STATE_CHANGE' | 'RETRY';
  packetId?: string;
  priority?: Priority;
  details: string;
}

export function GatewaySimulator() {
  const [isInternetOn, setIsInternetOn] = useState<boolean>(true);
  const [gatewayState, setGatewayState] = useState<SimGatewayState>('ONLINE');
  const [receivedCount, setReceivedCount] = useState<number>(0);
  const [pendingPackets, setPendingPackets] = useState<StoredPacket[]>([]);
  const [uploadedPackets, setUploadedPackets] = useState<StoredPacket[]>([]);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [logs, setLogs] = useState<GatewayLogEntry[]>([]);
  
  const [eventType, setEventType] = useState<EventType>('SOS');
  const [priority, setPriority] = useState<Priority>('CRITICAL');
  const [hasSentPacket, setHasSentPacket] = useState<boolean>(false);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const lastSentPacketRef = useRef<RescuePacket | null>(null);

  // Sync / drain queue whenever internet turns ON
  useEffect(() => {
    if (isInternetOn && pendingPackets.length > 0) {
      setGatewayState('SYNCING');
      
      const timer = setTimeout(() => {
        // Drain pending queue to uploaded
        const toUpload = [...pendingPackets];
        setUploadedPackets(prev => [...toUpload, ...prev]);
        setPendingPackets([]);
        setGatewayState('ONLINE');

        setLogs(prev => [{
          id: uuidv4(),
          timestamp: new Date().toLocaleTimeString(),
          action: 'SYNCING',
          details: `Backhaul restored: Synced ${toUpload.length} pending packets to Command Center database`,
        }, ...prev]);
      }, 600);

      return () => clearTimeout(timer);
    } else if (isInternetOn) {
      setGatewayState('ONLINE');
    } else {
      setGatewayState('BACKHAUL_UNAVAILABLE');
    }
  }, [isInternetOn, pendingPackets]);

  const handleToggleInternet = (enable: boolean) => {
    setIsInternetOn(enable);
    setLogs(prev => [{
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString(),
      action: 'INTERNET_STATE_CHANGE',
      details: enable 
        ? '⚡ Internet Restored: Backhaul uplink connected to backend' 
        : '🔌 Internet Disconnected: Backhaul unavailable, queuing locally',
    }, ...prev]);
  };

  const handleIngestPacket = (chosenPriority?: Priority, chosenEvent?: EventType) => {
    const p = chosenPriority || priority;
    const evt = chosenEvent || eventType;

    const packet: RescuePacket = {
      packetId: `pkt_${uuidv4()}`,
      senderId: 'field_device_node',
      eventType: evt,
      timestamp: Date.now(),
      anomalyScore: 0.9,
      consensusScore: 1.0,
      priority: p,
      ttl: 5,
      hopCount: 1,
      createdAt: Date.now(),
    };

    lastSentPacketRef.current = packet;
    setHasSentPacket(true);
    setReceivedCount(prev => prev + 1);
    seenIdsRef.current.add(packet.packetId);

    const storedPacket: StoredPacket = {
      ...packet,
      state: isInternetOn ? 'DELIVERED' : 'PENDING',
      retryCount: 0,
      lastAttemptAt: Date.now(),
    };

    if (isInternetOn) {
      // Upload immediately
      setUploadedPackets(prev => [storedPacket, ...prev]);
      setLogs(prev => [{
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString(),
        action: 'UPLOADED',
        packetId: packet.packetId.slice(0, 8),
        priority: packet.priority,
        details: `Direct upload to Command Center: ${packet.eventType} (${packet.priority})`,
      }, ...prev]);
    } else {
      // Queue locally in Gateway Local Storage
      setPendingPackets(prev => {
        const updated = [...prev, storedPacket];
        // Sort priority in pending queue
        const pWeight = (val: Priority) => (val === 'CRITICAL' ? 4 : val === 'HIGH' ? 3 : val === 'MEDIUM' ? 2 : 1);
        return updated.sort((a, b) => pWeight(b.priority) - pWeight(a.priority));
      });
      setLogs(prev => [{
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString(),
        action: 'QUEUED_OFFLINE',
        packetId: packet.packetId.slice(0, 8),
        priority: packet.priority,
        details: `Internet offline: Queued in gateway storage as PENDING (${packet.priority})`,
      }, ...prev]);
    }
  };

  const handleSendDuplicate = () => {
    if (!lastSentPacketRef.current) return;
    const dup = lastSentPacketRef.current;
    setReceivedCount(prev => prev + 1);
    setDuplicateCount(prev => prev + 1);

    setLogs(prev => [{
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString(),
      action: 'DROP_DUPLICATE',
      packetId: dup.packetId.slice(0, 8),
      details: `Duplicate packet ${dup.packetId.slice(0, 8)} dropped (already seen)`,
    }, ...prev]);
  };

  const handleSendBatch = () => {
    const batch: Priority[] = ['LOW', 'CRITICAL', 'MEDIUM', 'HIGH'];
    for (const p of batch) {
      handleIngestPacket(p, p === 'CRITICAL' ? 'SOS' : 'GENERAL_EMERGENCY');
    }
  };

  const handleClearAll = () => {
    setReceivedCount(0);
    setPendingPackets([]);
    setUploadedPackets([]);
    setFailedCount(0);
    setDuplicateCount(0);
    setLogs([]);
    seenIdsRef.current.clear();
    setHasSentPacket(false);
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">RescuENet Gateway Service Simulator</h2>
        <p className="text-sm text-gray-500 mt-1">
          Simulates local field packet ingestion, persistent offline queueing, and automatic backend backhaul synchronization.
        </p>
      </div>

      {/* Gateway Status Header & Internet Controls */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold uppercase text-gray-400 block tracking-wider">Gateway Microservice</span>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`w-3 h-3 rounded-full ${
                gatewayState === 'ONLINE' ? 'bg-green-500 animate-pulse' :
                gatewayState === 'SYNCING' ? 'bg-purple-500 animate-spin' :
                gatewayState === 'BACKHAUL_UNAVAILABLE' ? 'bg-orange-500' : 'bg-red-500'
              }`} />
              <span className="font-bold text-gray-800 text-lg">
                State: <span className="font-mono">{gatewayState}</span>
              </span>
            </div>
          </div>

          {/* Controls: [ INTERNET ON ] [ INTERNET OFF ] */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleToggleInternet(true)}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition ${
                isInternetOn 
                  ? 'bg-green-600 text-white ring-2 ring-green-400' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              🌐 INTERNET ON
            </button>
            <button
              onClick={() => handleToggleInternet(false)}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition ${
                !isInternetOn 
                  ? 'bg-red-600 text-white ring-2 ring-red-400' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              🔌 INTERNET OFF
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 border-t pt-3">
          {isInternetOn
            ? '✅ Backhaul uplink is active. Packets received from the mesh are uploaded directly to the backend Command Center.'
            : '⚠️ Backhaul unavailable. Gateway stores incoming packets in local storage as PENDING and automatically drains when internet returns.'}
        </p>
      </div>

      {/* 4-Metric Display Grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
          <span className="text-xs text-gray-500 font-bold uppercase block">Received</span>
          <span className="text-3xl font-bold text-gray-800 font-mono mt-1 block">{receivedCount}</span>
          <span className="text-[11px] text-gray-400 mt-1 block">Mesh Packets</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-yellow-200 bg-yellow-50 shadow-sm text-center">
          <span className="text-xs text-yellow-800 font-bold uppercase block">Pending Queue</span>
          <span className="text-3xl font-bold text-yellow-700 font-mono mt-1 block">{pendingPackets.length}</span>
          <span className="text-[11px] text-yellow-600 mt-1 block">Awaiting Upload</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-green-200 bg-green-50 shadow-sm text-center">
          <span className="text-xs text-green-800 font-bold uppercase block">Uploaded</span>
          <span className="text-3xl font-bold text-green-700 font-mono mt-1 block">{uploadedPackets.length}</span>
          <span className="text-[11px] text-green-600 mt-1 block">In Cloud Backend</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50 shadow-sm text-center">
          <span className="text-xs text-red-800 font-bold uppercase block">Failed / Dup</span>
          <span className="text-3xl font-bold text-red-700 font-mono mt-1 block">{failedCount + duplicateCount}</span>
          <span className="text-[11px] text-red-600 mt-1 block">{duplicateCount} duplicates</span>
        </div>
      </div>

      {/* Ingestion & Simulation Controls */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Ingest Packets From Mesh Nodes</h3>
          <button onClick={handleClearAll} className="text-xs text-gray-400 hover:text-red-600">Reset Metrics</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              <option value="BEHAVIORAL_ANOMALY">BEHAVIORAL_ANOMALY</option>
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
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1">
          <button
            onClick={() => handleIngestPacket()}
            className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm text-sm"
          >
            🚨 Ingest Packet
          </button>
          
          <button
            onClick={handleSendBatch}
            className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm text-sm"
          >
            📦 Ingest 4 Priorities
          </button>

          <button
            onClick={handleSendDuplicate}
            disabled={!hasSentPacket}
            className="py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl shadow-sm text-sm"
          >
            🔄 Send Duplicate
          </button>
        </div>
      </div>

      {/* Two Column Storage View: Gateway Local Queue vs Cloud Backend */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Gateway Local Pending Storage */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-gray-800 text-sm">
              💾 Gateway Local Storage ({pendingPackets.length})
            </h4>
            <span className="text-xs bg-yellow-100 text-yellow-800 font-bold px-2 py-0.5 rounded font-mono">
              PENDING
            </span>
          </div>

          {pendingPackets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs border border-dashed rounded-lg">
              No pending packets stored.
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {pendingPackets.map((pkt) => (
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
                    <span>State: <strong>PENDING</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cloud Backend Command Center */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-bold text-gray-800 text-sm">
              ☁️ Command Center Database ({uploadedPackets.length})
            </h4>
            <span className="text-xs bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded font-mono">
              UPLOADED
            </span>
          </div>

          {uploadedPackets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs border border-dashed rounded-lg">
              No uploaded packets.
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {uploadedPackets.map((pkt, idx) => (
                <div key={`${pkt.packetId}-${idx}`} className="p-3 bg-green-50 rounded-lg border border-green-200 text-xs font-mono space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-900">{pkt.packetId.slice(0, 10)}...</span>
                    <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded font-bold">
                      {pkt.priority}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-700 text-[11px]">
                    <span>Event: <strong>{pkt.eventType}</strong></span>
                    <span>Status: <strong>UPLOADED</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gateway Audit Event Stream */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Gateway Activity Log</h3>
          <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-red-600">Clear</button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm border border-dashed rounded-lg">
            No gateway activity logged yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">{log.timestamp}</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    log.action === 'UPLOADED' ? 'bg-green-100 text-green-800' :
                    log.action === 'SYNCING' ? 'bg-purple-100 text-purple-800' :
                    log.action === 'QUEUED_OFFLINE' ? 'bg-yellow-100 text-yellow-800' :
                    log.action === 'DROP_DUPLICATE' ? 'bg-orange-100 text-orange-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-gray-700 font-sans">{log.details}</span>
                </div>
                {log.priority && (
                  <div className="text-gray-500">
                    Priority: <strong className="text-gray-700">{log.priority}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
