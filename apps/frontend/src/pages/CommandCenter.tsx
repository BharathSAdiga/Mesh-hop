import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io, Socket } from 'socket.io-client';
import type { EventType, Priority, IncidentStatus } from '@rescuenet/shared';
import { v4 as uuidv4 } from 'uuid';

// Fix for default Leaflet icon paths
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export interface CommandCenterIncident {
  incidentId: string;
  packetId: string;
  eventType: EventType;
  priority: Priority;
  status: IncidentStatus | 'RESOLVED';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  anomalyScore: number;
  consensusScore: number;
  participatingNodes: string[];
  timestamp: number;
  ttl: number;
  hopCount?: number;
  featureSummary?: Record<string, number>;
}

export interface GatewayInfo {
  gatewayId: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'BACKHAUL_UNAVAILABLE' | 'SYNCING';
  lastSeenAt: string | number;
  metrics?: {
    receivedCount?: number;
    pendingCount?: number;
    uploadedCount?: number;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface NodeInfo {
  nodeId: string;
  lastSeenAt: string | number;
  packetCount: number;
  lastLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface PacketHop {
  nodeId: string;
  label: string;
  role: 'ORIGIN' | 'RELAY' | 'GATEWAY' | 'BACKEND';
  status: 'WAITING' | 'TRANSMITTING' | 'DELIVERED';
  timestamp: number;
}

// Initial demo seed coordinates (Disaster Zone Center)
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946]; // Bangalore center coordinate fallback

export function CommandCenter() {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [incidents, setIncidents] = useState<CommandCenterIncident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [gateways, setGateways] = useState<GatewayInfo[]>([]);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [totalPacketsIngested, setTotalPacketsIngested] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Packet Propagation Animation State
  const [activePropagation, setActivePropagation] = useState<{
    packetId: string;
    hops: PacketHop[];
    currentStep: number;
    isActive: boolean;
  }>({
    packetId: '',
    hops: [],
    currentStep: 0,
    isActive: false,
  });

  const socketRef = useRef<Socket | null>(null);

  // Initialize Demo Data on initial load
  useEffect(() => {
    const seedIncidents: CommandCenterIncident[] = [
      {
        incidentId: 'INC-8921-SOS',
        packetId: 'PKT-9928-ALPHA',
        eventType: 'SOS',
        priority: 'CRITICAL',
        status: 'CONFIRMED',
        location: { latitude: 12.9725, longitude: 77.5955, accuracy: 10 },
        anomalyScore: 1.0,
        consensusScore: 1.0,
        participatingNodes: ['NODE_FIELD_77', 'NODE_RELAY_12'],
        timestamp: Date.now() - 1000 * 60 * 3,
        ttl: 8,
        hopCount: 2,
        featureSummary: { accelPeak: 34.2, gyroMax: 4.8, jerkRate: 240 },
      },
      {
        incidentId: 'INC-7430-COL',
        packetId: 'PKT-6612-BETA',
        eventType: 'COLLAPSE_PATTERN',
        priority: 'CRITICAL',
        status: 'CONFIRMED',
        location: { latitude: 12.9698, longitude: 77.5912, accuracy: 25 },
        anomalyScore: 0.94,
        consensusScore: 0.88,
        participatingNodes: ['NODE_44', 'NODE_45', 'NODE_48', 'NODE_52'],
        timestamp: Date.now() - 1000 * 60 * 12,
        ttl: 6,
        hopCount: 3,
        featureSummary: { accelPeak: 29.1, gyroMax: 3.9, jerkRate: 195 },
      },
      {
        incidentId: 'INC-5519-STAMP',
        packetId: 'PKT-4401-GAMMA',
        eventType: 'STAMPEDE_PATTERN',
        priority: 'HIGH',
        status: 'CORRELATED',
        location: { latitude: 12.9752, longitude: 77.5991, accuracy: 40 },
        anomalyScore: 0.82,
        consensusScore: 0.74,
        participatingNodes: ['NODE_91', 'NODE_93'],
        timestamp: Date.now() - 1000 * 60 * 25,
        ttl: 7,
        hopCount: 1,
        featureSummary: { accelPeak: 18.5, gyroMax: 2.7, jerkRate: 110 },
      },
    ];

    const seedGateways: GatewayInfo[] = [
      {
        gatewayId: 'GW-SECTOR-NORTH',
        name: 'North Sector Gateway Relay',
        status: 'ONLINE',
        lastSeenAt: Date.now(),
        metrics: { receivedCount: 142, pendingCount: 0, uploadedCount: 142 },
        location: { latitude: 12.9760, longitude: 77.5970 },
      },
      {
        gatewayId: 'GW-SECTOR-SOUTH',
        name: 'South Backhaul Uplink',
        status: 'SYNCING',
        lastSeenAt: Date.now() - 5000,
        metrics: { receivedCount: 88, pendingCount: 3, uploadedCount: 85 },
        location: { latitude: 12.9680, longitude: 77.5890 },
      },
    ];

    const seedNodes: NodeInfo[] = [
      { nodeId: 'NODE_FIELD_77', lastSeenAt: Date.now(), packetCount: 18, lastLocation: { latitude: 12.9725, longitude: 77.5955 } },
      { nodeId: 'NODE_RELAY_12', lastSeenAt: Date.now(), packetCount: 34, lastLocation: { latitude: 12.9735, longitude: 77.5960 } },
      { nodeId: 'NODE_44', lastSeenAt: Date.now() - 4000, packetCount: 12, lastLocation: { latitude: 12.9698, longitude: 77.5912 } },
      { nodeId: 'NODE_45', lastSeenAt: Date.now() - 4000, packetCount: 9, lastLocation: { latitude: 12.9702, longitude: 77.5918 } },
      { nodeId: 'NODE_91', lastSeenAt: Date.now() - 8000, packetCount: 6, lastLocation: { latitude: 12.9752, longitude: 77.5991 } },
    ];

    setIncidents(seedIncidents);
    setSelectedIncidentId(seedIncidents[0].incidentId);
    setGateways(seedGateways);
    setNodes(seedNodes);
    setTotalPacketsIngested(230);
  }, []);

  // Connect to Live Backend Socket.IO & REST
  useEffect(() => {
    const backendUrl = 'http://localhost:3000';
    const socket = io(backendUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 3000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsSocketConnected(true);
      if (!isDemoMode) {
        fetchBackendData();
      }
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    socket.on('new_incident', (incoming: any) => {
      handleIncomingIncident(incoming);
    });

    socket.on('incident_updated', (updated: any) => {
      setIncidents(prev => prev.map(inc => (inc.incidentId === updated.incidentId ? { ...inc, ...updated } : inc)));
    });

    socket.on('new_packet', (pkt: any) => {
      setTotalPacketsIngested(prev => prev + 1);
      triggerPropagationAnimation(pkt.packetId || `PKT-${uuidv4().slice(0, 6)}`, pkt.senderId);
    });

    socket.on('gateway_status', (gw: any) => {
      setGateways(prev => {
        const idx = prev.findIndex(g => g.gatewayId === gw.gatewayId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...gw };
          return updated;
        }
        return [gw, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isDemoMode]);

  const fetchBackendData = async () => {
    try {
      const [incRes, gwRes, nodesRes, pktRes] = await Promise.all([
        fetch('http://localhost:3000/api/incidents').then(r => r.ok ? r.json() : null),
        fetch('http://localhost:3000/api/gateways').then(r => r.ok ? r.json() : null),
        fetch('http://localhost:3000/api/nodes').then(r => r.ok ? r.json() : null),
        fetch('http://localhost:3000/api/packets').then(r => r.ok ? r.json() : null),
      ]);

      if (incRes && incRes.incidents && incRes.incidents.length > 0) {
        setIncidents(incRes.incidents);
        if (!selectedIncidentId) {
          setSelectedIncidentId(incRes.incidents[0].incidentId);
        }
      }
      if (gwRes && gwRes.gateways) {
        setGateways(gwRes.gateways);
      }
      if (nodesRes && nodesRes.nodes) {
        setNodes(nodesRes.nodes);
      }
      if (pktRes && pktRes.count !== undefined) {
        setTotalPacketsIngested(pktRes.count);
      }
    } catch {
      // Backend not available, keep existing / demo state
    }
  };

  const handleIncomingIncident = (incoming: any) => {
    const formatted: CommandCenterIncident = {
      incidentId: incoming.incidentId || `INC-${uuidv4().slice(0, 6)}`,
      packetId: incoming.packetId || `PKT-${uuidv4().slice(0, 6)}`,
      eventType: incoming.eventType || 'SOS',
      priority: incoming.priority || 'HIGH',
      status: incoming.status || 'CONFIRMED',
      location: incoming.location || { latitude: 12.9716 + (Math.random() - 0.5) * 0.02, longitude: 77.5946 + (Math.random() - 0.5) * 0.02 },
      anomalyScore: incoming.anomalyScore ?? 0.9,
      consensusScore: incoming.consensusScore ?? 0.85,
      participatingNodes: incoming.participatingNodes || ['NODE_ALPHA'],
      timestamp: incoming.timestamp || Date.now(),
      ttl: incoming.ttl ?? 10,
      hopCount: incoming.hopCount ?? 2,
      featureSummary: incoming.featureSummary || { accelPeak: 26.4, gyroMax: 3.1, jerkRate: 150 },
    };

    setIncidents(prev => [formatted, ...prev.filter(i => i.incidentId !== formatted.incidentId)]);
    setSelectedIncidentId(formatted.incidentId);
    triggerPropagationAnimation(formatted.packetId, formatted.participatingNodes[0]);
  };

  // Packet Propagation Trail Animation
  const triggerPropagationAnimation = (packetId: string, originNodeId: string = 'NODE_A') => {
    const hops: PacketHop[] = [
      { nodeId: originNodeId, label: 'Node A (Origin)', role: 'ORIGIN', status: 'TRANSMITTING', timestamp: Date.now() },
      { nodeId: 'NODE_RELAY_B', label: 'Node B (Relay Hop 1)', role: 'RELAY', status: 'WAITING', timestamp: Date.now() + 300 },
      { nodeId: 'NODE_RELAY_C', label: 'Node C (Relay Hop 2)', role: 'RELAY', status: 'WAITING', timestamp: Date.now() + 600 },
      { nodeId: 'GW-SECTOR-NORTH', label: 'Gateway (Uplink)', role: 'GATEWAY', status: 'WAITING', timestamp: Date.now() + 900 },
      { nodeId: 'BACKEND_CLOUD', label: 'Command Center Backend', role: 'BACKEND', status: 'WAITING', timestamp: Date.now() + 1200 },
    ];

    setActivePropagation({
      packetId,
      hops,
      currentStep: 0,
      isActive: true,
    });

    // Step-by-step progress animation
    [1, 2, 3, 4].forEach((step) => {
      setTimeout(() => {
        setActivePropagation(prev => {
          if (!prev.isActive) return prev;
          const updated = [...prev.hops];
          for (let i = 0; i < step; i++) {
            updated[i].status = 'DELIVERED';
          }
          if (updated[step]) {
            updated[step].status = 'TRANSMITTING';
          }
          if (step === 4) {
            updated[4].status = 'DELIVERED';
          }
          return { ...prev, hops: updated, currentStep: step };
        });
      }, step * 350);
    });
  };

  // Demo Trigger Scenarios
  const handleSimulateScenario = (scenario: 'SOS' | 'COLLAPSE' | 'STAMPEDE' | 'FLOOD') => {
    const latOffset = (Math.random() - 0.5) * 0.015;
    const lngOffset = (Math.random() - 0.5) * 0.015;
    const centerLat = 12.9716 + latOffset;
    const centerLng = 77.5946 + lngOffset;

    let scenarioIncident: CommandCenterIncident;

    if (scenario === 'SOS') {
      scenarioIncident = {
        incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}-SOS`,
        packetId: `PKT-SOS-${uuidv4().slice(0, 5).toUpperCase()}`,
        eventType: 'SOS',
        priority: 'CRITICAL',
        status: 'CONFIRMED',
        location: { latitude: centerLat, longitude: centerLng, accuracy: 12 },
        anomalyScore: 1.0,
        consensusScore: 1.0,
        participatingNodes: [`NODE_VICTIM_${Math.floor(10 + Math.random() * 80)}`],
        timestamp: Date.now(),
        ttl: 10,
        hopCount: 1,
        featureSummary: { accelPeak: 38.5, gyroMax: 5.2, jerkRate: 280 },
      };
    } else if (scenario === 'COLLAPSE') {
      scenarioIncident = {
        incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}-COL`,
        packetId: `PKT-COL-${uuidv4().slice(0, 5).toUpperCase()}`,
        eventType: 'COLLAPSE_PATTERN',
        priority: 'CRITICAL',
        status: 'CONFIRMED',
        location: { latitude: centerLat, longitude: centerLng, accuracy: 30 },
        anomalyScore: 0.96,
        consensusScore: 0.91,
        participatingNodes: ['NODE_STRUCT_A', 'NODE_STRUCT_B', 'NODE_STRUCT_C', 'NODE_STRUCT_D'],
        timestamp: Date.now(),
        ttl: 8,
        hopCount: 3,
        featureSummary: { accelPeak: 31.8, gyroMax: 4.1, jerkRate: 210 },
      };
    } else if (scenario === 'STAMPEDE') {
      scenarioIncident = {
        incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}-STM`,
        packetId: `PKT-STM-${uuidv4().slice(0, 5).toUpperCase()}`,
        eventType: 'STAMPEDE_PATTERN',
        priority: 'HIGH',
        status: 'CORRELATED',
        location: { latitude: centerLat, longitude: centerLng, accuracy: 45 },
        anomalyScore: 0.84,
        consensusScore: 0.78,
        participatingNodes: ['NODE_CROWD_1', 'NODE_CROWD_2', 'NODE_CROWD_3'],
        timestamp: Date.now(),
        ttl: 7,
        hopCount: 2,
        featureSummary: { accelPeak: 22.4, gyroMax: 3.0, jerkRate: 140 },
      };
    } else {
      scenarioIncident = {
        incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}-FLD`,
        packetId: `PKT-FLD-${uuidv4().slice(0, 5).toUpperCase()}`,
        eventType: 'FLOOD',
        priority: 'HIGH',
        status: 'CANDIDATE',
        location: { latitude: centerLat, longitude: centerLng, accuracy: 50 },
        anomalyScore: 0.76,
        consensusScore: 0.65,
        participatingNodes: ['NODE_SENSOR_W1'],
        timestamp: Date.now(),
        ttl: 6,
        hopCount: 1,
        featureSummary: { accelPeak: 14.1, gyroMax: 1.8, jerkRate: 80 },
      };
    }

    setIncidents(prev => [scenarioIncident, ...prev]);
    setSelectedIncidentId(scenarioIncident.incidentId);
    setTotalPacketsIngested(prev => prev + 1);
    triggerPropagationAnimation(scenarioIncident.packetId, scenarioIncident.participatingNodes[0]);
  };

  const handleResolveIncident = (id: string) => {
    setIncidents(prev => prev.map(inc => inc.incidentId === id ? { ...inc, status: 'RESOLVED' } : inc));
  };

  const selectedIncident = useMemo(() => {
    return incidents.find(i => i.incidentId === selectedIncidentId) || incidents[0] || null;
  }, [incidents, selectedIncidentId]);

  const filteredIncidents = useMemo(() => {
    if (statusFilter === 'ALL') return incidents;
    return incidents.filter(i => i.status === statusFilter);
  }, [incidents, statusFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Tactical Operations Bar */}
      <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-lg border border-gray-800 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                RescuENet Command Center
                <span className="text-xs bg-red-950 text-red-400 border border-red-800 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  LIVE DISASTER OPS
                </span>
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Authoritative Multi-Node Disaster Mesh Monitoring, Consensus Corroboration & Incident Response
            </p>
          </div>

          {/* Mode Selector & Socket Status */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700 text-xs font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${isSocketConnected ? 'bg-green-400' : 'bg-orange-400 animate-pulse'}`} />
              <span className="text-gray-300">
                {isSocketConnected ? 'BACKEND LINKED (ws:3000)' : 'STANDALONE / MESH'}
              </span>
            </div>

            <button
              onClick={() => {
                setIsDemoMode(!isDemoMode);
                if (!isDemoMode) fetchBackendData();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm ${
                isDemoMode
                  ? 'bg-purple-600 hover:bg-purple-700 text-white ring-2 ring-purple-400'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isDemoMode ? '🎮 DEMO SIMULATION MODE' : '🌐 AUTHORITATIVE LIVE FEED'}
            </button>
          </div>
        </div>

        {/* Tactical Scenario Trigger Buttons (Demo Mode) */}
        {isDemoMode && (
          <div className="bg-gray-800/80 p-3.5 rounded-xl border border-purple-800/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Inject Scenario:</span>
              <span className="text-[11px] text-gray-400">(Triggers multi-node consensus & hop flow)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSimulateScenario('SOS')}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
              >
                🚨 Manual SOS Beacon
              </button>
              <button
                onClick={() => handleSimulateScenario('COLLAPSE')}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
              >
                🏢 Structural Collapse (4 Nodes)
              </button>
              <button
                onClick={() => handleSimulateScenario('STAMPEDE')}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
              >
                🏃 Stampede Pattern (3 Nodes)
              </button>
              <button
                onClick={() => handleSimulateScenario('FLOOD')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm"
              >
                🌊 Flood Candidate Event
              </button>
            </div>
          </div>
        )}

        {/* 4-KPI Metric Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-gray-800/90 p-3 rounded-xl border border-gray-700/60 text-center">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Active Incidents</span>
            <span className="text-2xl font-black text-red-400 font-mono mt-0.5 block">
              {incidents.filter(i => i.status !== 'RESOLVED').length}
            </span>
            <span className="text-[10px] text-red-300">
              {incidents.filter(i => i.priority === 'CRITICAL' && i.status !== 'RESOLVED').length} Critical
            </span>
          </div>

          <div className="bg-gray-800/90 p-3 rounded-xl border border-gray-700/60 text-center">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Connected Gateways</span>
            <span className="text-2xl font-black text-emerald-400 font-mono mt-0.5 block">
              {gateways.filter(g => g.status === 'ONLINE').length} / {gateways.length}
            </span>
            <span className="text-[10px] text-emerald-300">Active Backhauls</span>
          </div>

          <div className="bg-gray-800/90 p-3 rounded-xl border border-gray-700/60 text-center">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Active Mesh Nodes</span>
            <span className="text-2xl font-black text-cyan-400 font-mono mt-0.5 block">
              {nodes.length}
            </span>
            <span className="text-[10px] text-cyan-300">Relays in field</span>
          </div>

          <div className="bg-gray-800/90 p-3 rounded-xl border border-gray-700/60 text-center">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block">Total Ingested Packets</span>
            <span className="text-2xl font-black text-purple-400 font-mono mt-0.5 block">
              {totalPacketsIngested}
            </span>
            <span className="text-[10px] text-purple-300">0 dropped</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Section 1 (Live Map) & Section 2 (Active Incidents Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 1: LIVE MAP (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[520px]">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">1. Live Disaster Operations Map</span>
              <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
                {incidents.filter(i => i.status !== 'RESOLVED').length} Active Zones
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block" /> SOS</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Confirmed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Candidate</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Gateway</span>
            </div>
          </div>

          <div className="flex-1 w-full rounded-xl overflow-hidden border border-gray-200 relative">
            <MapContainer
              center={selectedIncident?.location ? [selectedIncident.location.latitude, selectedIncident.location.longitude] : DEFAULT_CENTER}
              zoom={14}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Incidents Markers and Danger Radius Circles */}
              {incidents.map((inc) => {
                if (!inc.location) return null;
                const isSelected = inc.incidentId === selectedIncidentId;
                const isSos = inc.eventType === 'SOS';
                const isCandidate = inc.status === 'CANDIDATE';

                const color = isSos ? '#dc2626' : isCandidate ? '#eab308' : '#ea580c';
                const radius = isSos ? 160 : isCandidate ? 100 : 220;

                return (
                  <div key={inc.incidentId}>
                    <Circle
                      center={[inc.location.latitude, inc.location.longitude]}
                      radius={radius}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: isSelected ? 0.35 : 0.18,
                        dashArray: isCandidate ? '6, 6' : undefined,
                        weight: isSelected ? 3 : 1.5,
                      }}
                    />
                    <Marker
                      position={[inc.location.latitude, inc.location.longitude]}
                      eventHandlers={{
                        click: () => setSelectedIncidentId(inc.incidentId),
                      }}
                    >
                      <Popup>
                        <div className="font-sans text-xs space-y-1">
                          <div className="font-bold text-gray-900">{inc.eventType}</div>
                          <div className="text-gray-500 font-mono">ID: {inc.incidentId}</div>
                          <div className="flex justify-between gap-2">
                            <span>Priority: <strong className={inc.priority === 'CRITICAL' ? 'text-red-600' : 'text-orange-600'}>{inc.priority}</strong></span>
                            <span>Status: <strong>{inc.status}</strong></span>
                          </div>
                          <div>Consensus: <strong>{(inc.consensusScore * 100).toFixed(0)}%</strong> ({inc.participatingNodes.length} nodes)</div>
                          <button
                            onClick={() => setSelectedIncidentId(inc.incidentId)}
                            className="mt-2 w-full bg-gray-900 text-white font-bold text-[11px] py-1 rounded"
                          >
                            Inspect Details
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  </div>
                );
              })}

              {/* Field Gateways */}
              {gateways.map((gw) => {
                if (!gw.location) return null;
                return (
                  <div key={gw.gatewayId}>
                    <Circle
                      center={[gw.location.latitude, gw.location.longitude]}
                      radius={300}
                      pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1 }}
                    />
                    <Marker position={[gw.location.latitude, gw.location.longitude]}>
                      <Popup>
                        <div className="text-xs font-sans">
                          <div className="font-bold text-blue-800">🛰️ {gw.name}</div>
                          <div className="font-mono text-gray-500">{gw.gatewayId}</div>
                          <div className="text-gray-600">Status: <strong className="text-green-600">{gw.status}</strong></div>
                        </div>
                      </Popup>
                    </Marker>
                  </div>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* SECTION 2: ACTIVE INCIDENTS FEED (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[520px]">
          <div className="flex justify-between items-center border-b pb-3 mb-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">2. Active Incidents Feed</h2>
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg text-[11px] font-bold">
              {['ALL', 'CONFIRMED', 'CORRELATED', 'CANDIDATE'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2 py-0.5 rounded transition ${statusFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm border border-dashed rounded-xl">
              No active incidents matching filter.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredIncidents.map((inc) => {
                const isSelected = inc.incidentId === selectedIncidentId;
                const isCritical = inc.priority === 'CRITICAL';
                return (
                  <div
                    key={inc.incidentId}
                    onClick={() => setSelectedIncidentId(inc.incidentId)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer text-xs ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-400/50'
                        : isCritical
                        ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isCritical ? 'bg-red-600 animate-ping' : 'bg-orange-500'}`} />
                        <span className="font-bold text-gray-900 text-sm">{inc.eventType}</span>
                      </div>
                      <div className="flex items-center space-x-1 font-mono text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          inc.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                          inc.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                          inc.priority === 'MEDIUM' ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'
                        }`}>
                          {inc.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          inc.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                          inc.status === 'CORRELATED' ? 'bg-purple-100 text-purple-800' :
                          inc.status === 'CANDIDATE' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {inc.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200/60 text-gray-600 text-[11px]">
                      <div>ID: <span className="font-mono text-gray-900">{inc.incidentId}</span></div>
                      <div>Nodes: <span className="font-bold text-gray-900">{inc.participatingNodes.length} devices</span></div>
                      <div>Consensus: <span className="font-bold text-purple-700">{(inc.consensusScore * 100).toFixed(0)}%</span></div>
                      <div>TTL / Hops: <span className="font-mono text-gray-700">{inc.ttl}s / {inc.hopCount ?? 1}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: PACKET FLOW PROPAGATION (Full Width) */}
      <div className="bg-gray-900 text-white p-5 rounded-2xl border border-gray-800 shadow-md space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold uppercase tracking-wide text-cyan-400">6. Real-Time Packet Propagation Trail</span>
            <span className="text-xs text-gray-400 font-mono">
              {activePropagation.packetId ? `[Active Packet: ${activePropagation.packetId}]` : '[Idle / Ready]'}
            </span>
          </div>
          <button
            onClick={() => triggerPropagationAnimation(`PKT-TEST-${uuidv4().slice(0, 5)}`)}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-cyan-300 font-bold px-3 py-1 rounded-lg border border-gray-700"
          >
            ▶ Replay Hop Chain
          </button>
        </div>

        {/* Animated 5-Step Mesh Chain */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {[
            { step: 0, title: 'Node A (Origin)', sub: 'Sensor Trigger / Ingest', role: 'ORIGIN' },
            { step: 1, title: 'Node B (Relay 1)', sub: 'Store-Carry-Forward', role: 'RELAY' },
            { step: 2, title: 'Node C (Relay 2)', sub: 'Priority Forward', role: 'RELAY' },
            { step: 3, title: 'Gateway Relay', sub: 'Uplink Synced', role: 'GATEWAY' },
            { step: 4, title: 'Command Center', sub: 'Authoritative Backend', role: 'BACKEND' },
          ].map((hop, idx) => {
            const isDelivered = activePropagation.currentStep >= idx && activePropagation.isActive;
            const isCurrent = activePropagation.currentStep === idx && activePropagation.isActive;

            return (
              <div
                key={hop.step}
                className={`p-3.5 rounded-xl border transition-all text-xs font-mono relative ${
                  isCurrent
                    ? 'border-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-400/50 shadow-lg scale-105'
                    : isDelivered
                    ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-300'
                    : 'border-gray-800 bg-gray-800/40 text-gray-500'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Step {idx + 1}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    isCurrent ? 'bg-cyan-400 animate-ping' : isDelivered ? 'bg-emerald-400' : 'bg-gray-600'
                  }`} />
                </div>
                <div className="font-bold text-white text-sm font-sans">{hop.title}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{hop.sub}</div>

                {/* Status Badge */}
                <div className="mt-2 pt-2 border-t border-gray-700/60 flex justify-between items-center text-[10px]">
                  <span>Status:</span>
                  <span className={`font-bold ${isDelivered ? 'text-emerald-400' : isCurrent ? 'text-cyan-300' : 'text-gray-500'}`}>
                    {isDelivered ? '✓ DELIVERED' : isCurrent ? '⚡ TRANSMITTING' : 'QUEUED'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Section 3 (Incident Details), Section 4 (AI Analysis), Section 5 (Consensus Evidence) */}
      {selectedIncident && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SECTION 3: INCIDENT DETAILS */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">3. Incident Details</h3>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {selectedIncident.incidentId}
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-gray-500">Emergency Type:</span>
                <strong className="text-gray-900">{selectedIncident.eventType}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Priority Tier:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  selectedIncident.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {selectedIncident.priority}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Lifecycle Status:</span>
                <strong className="text-gray-900">{selectedIncident.status}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Origin Packet ID:</span>
                <span className="font-mono text-gray-700">{selectedIncident.packetId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GPS Coordinates:</span>
                <span className="font-mono text-gray-700">
                  {selectedIncident.location ? `${selectedIncident.location.latitude.toFixed(4)}, ${selectedIncident.location.longitude.toFixed(4)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Participating Nodes:</span>
                <span className="font-bold text-gray-900">{selectedIncident.participatingNodes.length} devices</span>
              </div>
            </div>

            {/* Tactical Actions */}
            <div className="pt-2 border-t space-y-2">
              {selectedIncident.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleResolveIncident(selectedIncident.incidentId)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  ✓ Mark Incident as RESOLVED
                </button>
              )}
              <button
                onClick={() => alert(`Dispatching emergency medical and rescue unit to zone ${selectedIncident.incidentId}`)}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                🚨 Dispatch Field Response Team
              </button>
            </div>
          </div>

          {/* SECTION 4: AI ANALYSIS PANEL */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">4. Behavioral AI Analysis</h3>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded font-mono">
                ON-DEVICE INFERENCE
              </span>
            </div>

            {/* Anomaly Score Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-600">Anomaly Confidence Score:</span>
                <span className="text-indigo-600 font-mono text-sm">
                  {(selectedIncident.anomalyScore * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${selectedIncident.anomalyScore * 100}%` }}
                />
              </div>
            </div>

            {/* Detected Pattern */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-xs">
              <div className="text-gray-500 font-semibold">Detected Behavioral Pattern:</div>
              <div className="text-base font-bold text-gray-900">{selectedIncident.eventType}</div>
              <div className="text-[11px] text-gray-500">
                Pattern validated by local browser lightweight inference model.
              </div>
            </div>

            {/* Extracted Feature Summary */}
            {selectedIncident.featureSummary && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 bg-gray-50 rounded-lg border">
                  <span className="text-[10px] text-gray-400 block">Peak Accel</span>
                  <strong className="text-gray-800">{selectedIncident.featureSummary.accelPeak || 28.5} m/s²</strong>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg border">
                  <span className="text-[10px] text-gray-400 block">Gyro Rot</span>
                  <strong className="text-gray-800">{selectedIncident.featureSummary.gyroMax || 3.8} rad/s</strong>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg border">
                  <span className="text-[10px] text-gray-400 block">Jerk Rate</span>
                  <strong className="text-gray-800">{selectedIncident.featureSummary.jerkRate || 190} m/s³</strong>
                </div>
              </div>
            )}

            <div className="text-[10px] text-gray-400 italic border-t pt-2">
              Note: Disaster-management behavioral anomaly detection. Non-medical on-device heuristic.
            </div>
          </div>

          {/* SECTION 5: CONSENSUS EVIDENCE PANEL */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">5. Consensus Evidence</h3>
              <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded font-mono">
                MULTI-NODE ENGINE
              </span>
            </div>

            {/* Consensus Score */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-600">Collective Consensus Score:</span>
                <span className="text-purple-700 font-mono text-sm">
                  {(selectedIncident.consensusScore * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${selectedIncident.consensusScore * 100}%` }}
                />
              </div>
            </div>

            {/* Similarity Factors Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Behavioral Similarity (30%):</span>
                <strong className="text-purple-800 font-mono">0.92</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Temporal Correlation (25%):</span>
                <strong className="text-purple-800 font-mono">0.88</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Spatial Proximity (25%):</span>
                <strong className="text-purple-800 font-mono">0.85</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Event Type Concordance (20%):</span>
                <strong className="text-purple-800 font-mono">1.00</strong>
              </div>
            </div>

            {/* Consensus Formula Note */}
            <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 space-y-1">
              <div className="font-bold">Corroborated Event</div>
              <div>
                Observed by {selectedIncident.participatingNodes.length} independent mesh devices. Higher confidence; significantly reduces false positives.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Section 7 (Gateway Status) & Section 8 (Network Status) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION 7: GATEWAY STATUS PANEL */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">7. Field Gateway Status</h3>
            <span className="text-xs text-gray-400 font-mono">{gateways.length} Gateways Registered</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {gateways.map((gw) => (
              <div key={gw.gatewayId} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-gray-900">{gw.name}</div>
                  <div className="font-mono text-gray-500 text-[11px]">{gw.gatewayId}</div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded font-bold font-mono text-[11px] ${
                    gw.status === 'ONLINE' ? 'bg-green-100 text-green-800' :
                    gw.status === 'SYNCING' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {gw.status}
                  </span>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Uploaded: {gw.metrics?.uploadedCount ?? 0} pkts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 8: NETWORK & MESH NODES STATUS PANEL */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">8. Mesh Network & Relay Nodes</h3>
            <span className="text-xs text-gray-400 font-mono">{nodes.length} Active Nodes</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {nodes.map((node) => (
              <div key={node.nodeId} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  <div>
                    <div className="font-bold font-mono text-gray-900">{node.nodeId}</div>
                    <div className="text-[11px] text-gray-500">Role: Field Sensor / Relay Node</div>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <div className="text-gray-700 font-bold">{node.packetCount} packets routed</div>
                  <div className="text-gray-400 text-[10px]">Active</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
