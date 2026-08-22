import { describe, it, expect, beforeEach } from 'vitest';
import { ConsensusEngine } from '../ConsensusEngine';
import { RescuePacket } from '@rescuenet/shared';

describe('ConsensusEngine', () => {
  let engine: ConsensusEngine;

  beforeEach(() => {
    engine = new ConsensusEngine({
      correlatedThreshold: 0.5,
      confirmedThreshold: 0.75,
      minNodesForConsensus: 2,
    });
  });

  const createPacket = (
    id: string, 
    senderId: string, 
    anomalyScore: number, 
    lat: number = 0, 
    lon: number = 0,
    timestampOffset: number = 0,
    eventType: any = 'SUDDEN_IMPACT'
  ): RescuePacket => ({
    packetId: id,
    senderId,
    eventType,
    timestamp: Date.now() + timestampOffset,
    location: { latitude: lat, longitude: lon },
    anomalyScore,
    consensusScore: 0,
    priority: 'HIGH',
    ttl: 10,
    hopCount: 0,
    createdAt: Date.now()
  });

  it('should return CANDIDATE for one device', () => {
    const p1 = createPacket('p1', 'node-1', 0.9);
    const result = engine.processObservation(p1);

    expect(result.status).toBe('CANDIDATE');
    expect(result.participatingNodes).toHaveLength(1);
    expect(result.consensusScore).toBe(0);
  });

  it('should return CONFIRMED for two highly correlated devices', () => {
    const p1 = createPacket('p1', 'node-1', 0.9, 40, -74);
    const p2 = createPacket('p2', 'node-2', 0.92, 40.0001, -74); // Same time, very close, similar score

    engine.processObservation(p1);
    const result = engine.processObservation(p2);

    expect(result.status).toBe('CONFIRMED');
    expect(result.participatingNodes).toHaveLength(2);
    expect(result.consensusScore).toBeGreaterThanOrEqual(0.75);
  });

  it('should return CONFIRMED for multiple correlated devices', () => {
    const p1 = createPacket('p1', 'node-1', 0.85, 40, -74);
    const p2 = createPacket('p2', 'node-2', 0.88, 40.0001, -74);
    const p3 = createPacket('p3', 'node-3', 0.86, 40.0002, -74);

    engine.processObservation(p1);
    engine.processObservation(p2);
    const result = engine.processObservation(p3);

    expect(result.status).toBe('CONFIRMED');
    expect(result.participatingNodes).toHaveLength(3);
    expect(result.consensusScore).toBeGreaterThan(0.9);
  });

  it('should not correlate unrelated devices (different event types)', () => {
    const p1 = createPacket('p1', 'node-1', 0.9, 40, -74, 0, 'SUDDEN_IMPACT');
    const p2 = createPacket('p2', 'node-2', 0.92, 40.0001, -74, 0, 'STAMPEDE_PATTERN'); 

    engine.processObservation(p1);
    const result = engine.processObservation(p2);

    // p2 is the only one of its type in the registry now
    expect(result.status).toBe('CANDIDATE');
    expect(result.participatingNodes).toHaveLength(1);
  });

  it('should lower score for different timestamps', () => {
    const p1 = createPacket('p1', 'node-1', 0.9, 40, -74, 0);
    const p2 = createPacket('p2', 'node-2', 0.9, 40, -74, 15000); // 15 seconds apart

    engine.processObservation(p1);
    const result = engine.processObservation(p2);

    // Temporal similarity is 0.5 (1 - 15000/30000)
    // 0.3(behavior:1) + 0.25(temporal:0.5) + 0.25(spatial:1) + 0.20(type:1) = 0.3 + 0.125 + 0.25 + 0.20 = 0.875
    expect(result.consensusScore).toBeCloseTo(0.875);
    expect(result.status).toBe('CONFIRMED');
  });

  it('should lower score or drop to CANDIDATE/CORRELATED for different locations', () => {
    const p1 = createPacket('p1', 'node-1', 0.9, 40, -74);
    const p2 = createPacket('p2', 'node-2', 0.9, 41, -74); // 1 degree lat is ~111km

    engine.processObservation(p1);
    const result = engine.processObservation(p2);

    // Distance > 100m, spatial similarity is 0
    // 0.3(behavior:1) + 0.25(temporal:1) + 0.25(spatial:0) + 0.20(type:1) = 0.75
    // Actually, it might be exactly 0.75, which is CONFIRMED, but let's check
    expect(result.consensusScore).toBe(0.75);
    expect(result.status).toBe('CONFIRMED');
  });

  it('should bypass consensus for manual SOS', () => {
    const sosPacket = createPacket('sos1', 'node-sos', 0, 0, 0, 0, 'SOS');
    const result = engine.processObservation(sosPacket);

    expect(result.status).toBe('CONFIRMED');
    expect(result.consensusScore).toBe(1.0);
    expect(result.eventType).toBe('SOS');
  });
});
