import { useState, useRef } from 'react';
import { ConsensusEngine } from '../services/consensus/ConsensusEngine';
import type { ConsensusResult, RescuePacket } from '@rescuenet/shared';
import { v4 as uuidv4 } from 'uuid';

export function ConsensusSimulator() {
  const [nodeCount, setNodeCount] = useState<number>(3);
  const [result, setResult] = useState<ConsensusResult | null>(null);
  const [nodeScores, setNodeScores] = useState<Record<string, number>>({});
  
  const engineRef = useRef(new ConsensusEngine());

  const simulateCorrelatedEvent = () => {
    // Clear old observations for a clean demo
    engineRef.current = new ConsensusEngine();

    const timestamp = Date.now();
    const scores: Record<string, number> = {};
    let lastResult: ConsensusResult | null = null;

    for (let i = 0; i < nodeCount; i++) {
      const nodeId = `Node-${String.fromCharCode(65 + i)}`;
      
      // Simulate slight variations in anomaly scores around 0.85 to 0.95
      const anomalyScore = 0.85 + (Math.random() * 0.1);
      scores[nodeId] = anomalyScore;

      const packet: RescuePacket = {
        packetId: uuidv4(),
        senderId: nodeId,
        eventType: 'SUDDEN_IMPACT', // Behavioral AI candidate event type
        timestamp, // Same temporal window
        location: { latitude: 40, longitude: -74 }, // Same location
        anomalyScore,
        consensusScore: 0,
        priority: 'HIGH',
        ttl: 10,
        hopCount: 0,
        createdAt: timestamp,
      };

      lastResult = engineRef.current.processObservation(packet);
    }

    setNodeScores(scores);
    setResult(lastResult);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Consensus Engine</h2>
      <p className="text-sm text-gray-500">
        Simulate how independent nodes reporting candidate events build a corroborated event with higher confidence, reducing false positives.
      </p>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Virtual Devices (Nodes): {nodeCount}
        </label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          value={nodeCount} 
          onChange={(e) => setNodeCount(Number(e.target.value))}
          className="w-full"
        />
        <div className="mt-4">
          <button 
            onClick={simulateCorrelatedEvent}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
          >
            Trigger Correlated Event
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Independent Observations (Candidates)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(nodeScores).map(([nodeId, score]) => (
                <div key={nodeId} className="bg-white p-3 rounded shadow-sm border border-gray-100 flex justify-between items-center text-sm font-mono">
                  <span className="font-bold text-gray-600">{nodeId}</span>
                  <span className="text-orange-500 font-bold">{score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-6 rounded-xl text-white space-y-4 font-mono ${
            result.status === 'CONFIRMED' ? 'bg-green-900' : 
            result.status === 'CORRELATED' ? 'bg-orange-900' : 'bg-gray-800'
          }`}>
            <h3 className="text-lg font-bold border-b border-gray-700 pb-2">
              Consensus Result: <span className="text-yellow-400">{result.status}</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-xs uppercase">Consensus Score</p>
                <p className="text-2xl font-bold text-white">{result.consensusScore.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase">Overall Confidence</p>
                <p className="text-2xl font-bold text-white">{(result.confidence * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase">Corroborated Event</p>
                <p className="text-lg font-bold text-white">{result.eventType}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase">Participating Nodes</p>
                <p className="text-lg font-bold text-white">{result.participatingNodes.length}</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-400 mt-4 italic border-t border-gray-700 pt-3">
              * The engine uses behavioral, temporal, spatial, and event type similarities to produce a corroborated event with higher confidence, significantly reducing false positives from isolated anomalous sensors.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
