import { useState, useRef } from 'react';
import { BehavioralAI } from '../services/ai/BehavioralAI';
import { CandidateEvent } from '@rescuenet/shared';

export function AISimulation() {
  const [candidateEvent, setCandidateEvent] = useState<CandidateEvent | null>(null);
  
  // Keep the AI instance in a ref so state persists across renders
  const aiRef = useRef(new BehavioralAI());

  const simulateNormal = () => {
    aiRef.current.processSensorData({
      acceleration: { x: 0, y: 9.81, z: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      timestamp: Date.now()
    });
    
    // Slight movement
    setTimeout(() => {
      const result = aiRef.current.processSensorData({
        acceleration: { x: 0.2, y: 9.85, z: 0.1 },
        gyro: { x: 0.1, y: 0.1, z: 0.1 },
        timestamp: Date.now()
      });
      setCandidateEvent(result);
    }, 100);
  };

  const simulateSuddenImpact = () => {
    aiRef.current.processSensorData({
      acceleration: { x: 0, y: 9.81, z: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      timestamp: Date.now()
    });
    
    // Massive acceleration spike
    setTimeout(() => {
      const result = aiRef.current.processSensorData({
        acceleration: { x: 40, y: 40, z: 10 },
        gyro: { x: 2, y: 2, z: 2 },
        timestamp: Date.now()
      });
      setCandidateEvent(result);
    }, 100);
  };

  const simulateCollapse = () => {
    aiRef.current.processSensorData({
      acceleration: { x: 0, y: 9.81, z: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      timestamp: Date.now()
    });
    
    // Freefall simulation
    setTimeout(() => {
      const result = aiRef.current.processSensorData({
        acceleration: { x: 0, y: 0, z: 0 },
        gyro: { x: 0, y: 0, z: 0 },
        timestamp: Date.now()
      });
      setCandidateEvent(result);
    }, 100);
  };

  const simulateStampede = () => {
    aiRef.current.processSensorData({
      acceleration: { x: 0, y: 9.81, z: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      timestamp: Date.now()
    });
    
    // Erratic high acceleration and gyro
    setTimeout(() => {
      const result = aiRef.current.processSensorData({
        acceleration: { x: 12, y: 15, z: 8 },
        gyro: { x: 3, y: 4, z: 2 },
        timestamp: Date.now()
      });
      setCandidateEvent(result);
    }, 100);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Behavioral AI Simulation</h2>
      <p className="text-sm text-gray-500">
        Test the on-device AI anomaly detection pipeline using simulated sensor patterns.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={simulateNormal}
          className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-lg"
        >
          NORMAL
        </button>
        <button 
          onClick={simulateSuddenImpact}
          className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg"
        >
          SUDDEN IMPACT
        </button>
        <button 
          onClick={simulateCollapse}
          className="px-4 py-3 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold rounded-lg"
        >
          COLLAPSE
        </button>
        <button 
          onClick={simulateStampede}
          className="px-4 py-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold rounded-lg"
        >
          STAMPEDE
        </button>
      </div>

      {candidateEvent && (
        <div className="mt-8 p-6 bg-gray-900 rounded-xl text-white space-y-4 font-mono">
          <h3 className="text-lg font-bold text-green-400 border-b border-gray-700 pb-2">AI Output: CANDIDATE_EVENT</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-xs uppercase">Detected Pattern</p>
              <p className="text-xl font-bold text-white">{candidateEvent.eventType}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">Behavior State</p>
              <p className="text-xl font-bold text-white">
                {candidateEvent.anomalyScore > 0.5 ? 'ANOMALOUS' : 'NORMAL'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">Anomaly Score</p>
              <p className={`text-xl font-bold ${candidateEvent.anomalyScore > 0.5 ? 'text-red-400' : 'text-blue-400'}`}>
                {candidateEvent.anomalyScore.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">Confidence</p>
              <p className="text-xl font-bold text-white">{(candidateEvent.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-xs uppercase mb-2">Feature Summary</p>
            <div className="grid grid-cols-3 gap-2 text-sm text-gray-300">
              <div>
                <span className="block text-gray-500">Accel Mag</span>
                {candidateEvent.featureSummary.accelMagnitude.toFixed(2)} g
              </div>
              <div>
                <span className="block text-gray-500">Gyro Mag</span>
                {candidateEvent.featureSummary.gyroMagnitude.toFixed(2)} rad/s
              </div>
              <div>
                <span className="block text-gray-500">Jerk</span>
                {candidateEvent.featureSummary.jerk.toFixed(2)} m/s³
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
