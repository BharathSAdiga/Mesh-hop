import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io, Socket } from 'socket.io-client';
import type { EventType, Priority, IncidentStatus } from '@rescuenet/shared';
import { v4 as uuidv4 } from 'uuid';
import {
  RadioIcon,
  AlertTriangleIcon,
  ServerIcon,
  ActivityIcon,
  CpuIcon,
  LayersIcon,
  PlayIcon,
  SmartphoneIcon
} from '../components/Icons';

// Leaflet default icons fix
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

export interface PacketFlowHop {
  nodeId: string;
  name: string;
  role: 'ORIGIN' | 'RELAY' | 'GATEWAY' | 'BACKEND' | 'COMMAND_CENTER';
  action: 'CREATED' | 'RELAYED' | 'STORED' | 'FORWARDED' | 'DELIVERED' | 'DROPPED' | 'EXPIRED';
  timestamp: number;
  hopIndex: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  ttlRemaining: number;
  rssiDbm?: number;
}

type TabType = 'OVERVIEW' | 'INCIDENTS' | 'MAP' | 'NETWORK' | 'AI_CONSENSUS' | 'PACKETS' | 'GATEWAYS' | 'DEMO';

export function CommandCenter() {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [incidents, setIncidents] = useState<CommandCenterIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<CommandCenterIncident | null>(null);
  const [gateways, setGateways] = useState<GatewayInfo[]>([]);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [utcTime, setUtcTime] = useState<string>('');
  
  // Real-time Packet Flow State
  const [packetFlowHops, setPacketFlowHops] = useState<PacketFlowHop[]>([
    { nodeId: 'node_alpha_01', name: 'Node A (Origin)', role: 'ORIGIN', action: 'CREATED', timestamp: Date.now() - 3200, hopIndex: 0, status: 'COMPLETED', ttlRemaining: 10 },
    { nodeId: 'node_beta_02', name: 'Node B (Relay 1)', role: 'RELAY', action: 'RELAYED', timestamp: Date.now() - 2100, hopIndex: 1, status: 'COMPLETED', ttlRemaining: 9, rssiDbm: -68 },
    { nodeId: 'node_gamma_03', name: 'Node C (Relay 2)', role: 'RELAY', action: 'FORWARDED', timestamp: Date.now() - 1200, hopIndex: 2, status: 'COMPLETED', ttlRemaining: 8, rssiDbm: -74 },
    { nodeId: 'gateway_edge_01', name: 'Gateway 01', role: 'GATEWAY', action: 'STORED', timestamp: Date.now() - 400, hopIndex: 3, status: 'COMPLETED', ttlRemaining: 7 },
    { nodeId: 'server_cloud_01', name: 'Authoritative Backend', role: 'BACKEND', action: 'DELIVERED', timestamp: Date.now(), hopIndex: 4, status: 'COMPLETED', ttlRemaining: 7 },
  ]);

  // Demo Simulation State
  const [demoActiveScenario, setDemoActiveScenario] = useState<string>('NORMAL');
  const [demoConsensusScore, setDemoConsensusScore] = useState<number>(0.0);

  const socketRef = useRef<Socket | null>(null);
  const backendUrl = 'http://localhost:3000';

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setUtcTime(d.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial backend incidents and connect Socket.IO
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch(`${backendUrl}/api/incidents`);
        if (res.ok) {
          const data = await res.json();
          if (data.incidents && Array.isArray(data.incidents)) {
            setIncidents(data.incidents);
            if (data.incidents.length > 0) {
              setSelectedIncident(data.incidents[0]);
            }
          }
        }
      } catch {
        // use baseline initial state
        const baseline: CommandCenterIncident[] = [
          {
            incidentId: 'INC-8821-COL',
            packetId: 'PKT-9921-A',
            eventType: 'STRUCTURAL_COLLAPSE',
            priority: 'CRITICAL',
            status: 'CONFIRMED',
            location: { latitude: 12.9716, longitude: 77.5946, accuracy: 8 },
            anomalyScore: 0.91,
            consensusScore: 0.935,
            participatingNodes: ['node_a', 'node_b', 'node_c'],
            timestamp: Date.now() - 60000,
            ttl: 86400,
            hopCount: 2,
            featureSummary: { variance: 14.8, maxG: 3.8, jerkRate: 42.1 }
          },
          {
            incidentId: 'INC-4412-SOS',
            packetId: 'PKT-3312-M',
            eventType: 'SOS',
            priority: 'CRITICAL',
            status: 'CONFIRMED',
            location: { latitude: 12.9780, longitude: 77.6010, accuracy: 12 },
            anomalyScore: 1.0,
            consensusScore: 1.0,
            participatingNodes: ['node_citizen_99'],
            timestamp: Date.now() - 180000,
            ttl: 86400,
            hopCount: 1
          }
        ];
        setIncidents(baseline);
        setSelectedIncident(baseline[0]);
      }

      // Gateways list
      try {
        const resGw = await fetch(`${backendUrl}/api/gateways`);
        if (resGw.ok) {
          const dataGw = await resGw.json();
          if (dataGw.gateways) setGateways(dataGw.gateways);
        }
      } catch {
        setGateways([
          { gatewayId: 'gw_field_01', name: 'Mobile Command Unit 1', status: 'ONLINE', lastSeenAt: Date.now(), metrics: { receivedCount: 48, pendingCount: 0, uploadedCount: 48 } },
          { gatewayId: 'gw_solar_02', name: 'Solar Tower Relay North', status: 'ONLINE', lastSeenAt: Date.now(), metrics: { receivedCount: 19, pendingCount: 0, uploadedCount: 19 } }
        ]);
      }

      // Active Nodes
      setNodes([
        { nodeId: 'node_a (1st Floor)', lastSeenAt: Date.now() - 1000, packetCount: 14 },
        { nodeId: 'node_b (2nd Floor)', lastSeenAt: Date.now() - 1200, packetCount: 11 },
        { nodeId: 'node_c (3rd Floor)', lastSeenAt: Date.now() - 1500, packetCount: 9 },
        { nodeId: 'node_d (Perimeter)', lastSeenAt: Date.now() - 4000, packetCount: 4 },
        { nodeId: 'node_e (Safe Zone)', lastSeenAt: Date.now() - 8000, packetCount: 2 },
      ]);
    }

    loadInitialData();

    // Socket.io Connection
    try {
      const socket = io(backendUrl, { transports: ['websocket', 'polling'], timeout: 3000 });
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsLiveConnected(true);
      });

      socket.on('disconnect', () => {
        setIsLiveConnected(false);
      });

      socket.on('new_incident', (inc: CommandCenterIncident) => {
        setIncidents(prev => [inc, ...prev.filter(i => i.incidentId !== inc.incidentId)]);
        setSelectedIncident(inc);
      });

      socket.on('incident_updated', (inc: Partial<CommandCenterIncident> & { incidentId: string }) => {
        setIncidents(prev => prev.map(i => i.incidentId === inc.incidentId ? { ...i, ...inc } : i));
        setSelectedIncident(prev => prev && prev.incidentId === inc.incidentId ? { ...prev, ...inc } : prev);
      });

      socket.on('new_packet', (packet: any) => {
        // Animate packet flow hop
        const hops: PacketFlowHop[] = [
          { nodeId: packet.senderId || 'origin', name: `${packet.senderId || 'Node Origin'}`, role: 'ORIGIN', action: 'CREATED', timestamp: Date.now() - 1500, hopIndex: 0, status: 'COMPLETED', ttlRemaining: packet.ttl || 10 },
          { nodeId: 'relay_node_01', name: 'Mesh Relay 01', role: 'RELAY', action: 'RELAYED', timestamp: Date.now() - 1000, hopIndex: 1, status: 'COMPLETED', ttlRemaining: (packet.ttl || 10) - 1, rssiDbm: -70 },
          { nodeId: 'gateway_01', name: 'Field Gateway 01', role: 'GATEWAY', action: 'FORWARDED', timestamp: Date.now() - 400, hopIndex: 2, status: 'COMPLETED', ttlRemaining: (packet.ttl || 10) - 2 },
          { nodeId: 'server_cloud', name: 'Command Center API', role: 'BACKEND', action: 'DELIVERED', timestamp: Date.now(), hopIndex: 3, status: 'COMPLETED', ttlRemaining: (packet.ttl || 10) - 2 },
        ];
        setPacketFlowHops(hops);
      });
    } catch {
      // Socket fallback
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Demo Control Trigger
  const triggerDemo = async (scenario: string) => {
    setDemoActiveScenario(scenario);

    if (scenario === 'NORMAL') {
      setDemoConsensusScore(0.0);
      const hops: PacketFlowHop[] = [
        { nodeId: 'node_a', name: 'Node A', role: 'ORIGIN', action: 'STORED', timestamp: Date.now(), hopIndex: 0, status: 'COMPLETED', ttlRemaining: 10 }
      ];
      setPacketFlowHops(hops);
    } else if (scenario === 'COLLAPSE') {
      setDemoConsensusScore(0.935);

      const collapseIncident: CommandCenterIncident = {
        incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}-COL`,
        packetId: `PKT-${uuidv4().slice(0, 8)}`,
        eventType: 'STRUCTURAL_COLLAPSE',
        priority: 'CRITICAL',
        status: 'CONFIRMED',
        location: { latitude: 12.9716, longitude: 77.5946, accuracy: 6 },
        anomalyScore: 0.91,
        consensusScore: 0.935,
        participatingNodes: ['node_a (0.91)', 'node_b (0.87)', 'node_c (0.84)'],
        timestamp: Date.now(),
        ttl: 86400,
        hopCount: 2,
        featureSummary: { variance: 18.2, maxG: 4.1, jerkRate: 46.8 }
      };

      setIncidents(prev => [collapseIncident, ...prev]);
      setSelectedIncident(collapseIncident);

      // Ingest to live backend
      try {
        await fetch(`${backendUrl}/api/packets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packetId: collapseIncident.packetId,
            senderId: 'node_a_sim',
            eventType: 'STRUCTURAL_COLLAPSE',
            timestamp: Date.now(),
            location: collapseIncident.location,
            anomalyScore: 0.91,
            consensusScore: 0.935,
            priority: 'CRITICAL',
            ttl: 86400,
            hopCount: 2,
            createdAt: Date.now()
          })
        });
      } catch { /* offline fallback */ }

      // Animate hop flow
      setPacketFlowHops([
        { nodeId: 'node_a', name: 'Node A (Floor 1)', role: 'ORIGIN', action: 'CREATED', timestamp: Date.now() - 1600, hopIndex: 0, status: 'COMPLETED', ttlRemaining: 10 },
        { nodeId: 'node_b', name: 'Node B (Floor 2)', role: 'RELAY', action: 'RELAYED', timestamp: Date.now() - 1100, hopIndex: 1, status: 'COMPLETED', ttlRemaining: 9, rssiDbm: -65 },
        { nodeId: 'node_c', name: 'Node C (Floor 3)', role: 'RELAY', action: 'FORWARDED', timestamp: Date.now() - 600, hopIndex: 2, status: 'COMPLETED', ttlRemaining: 8, rssiDbm: -71 },
        { nodeId: 'gw_field_01', name: 'Field Gateway 01', role: 'GATEWAY', action: 'STORED', timestamp: Date.now() - 200, hopIndex: 3, status: 'COMPLETED', ttlRemaining: 7 },
        { nodeId: 'server_cloud', name: 'Command Center', role: 'BACKEND', action: 'DELIVERED', timestamp: Date.now(), hopIndex: 4, status: 'COMPLETED', ttlRemaining: 7 },
      ]);
    } else if (scenario === 'MANUAL_SOS') {
      setDemoConsensusScore(1.0);

      const sosIncident: CommandCenterIncident = {
        incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}-SOS`,
        packetId: `PKT-${uuidv4().slice(0, 8)}`,
        eventType: 'SOS',
        priority: 'CRITICAL',
        status: 'CONFIRMED',
        location: { latitude: 12.9740, longitude: 77.5980, accuracy: 5 },
        anomalyScore: 1.0,
        consensusScore: 1.0,
        participatingNodes: ['node_citizen_sos'],
        timestamp: Date.now(),
        ttl: 86400,
        hopCount: 0
      };

      setIncidents(prev => [sosIncident, ...prev]);
      setSelectedIncident(sosIncident);

      // Ingest to live backend
      try {
        await fetch(`${backendUrl}/api/packets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packetId: sosIncident.packetId,
            senderId: 'device_citizen_sos',
            eventType: 'SOS',
            timestamp: Date.now(),
            location: sosIncident.location,
            anomalyScore: 1.0,
            consensusScore: 1.0,
            priority: 'CRITICAL',
            ttl: 86400,
            hopCount: 0,
            createdAt: Date.now()
          })
        });
      } catch { /* offline fallback */ }

      setPacketFlowHops([
        { nodeId: 'device_sos', name: 'Citizen Device', role: 'ORIGIN', action: 'CREATED', timestamp: Date.now() - 800, hopIndex: 0, status: 'COMPLETED', ttlRemaining: 10 },
        { nodeId: 'gw_field_01', name: 'Field Gateway', role: 'GATEWAY', action: 'FORWARDED', timestamp: Date.now() - 300, hopIndex: 1, status: 'COMPLETED', ttlRemaining: 9 },
        { nodeId: 'server_cloud', name: 'Command Center', role: 'BACKEND', action: 'DELIVERED', timestamp: Date.now(), hopIndex: 2, status: 'COMPLETED', ttlRemaining: 9 }
      ]);
    } else if (scenario === 'DUPLICATE') {
      setPacketFlowHops([
        { nodeId: 'node_a', name: 'Node A (Origin)', role: 'ORIGIN', action: 'CREATED', timestamp: Date.now() - 1000, hopIndex: 0, status: 'COMPLETED', ttlRemaining: 10 },
        { nodeId: 'node_b', name: 'Node B (1st Path)', role: 'RELAY', action: 'DELIVERED', timestamp: Date.now() - 600, hopIndex: 1, status: 'COMPLETED', ttlRemaining: 9 },
        { nodeId: 'node_c', name: 'Node C (Duplicate Replay)', role: 'RELAY', action: 'DROPPED', timestamp: Date.now(), hopIndex: 2, status: 'FAILED', ttlRemaining: 9 }
      ]);
    } else if (scenario === 'TTL_TEST') {
      setPacketFlowHops([
        { nodeId: 'node_origin', name: 'Hop 0 (TTL: 3)', role: 'ORIGIN', action: 'CREATED', timestamp: Date.now() - 1200, hopIndex: 0, status: 'COMPLETED', ttlRemaining: 3 },
        { nodeId: 'relay_1', name: 'Hop 1 (TTL: 2)', role: 'RELAY', action: 'RELAYED', timestamp: Date.now() - 800, hopIndex: 1, status: 'COMPLETED', ttlRemaining: 2 },
        { nodeId: 'relay_2', name: 'Hop 2 (TTL: 1)', role: 'RELAY', action: 'RELAYED', timestamp: Date.now() - 400, hopIndex: 2, status: 'COMPLETED', ttlRemaining: 1 },
        { nodeId: 'relay_3', name: 'Hop 3 (TTL: 0)', role: 'RELAY', action: 'EXPIRED', timestamp: Date.now(), hopIndex: 3, status: 'FAILED', ttlRemaining: 0 }
      ]);
    }
  };

  // KPIs
  const activeIncidentsCount = useMemo(() => incidents.filter(i => i.status !== 'RESOLVED').length, [incidents]);
  const criticalCount = useMemo(() => incidents.filter(i => i.priority === 'CRITICAL' && i.status !== 'RESOLVED').length, [incidents]);
  const connectedNodesCount = nodes.length;
  const onlineGatewaysCount = gateways.filter(g => g.status === 'ONLINE').length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-500 selection:text-white">
      {/* Top Operations Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-800 flex items-center justify-center text-red-500">
            <RadioIcon size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wider text-white text-base">RESCUENet COMMAND CENTER</span>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                v2.0 TACTICAL
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Consensus-Verified Emergency Operations Center</span>
          </div>
        </div>

        {/* Center Clock & System State */}
        <div className="hidden md:flex items-center space-x-4 font-mono text-xs">
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">CLOCK:</span>
            <span className="text-white font-bold">{utcTime}</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold uppercase tracking-wider">SYSTEM ● OPERATIONAL</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
            <span>SOCKET.IO:</span>
            <span className={`font-bold ${isLiveConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isLiveConnected ? 'LIVE' : 'POLLING'}
            </span>
          </div>
        </div>

        {/* Right Switch to Citizen PWA */}
        <div className="flex items-center space-x-2">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <SmartphoneIcon size={14} className="text-red-400" />
            <span>Citizen PWA</span>
          </Link>
        </div>
      </header>

      {/* Navigation Sub-Header Tabs */}
      <nav className="bg-slate-900/90 border-b border-slate-800/90 px-4 flex space-x-1 overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: LayersIcon },
          { id: 'INCIDENTS', label: 'Active Incidents', icon: AlertTriangleIcon, badge: activeIncidentsCount },
          { id: 'MAP', label: 'Live Map', icon: ActivityIcon },
          { id: 'NETWORK', label: 'Network & Mesh', icon: RadioIcon },
          { id: 'AI_CONSENSUS', label: 'AI & Consensus', icon: CpuIcon },
          { id: 'PACKETS', label: 'Packet Log', icon: RadioIcon },
          { id: 'GATEWAYS', label: 'Gateways', icon: ServerIcon, badge: onlineGatewaysCount },
          { id: 'DEMO', label: '🎮 Demo Master', icon: PlayIcon },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-2.5 px-3.5 border-b-2 text-xs font-bold font-mono tracking-tight flex items-center space-x-1.5 transition shrink-0 ${
                isActive
                  ? 'border-red-500 text-white bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <IconComp size={14} className={isActive ? 'text-red-400' : 'text-slate-500'} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Top-Level Tactical KPIs Banner */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">ACTIVE INCIDENTS</span>
            <div className="text-xl font-black font-mono text-white mt-0.5">{activeIncidentsCount}</div>
          </div>
          <span className="p-2 rounded-lg bg-red-950/80 text-red-400 border border-red-900/60"><AlertTriangleIcon size={16} /></span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">CRITICAL ALERTS</span>
            <div className="text-xl font-black font-mono text-red-400 mt-0.5">{criticalCount}</div>
          </div>
          <span className="p-2 rounded-lg bg-red-950 text-red-300 border border-red-800"><RadioIcon size={16} /></span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">CONNECTED NODES</span>
            <div className="text-xl font-black font-mono text-cyan-400 mt-0.5">{connectedNodesCount}</div>
          </div>
          <span className="p-2 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-900/60"><SmartphoneIcon size={16} /></span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">GATEWAYS ONLINE</span>
            <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">{onlineGatewaysCount}</div>
          </div>
          <span className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-900/60"><ServerIcon size={16} /></span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">CONSENSUS AI</span>
            <div className="text-xl font-black font-mono text-purple-400 mt-0.5">{(demoConsensusScore * 100).toFixed(0)}%</div>
          </div>
          <span className="p-2 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-900/60"><CpuIcon size={16} /></span>
        </div>
      </div>

      {/* Main Tactical Workspace: 3-Column Layout */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Active Incidents Stream (4 cols on lg) */}
        <section className="lg:col-span-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-black font-mono uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
              <AlertTriangleIcon size={14} className="text-red-400" />
              <span>Active Incident Stream</span>
            </h2>
            <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
              {incidents.length} Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[520px]">
            {incidents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No active disaster incidents.
              </div>
            ) : (
              incidents.map((inc) => {
                const isSelected = selectedIncident?.incidentId === inc.incidentId;
                const isCritical = inc.priority === 'CRITICAL';
                return (
                  <div
                    key={inc.incidentId}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3 rounded-xl border transition cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-slate-800/90 border-red-500 shadow-md ring-1 ring-red-500/40'
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          isCritical ? 'bg-red-500 animate-ping' : 'bg-orange-500'
                        }`} />
                        <span className="text-xs font-extrabold text-white font-mono">{inc.eventType}</span>
                      </div>

                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                        inc.priority === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                        inc.priority === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                        'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {inc.priority}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                      <span>ID: <strong className="text-slate-200">{inc.incidentId}</strong></span>
                      <span className="text-purple-400 font-bold">Consensus: {(inc.consensusScore * 100).toFixed(0)}%</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Nodes: {inc.participatingNodes?.length || 1}</span>
                      <span>{new Date(inc.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Center Column: Dominant Leaflet Operations Map (5 cols on lg) */}
        <section className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-xl min-h-[400px]">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-black font-mono uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
              <ActivityIcon size={14} className="text-cyan-400" />
              <span>Tactical Disaster Geospatial Grid</span>
            </h2>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              ● REAL-TIME LEAFLET
            </span>
          </div>

          <div className="flex-1 relative min-h-[380px]">
            <MapContainer
              center={
                selectedIncident?.location
                  ? [selectedIncident.location.latitude, selectedIncident.location.longitude]
                  : [12.9716, 77.5946]
              }
              zoom={13}
              style={{ width: '100%', height: '100%', minHeight: '380px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {incidents.filter(i => i.location).map(inc => (
                <div key={inc.incidentId}>
                  <Marker
                    position={[inc.location!.latitude, inc.location!.longitude]}
                    eventHandlers={{
                      click: () => setSelectedIncident(inc),
                    }}
                  >
                    <Popup>
                      <div className="p-1 font-mono text-xs">
                        <strong className="text-red-500 font-bold block">{inc.eventType}</strong>
                        <span>ID: {inc.incidentId}</span><br/>
                        <span>Consensus: {(inc.consensusScore * 100).toFixed(0)}%</span><br/>
                        <span>Nodes: {inc.participatingNodes.join(', ')}</span>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[inc.location!.latitude, inc.location!.longitude]}
                    radius={150}
                    pathOptions={{ color: inc.priority === 'CRITICAL' ? '#ef4444' : '#f97316', fillOpacity: 0.25 }}
                  />
                </div>
              ))}
            </MapContainer>
          </div>
        </section>

        {/* Right Column: Incident Details & Behavioral Evidence (3 cols on lg) */}
        <section className="lg:col-span-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shadow-xl p-4 space-y-4">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <h2 className="text-xs font-black font-mono uppercase tracking-wider text-slate-200">
              Incident Telemetry
            </h2>
            <span className="text-[10px] font-mono text-purple-400 font-bold">
              {selectedIncident ? `#${selectedIncident.incidentId}` : 'NO SELECTION'}
            </span>
          </div>

          {selectedIncident ? (
            <div className="space-y-3.5 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">TYPE:</span>
                  <span className="text-white font-bold">{selectedIncident.eventType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SEVERITY:</span>
                  <span className="text-red-400 font-black">{selectedIncident.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">STATUS:</span>
                  <span className="text-emerald-400 font-bold">{selectedIncident.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ANOMALY:</span>
                  <span className="text-amber-400 font-bold">{(selectedIncident.anomalyScore * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CONSENSUS:</span>
                  <span className="text-purple-400 font-black">{(selectedIncident.consensusScore * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Behavioral Evidence Breakdown */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">
                  Behavioral Consensus Evidence
                </span>
                
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Behavior (30%):</span>
                    <span className="text-cyan-400 font-bold">94%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Temporal (25%):</span>
                    <span className="text-cyan-400 font-bold">95%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Spatial (25%):</span>
                    <span className="text-cyan-400 font-bold">89%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Event Match (20%):</span>
                    <span className="text-cyan-400 font-bold">100%</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>Confirming Nodes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedIncident.participatingNodes.map((n, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 text-xs font-mono">
              Select an incident from the stream to inspect kinematic evidence.
            </div>
          )}
        </section>
      </main>

      {/* Bottom Panel: Animated Packet Flow & Network Graph */}
      <section className="mx-4 mb-4 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <RadioIcon size={16} className="text-cyan-400" />
            <h2 className="text-xs font-black font-mono uppercase tracking-wider text-slate-200">
              Deterministic Packet Propagation Graph (Hop Traversal)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            STORE-CARRY-FORWARD ACTIVE
          </span>
        </div>

        {/* Animated Flow Chain */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 font-mono text-xs">
          {packetFlowHops.map((hop, index) => {
            const isCompleted = hop.status === 'COMPLETED';
            const isFailed = hop.status === 'FAILED';
            return (
              <div
                key={hop.nodeId + index}
                className={`p-3 rounded-xl border transition duration-200 flex flex-col justify-between ${
                  isFailed
                    ? 'bg-red-950/40 border-red-700/80 text-red-300 ring-1 ring-red-500/30'
                    : isCompleted
                    ? 'bg-slate-950 border-cyan-800/80 text-cyan-300 shadow-md'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase">Hop {hop.hopIndex}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    hop.action === 'DELIVERED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    hop.action === 'DROPPED' ? 'bg-red-950 text-red-300 border border-red-800' :
                    hop.action === 'EXPIRED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  }`}>
                    {hop.action}
                  </span>
                </div>

                <div className="my-2">
                  <div className="font-extrabold text-white text-xs truncate">{hop.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Role: {hop.role}</div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                  <span>TTL: <strong>{hop.ttlRemaining}</strong></span>
                  {hop.rssiDbm && <span>{hop.rssiDbm} dBm</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Demo Controls Sub-Bar */}
      {activeTab === 'DEMO' && (
        <div className="mx-4 mb-4 bg-slate-900 border border-red-600/40 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded bg-red-950 text-red-400"><PlayIcon size={14} /></span>
              <h3 className="text-xs font-black font-mono uppercase text-white">
                Live Master Simulation Controls
              </h3>
            </div>
            <span className="text-[10px] font-mono text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
              SCENARIO: {demoActiveScenario}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => triggerDemo('NORMAL')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition"
            >
              🟢 SIMULATE NORMAL
            </button>
            <button
              onClick={() => triggerDemo('COLLAPSE')}
              className="px-3 py-2 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 border border-red-700 text-xs font-mono font-bold transition"
            >
              🏢 SIMULATE COLLAPSE
            </button>
            <button
              onClick={() => triggerDemo('MANUAL_SOS')}
              className="px-3 py-2 rounded-xl bg-orange-950 hover:bg-orange-900 text-orange-200 border border-orange-700 text-xs font-mono font-bold transition"
            >
              🚨 SEND SOS (BYPASS)
            </button>
            <button
              onClick={() => triggerDemo('DUPLICATE')}
              className="px-3 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700 text-xs font-mono font-bold transition"
            >
              🔄 DUPLICATE PACKET
            </button>
            <button
              onClick={() => triggerDemo('TTL_TEST')}
              className="px-3 py-2 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-700 text-xs font-mono font-bold transition"
            >
              ⏱️ TTL TEST (TTL=3)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
