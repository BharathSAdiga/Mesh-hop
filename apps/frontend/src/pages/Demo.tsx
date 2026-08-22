import { useState } from 'react';

interface VirtualDevice {
  id: string;
  name: string;
  behavior: 'NORMAL' | 'COLLAPSE_PATTERN' | 'STAMPEDE_PATTERN' | 'RAPID_MOVEMENT' | 'SOS';
  anomalyScore: number;
  lastHeartbeat: string;
}

interface DemoLog {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'CONSENSUS' | 'HOP';
  message: string;
}

export function Demo() {
  const [activeScenario, setActiveScenario] = useState<string>('NORMAL_STATE');
  const [scenarioTitle, setScenarioTitle] = useState<string>('Scenario 1: Normal Baseline State');
  const [scenarioDescription, setScenarioDescription] = useState<string>(
    '5 virtual mesh devices report normal ambient telemetry. Anomaly scores remain below detection thresholds. Zero incidents declared.'
  );

  const [virtualNodes, setVirtualNodes] = useState<VirtualDevice[]>([
    { id: 'NODE_A', name: 'Node A (Building Floor 1)', behavior: 'NORMAL', anomalyScore: 0.04, lastHeartbeat: 'Just now' },
    { id: 'NODE_B', name: 'Node B (Building Floor 2)', behavior: 'NORMAL', anomalyScore: 0.06, lastHeartbeat: 'Just now' },
    { id: 'NODE_C', name: 'Node C (Building Floor 3)', behavior: 'NORMAL', anomalyScore: 0.03, lastHeartbeat: 'Just now' },
    { id: 'NODE_D', name: 'Node D (Sector Perimeter)', behavior: 'NORMAL', anomalyScore: 0.02, lastHeartbeat: 'Just now' },
    { id: 'NODE_E', name: 'Node E (Field Relay)', behavior: 'NORMAL', anomalyScore: 0.05, lastHeartbeat: 'Just now' },
  ]);

  const [consensusData, setConsensusData] = useState<{
    participatingCount: number;
    behavioralSimilarity: number;
    temporalSimilarity: number;
    spatialSimilarity: number;
    eventTypeSimilarity: number;
    overallConsensus: number;
    status: 'CANDIDATE' | 'CORRELATED' | 'CONFIRMED' | 'NONE';
    incidentTitle?: string;
  }>({
    participatingCount: 0,
    behavioralSimilarity: 0,
    temporalSimilarity: 0,
    spatialSimilarity: 0,
    eventTypeSimilarity: 0,
    overallConsensus: 0,
    status: 'NONE',
  });

  const [meshHopState, setMeshHopState] = useState<{
    stages: Array<{ label: string; status: 'WAITING' | 'TRANSMITTING' | 'DELIVERED' | 'EXPIRED'; ttl: number; hop: number }>;
    activeHop: number;
    isOfflineQueued: boolean;
  }>({
    stages: [
      { label: 'Node A (Origin)', status: 'DELIVERED', ttl: 10, hop: 0 },
      { label: 'Node B (Relay 1)', status: 'DELIVERED', ttl: 9, hop: 1 },
      { label: 'Node C (Relay 2)', status: 'DELIVERED', ttl: 8, hop: 2 },
      { label: 'Gateway Uplink', status: 'DELIVERED', ttl: 7, hop: 3 },
      { label: 'Backend Server', status: 'DELIVERED', ttl: 6, hop: 4 },
      { label: 'Command Center', status: 'DELIVERED', ttl: 6, hop: 4 },
    ],
    activeHop: 5,
    isOfflineQueued: false,
  });

  const [duplicateTestState, setDuplicateTestState] = useState<{
    packetId: string;
    firstAttempt: 'ACCEPTED' | null;
    secondAttempt: 'DROPPED_DUPLICATE' | null;
  }>({
    packetId: 'PKT-DET-7721',
    firstAttempt: null,
    secondAttempt: null,
  });

  const [ttlTestState, setTtlTestState] = useState<{
    initialTtl: number;
    currentTtl: number;
    hopsCompleted: number;
    isExpired: boolean;
  }>({
    initialTtl: 3,
    currentTtl: 3,
    hopsCompleted: 0,
    isExpired: false,
  });

  const [logs, setLogs] = useState<DemoLog[]>([
    { id: '1', timestamp: new Date().toLocaleTimeString(), type: 'INFO', message: 'Demo Control Center initialized. System in deterministic test mode.' },
  ]);

  const addLog = (type: DemoLog['type'], message: string) => {
    setLogs(prev => [{ id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), type, message }, ...prev]);
  };

  // Scenario 1: Reset / Normal State
  const handleNormalState = () => {
    setActiveScenario('NORMAL_STATE');
    setScenarioTitle('Scenario 1: Normal Baseline State');
    setScenarioDescription('5 virtual devices reporting NORMAL telemetry. Anomaly scores < 0.10. Zero false positive alarms triggered.');
    setVirtualNodes([
      { id: 'NODE_A', name: 'Node A (Floor 1)', behavior: 'NORMAL', anomalyScore: 0.04, lastHeartbeat: 'Just now' },
      { id: 'NODE_B', name: 'Node B (Floor 2)', behavior: 'NORMAL', anomalyScore: 0.06, lastHeartbeat: 'Just now' },
      { id: 'NODE_C', name: 'Node C (Floor 3)', behavior: 'NORMAL', anomalyScore: 0.03, lastHeartbeat: 'Just now' },
      { id: 'NODE_D', name: 'Node D (Perimeter)', behavior: 'NORMAL', anomalyScore: 0.02, lastHeartbeat: 'Just now' },
      { id: 'NODE_E', name: 'Node E (Relay)', behavior: 'NORMAL', anomalyScore: 0.05, lastHeartbeat: 'Just now' },
    ]);
    setConsensusData({
      participatingCount: 0,
      behavioralSimilarity: 0,
      temporalSimilarity: 0,
      spatialSimilarity: 0,
      eventTypeSimilarity: 0,
      overallConsensus: 0,
      status: 'NONE',
    });
    setDuplicateTestState({ packetId: 'PKT-DET-7721', firstAttempt: null, secondAttempt: null });
    setTtlTestState({ initialTtl: 3, currentTtl: 3, hopsCompleted: 0, isExpired: false });
    addLog('INFO', 'Reset to Scenario 1: Normal state across all 5 virtual nodes.');
  };

  // Scenario 2: Simulate Structural Collapse (3 Nodes Correlated)
  const handleSimulateCollapse = () => {
    setActiveScenario('COLLAPSE');
    setScenarioTitle('Scenario 2: Multi-Node Structural Collapse Corroboration');
    setScenarioDescription('Node A (0.91), Node B (0.87), and Node C (0.84) detect severe structural impact. Consensus engine calculates weighted similarity and declares CONFIRMED STRUCTURAL COLLAPSE.');

    setVirtualNodes([
      { id: 'NODE_A', name: 'Node A (Floor 1)', behavior: 'COLLAPSE_PATTERN', anomalyScore: 0.91, lastHeartbeat: 'T+0.0s' },
      { id: 'NODE_B', name: 'Node B (Floor 2)', behavior: 'COLLAPSE_PATTERN', anomalyScore: 0.87, lastHeartbeat: 'T+0.2s' },
      { id: 'NODE_C', name: 'Node C (Floor 3)', behavior: 'COLLAPSE_PATTERN', anomalyScore: 0.84, lastHeartbeat: 'T+0.4s' },
      { id: 'NODE_D', name: 'Node D (Perimeter)', behavior: 'NORMAL', anomalyScore: 0.08, lastHeartbeat: 'T+1.0s' },
      { id: 'NODE_E', name: 'Node E (Relay)', behavior: 'NORMAL', anomalyScore: 0.05, lastHeartbeat: 'T+1.0s' },
    ]);

    const beh = 0.94;
    const temp = 0.92;
    const spat = 0.89;
    const evt = 1.00;
    const formulaScore = 0.30 * beh + 0.25 * temp + 0.25 * spat + 0.20 * evt; // = 0.282 + 0.23 + 0.2225 + 0.20 = 0.9345

    setConsensusData({
      participatingCount: 3,
      behavioralSimilarity: beh,
      temporalSimilarity: temp,
      spatialSimilarity: spat,
      eventTypeSimilarity: evt,
      overallConsensus: parseFloat(formulaScore.toFixed(3)),
      status: 'CONFIRMED',
      incidentTitle: 'CONFIRMED STRUCTURAL COLLAPSE',
    });

    addLog('CONSENSUS', `Consensus evaluated across 3 nodes: Score=${formulaScore.toFixed(3)} ➔ STATUS: CONFIRMED STRUCTURAL COLLAPSE`);
  };

  // Scenario 3: Multi-Node Consensus / Stampede
  const handleSimulateStampede = () => {
    setActiveScenario('STAMPEDE');
    setScenarioTitle('Scenario: Crowd Stampede Pattern Corroboration');
    setScenarioDescription('Multiple mobile devices observe high-frequency lateral accelerations and directional crush forces.');

    setVirtualNodes([
      { id: 'NODE_A', name: 'Node A (North Gate)', behavior: 'STAMPEDE_PATTERN', anomalyScore: 0.86, lastHeartbeat: 'T+0.0s' },
      { id: 'NODE_B', name: 'Node B (Main Corridor)', behavior: 'STAMPEDE_PATTERN', anomalyScore: 0.82, lastHeartbeat: 'T+0.1s' },
      { id: 'NODE_C', name: 'Node C (Turnstile 2)', behavior: 'STAMPEDE_PATTERN', anomalyScore: 0.79, lastHeartbeat: 'T+0.3s' },
      { id: 'NODE_D', name: 'Node D (Perimeter)', behavior: 'RAPID_MOVEMENT', anomalyScore: 0.65, lastHeartbeat: 'T+0.5s' },
      { id: 'NODE_E', name: 'Node E (Relay)', behavior: 'NORMAL', anomalyScore: 0.04, lastHeartbeat: 'Just now' },
    ]);

    setConsensusData({
      participatingCount: 4,
      behavioralSimilarity: 0.88,
      temporalSimilarity: 0.90,
      spatialSimilarity: 0.85,
      eventTypeSimilarity: 0.95,
      overallConsensus: 0.89,
      status: 'CONFIRMED',
      incidentTitle: 'CONFIRMED STAMPEDE PATTERN',
    });

    addLog('CONSENSUS', '4 nodes corroborated: Declared CONFIRMED STAMPEDE PATTERN');
  };

  // Scenario 8: Manual SOS (Bypasses Consensus)
  const handleManualSos = () => {
    setActiveScenario('MANUAL_SOS');
    setScenarioTitle('Scenario 8: Manual SOS Emergency Dispatch');
    setScenarioDescription('Manual SOS bypasses AI consensus. It is assigned CRITICAL priority and transmitted immediately across the mesh.');

    setVirtualNodes(prev => [
      { id: 'NODE_A', name: 'Node A (User Device)', behavior: 'SOS', anomalyScore: 1.0, lastHeartbeat: 'Instant' },
      ...prev.slice(1),
    ]);

    setConsensusData({
      participatingCount: 1,
      behavioralSimilarity: 1.0,
      temporalSimilarity: 1.0,
      spatialSimilarity: 1.0,
      eventTypeSimilarity: 1.0,
      overallConsensus: 1.0,
      status: 'CONFIRMED',
      incidentTitle: 'CRITICAL MANUAL SOS BEACON (BYPASSED CONSENSUS)',
    });

    addLog('SUCCESS', '🚨 Manual SOS triggered by Node A. Immediate broadcast without waiting for multi-node correlation.');
  };

  // Scenario 4: Gateway Offline
  const handleGatewayOffline = () => {
    setActiveScenario('GATEWAY_OFFLINE');
    setScenarioTitle('Scenario 4: Gateway Offline / Store-and-Carry');
    setScenarioDescription('Backhaul uplink is severed. Packet is generated, validated, and stored in IndexedDB local storage as PENDING.');

    setMeshHopState({
      stages: [
        { label: 'Node A (Origin)', status: 'DELIVERED', ttl: 10, hop: 0 },
        { label: 'Node B (Relay 1)', status: 'DELIVERED', ttl: 9, hop: 1 },
        { label: 'Local Store (Offline Queue)', status: 'TRANSMITTING', ttl: 8, hop: 2 },
        { label: 'Gateway Uplink (DISCONNECTED)', status: 'WAITING', ttl: 8, hop: 2 },
        { label: 'Backend Server', status: 'WAITING', ttl: 8, hop: 2 },
        { label: 'Command Center', status: 'WAITING', ttl: 8, hop: 2 },
      ],
      activeHop: 2,
      isOfflineQueued: true,
    });

    addLog('WARN', '🔌 Backhaul severed. Packet stored locally in IndexedDB as PENDING awaiting connection.');
  };

  // Scenario 5: Gateway Online
  const handleGatewayOnline = () => {
    setActiveScenario('GATEWAY_ONLINE');
    setScenarioTitle('Scenario 5: Gateway Restored / Opportunistic Queue Drain');
    setScenarioDescription('Backhaul link returns. Gateway enters SYNCING state, drains stored PENDING queue in priority order, and delivers packets to the backend.');

    setMeshHopState({
      stages: [
        { label: 'Node A (Origin)', status: 'DELIVERED', ttl: 10, hop: 0 },
        { label: 'Node B (Relay 1)', status: 'DELIVERED', ttl: 9, hop: 1 },
        { label: 'Local Store (Queue Drain)', status: 'DELIVERED', ttl: 8, hop: 2 },
        { label: 'Gateway Uplink (RESTORED)', status: 'DELIVERED', ttl: 7, hop: 3 },
        { label: 'Backend Server', status: 'DELIVERED', ttl: 6, hop: 4 },
        { label: 'Command Center', status: 'DELIVERED', ttl: 6, hop: 4 },
      ],
      activeHop: 5,
      isOfflineQueued: false,
    });

    addLog('SUCCESS', '⚡ Gateway restored: Drained PENDING packet queue ➔ DELIVERED to Command Center.');
  };

  // Scenario 6: Duplicate Packet Suppression
  const handleDuplicateTest = () => {
    setActiveScenario('DUPLICATE');
    setScenarioTitle('Scenario 6: Duplicate Packet Suppression');
    setScenarioDescription('Packet PKT-DET-7721 is transmitted twice. First transmission is ACCEPTED; second identical packetId is DROPPED_DUPLICATE.');

    setDuplicateTestState({
      packetId: 'PKT-DET-7721',
      firstAttempt: 'ACCEPTED',
      secondAttempt: 'DROPPED_DUPLICATE',
    });

    addLog('INFO', 'Transmission 1 (PKT-DET-7721): Validated and ACCEPTED into routing store.');
    addLog('WARN', 'Transmission 2 (PKT-DET-7721): Duplicate packetId detected ➔ DROPPED_DUPLICATE.');
  };

  // Scenario 7: TTL Expiration Test
  const handleTtlTest = () => {
    setActiveScenario('TTL');
    setScenarioTitle('Scenario 7: TTL Decrement & Packet Expiration');
    setScenarioDescription('Packet initialized with TTL=3. Each hop decrements TTL. At Hop 3, TTL drops to 0 and packet transmission STOPS.');

    setTtlTestState({
      initialTtl: 3,
      currentTtl: 0,
      hopsCompleted: 3,
      isExpired: true,
    });

    setMeshHopState({
      stages: [
        { label: 'Hop 0: Origin (TTL: 3)', status: 'DELIVERED', ttl: 3, hop: 0 },
        { label: 'Hop 1: Relay 1 (TTL: 2)', status: 'DELIVERED', ttl: 2, hop: 1 },
        { label: 'Hop 2: Relay 2 (TTL: 1)', status: 'DELIVERED', ttl: 1, hop: 2 },
        { label: 'Hop 3: Expiry (TTL: 0: STOP)', status: 'EXPIRED', ttl: 0, hop: 3 },
        { label: 'Gateway Uplink (DROPPED)', status: 'WAITING', ttl: 0, hop: 3 },
        { label: 'Backend Server', status: 'WAITING', ttl: 0, hop: 3 },
      ],
      activeHop: 3,
      isOfflineQueued: false,
    });

    addLog('ERROR', '⏱️ TTL decremented: 3 ➔ 2 ➔ 1 ➔ 0: Packet EXPIRED at Hop 3 and dropped.');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-gray-900 text-white p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                RescuENet Demo Control Center
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Deterministic, Repeatable Demonstration & Testing Suite for RescuENet Multi-Hop Disaster Mesh
            </p>
          </div>

          <button
            onClick={handleNormalState}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-purple-300 border border-purple-800/60 rounded-xl text-xs font-bold font-mono transition"
          >
            🔄 RESET DEMO
          </button>
        </div>

        {/* 10 Control Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-gray-800">
          <button
            onClick={handleNormalState}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeScenario === 'NORMAL_STATE' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🟢 NORMAL STATE
          </button>
          <button
            onClick={handleSimulateCollapse}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeScenario === 'COLLAPSE' ? 'bg-orange-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🏢 SIMULATE COLLAPSE
          </button>
          <button
            onClick={handleSimulateStampede}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeScenario === 'STAMPEDE' ? 'bg-amber-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🏃 SIMULATE STAMPEDE
          </button>
          <button
            onClick={handleManualSos}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeScenario === 'MANUAL_SOS' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🚨 SEND MANUAL SOS
          </button>
          <button
            onClick={handleGatewayOffline}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeScenario === 'GATEWAY_OFFLINE' ? 'bg-yellow-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🔌 GATEWAY OFFLINE
          </button>
          <button
            onClick={handleGatewayOnline}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeScenario === 'GATEWAY_ONLINE' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🌐 GATEWAY ONLINE
          </button>
          <button
            onClick={handleDuplicateTest}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeScenario === 'DUPLICATE' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🔄 DUPLICATE PACKET
          </button>
          <button
            onClick={handleTtlTest}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeScenario === 'TTL' ? 'bg-rose-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            ⏱️ TTL TEST (TTL=3)
          </button>
          <button
            onClick={handleSimulateCollapse}
            className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeScenario === 'COLLAPSE' ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🤝 MULTI-NODE CONSENSUS
          </button>
          <button
            onClick={handleNormalState}
            className="p-2.5 rounded-xl text-xs font-bold bg-gray-800 text-gray-400 hover:text-white transition flex items-center justify-center gap-1.5"
          >
            🔁 RESET SUITE
          </button>
        </div>
      </div>

      {/* Active Scenario Overview Card */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-900 text-base">{scenarioTitle}</h2>
          <span className="font-mono text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded">
            DEMO ID: {activeScenario}
          </span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{scenarioDescription}</p>
      </div>

      {/* Virtual Device Cluster (5 Nodes) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Virtual Mesh Devices Telemetry (5 In-Field Nodes)
          </h3>
          <span className="text-xs text-gray-400 font-mono">Independent Browser Agents</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {virtualNodes.map((node) => {
            const isAnomaly = node.anomalyScore >= 0.70;
            return (
              <div
                key={node.id}
                className={`p-3.5 rounded-xl border transition text-xs font-mono space-y-1.5 ${
                  isAnomaly
                    ? 'border-red-400 bg-red-50/60 shadow-sm ring-2 ring-red-300'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">{node.id}</span>
                  <span className={`w-2 h-2 rounded-full ${isAnomaly ? 'bg-red-600 animate-ping' : 'bg-green-500'}`} />
                </div>
                <div className="text-[11px] text-gray-500 font-sans truncate">{node.name}</div>
                <div className="pt-1 border-t border-gray-200 flex justify-between items-center text-[11px]">
                  <span>Score:</span>
                  <strong className={isAnomaly ? 'text-red-700 text-sm' : 'text-gray-700'}>
                    {node.anomalyScore.toFixed(2)}
                  </strong>
                </div>
                <div className="text-[10px] text-gray-400">{node.behavior}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consensus & Verification Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consensus Calculation Panel */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Multi-Node Consensus Calculator
            </h3>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
              consensusData.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
              consensusData.status === 'CORRELATED' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {consensusData.status}
            </span>
          </div>

          <div className="space-y-2 text-xs font-sans">
            <div className="flex justify-between">
              <span className="text-gray-500">Participating Nodes:</span>
              <strong className="text-gray-900">{consensusData.participatingCount} devices</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Behavioral Similarity (30%):</span>
              <span className="font-mono text-gray-800 font-bold">{consensusData.behavioralSimilarity.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Temporal Similarity (25%):</span>
              <span className="font-mono text-gray-800 font-bold">{consensusData.temporalSimilarity.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Spatial Proximity (25%):</span>
              <span className="font-mono text-gray-800 font-bold">{consensusData.spatialSimilarity.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Event Type Similarity (20%):</span>
              <span className="font-mono text-gray-800 font-bold">{consensusData.eventTypeSimilarity.toFixed(2)}</span>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mt-2 font-mono text-xs">
              <div className="text-gray-500 text-[10px]">WEIGHTED SCORE:</div>
              <div className="text-lg font-bold text-purple-800">
                Consensus Score = {consensusData.overallConsensus.toFixed(3)}
              </div>
              {consensusData.incidentTitle && (
                <div className="text-xs font-bold text-red-600 mt-1 font-sans">
                  ➔ {consensusData.incidentTitle}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Duplicate & TTL Verification Panel */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Protocol Verification (Duplicate & TTL)
            </h3>
            <span className="text-xs text-gray-400 font-mono">Step Verification</span>
          </div>

          {/* Duplicate Test Display */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs font-mono">
            <div className="text-gray-700 font-bold font-sans">Scenario 6: Duplicate Suppression</div>
            <div className="flex justify-between text-[11px]">
              <span>Packet ID:</span>
              <strong>{duplicateTestState.packetId}</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>First Ingestion:</span>
              <span className="font-bold text-green-700">{duplicateTestState.firstAttempt || 'Pending Test'}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Second Ingestion (Replay):</span>
              <span className="font-bold text-orange-700">{duplicateTestState.secondAttempt || 'Pending Test'}</span>
            </div>
          </div>

          {/* TTL Test Display */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs font-mono">
            <div className="text-gray-700 font-bold font-sans">Scenario 7: TTL Expiration</div>
            <div className="flex justify-between text-[11px]">
              <span>Initial TTL:</span>
              <strong>{ttlTestState.initialTtl}</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Hops Completed:</span>
              <strong>{ttlTestState.hopsCompleted}</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Terminal State:</span>
              <span className={ttlTestState.isExpired ? 'font-bold text-red-600' : 'text-gray-500'}>
                {ttlTestState.isExpired ? 'TTL 0: STOP & EXPIRED' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mesh Hop Chain Visualization */}
      <div className="bg-gray-900 text-white p-5 rounded-2xl border border-gray-800 shadow-md space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold uppercase tracking-wide text-cyan-400 font-mono">
            Deterministic Mesh Traversal Chain
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {meshHopState.isOfflineQueued ? '⚠️ Stored in Local Queue (Offline)' : '✓ Transmitting through Hop Chain'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
          {meshHopState.stages.map((stage, idx) => {
            const isDelivered = stage.status === 'DELIVERED';
            const isExpired = stage.status === 'EXPIRED';
            const isTransmitting = stage.status === 'TRANSMITTING';

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border font-mono text-xs space-y-1 text-center ${
                  isExpired
                    ? 'border-red-600 bg-red-950/40 text-red-400'
                    : isDelivered
                    ? 'border-emerald-700 bg-emerald-950/30 text-emerald-300'
                    : isTransmitting
                    ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200 ring-2 ring-cyan-400'
                    : 'border-gray-800 bg-gray-800/30 text-gray-500'
                }`}
              >
                <div className="text-[10px] text-gray-400 uppercase">Step {idx + 1}</div>
                <div className="font-bold text-white text-[11px] font-sans truncate">{stage.label}</div>
                <div className="text-[10px] text-gray-400">TTL: {stage.ttl}</div>
                <div className="text-[10px] font-bold mt-1">
                  {stage.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deterministic Log Stream */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Deterministic Protocol Event Audit
          </h3>
          <button onClick={() => setLogs([])} className="text-xs text-gray-400 hover:text-red-600">
            Clear Logs
          </button>
        </div>

        <div className="space-y-1.5 max-h-[220px] overflow-y-auto font-mono text-xs pr-1">
          {logs.map((l) => (
            <div key={l.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">{l.timestamp}</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  l.type === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                  l.type === 'WARN' ? 'bg-yellow-100 text-yellow-800' :
                  l.type === 'ERROR' ? 'bg-red-100 text-red-800' :
                  l.type === 'CONSENSUS' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200 text-gray-700'
                }`}>
                  {l.type}
                </span>
                <span className="text-gray-800 font-sans">{l.message}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
