import { describe, it, expect, beforeEach } from 'vitest';
import { BehavioralAI } from '../BehavioralAI';

describe('BehavioralAI', () => {
  let ai: BehavioralAI;

  beforeEach(() => {
    ai = new BehavioralAI();
  });

  it('should classify NORMAL pattern correctly', () => {
    const data = {
      acceleration: { x: 0, y: 9.81, z: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      timestamp: 1000
    };
    
    // Initial call to set baseline
    ai.processSensorData(data);
    
    // Second call
    const result = ai.processSensorData({
      acceleration: { x: 0.1, y: 9.82, z: 0.1 },
      gyro: { x: 0.1, y: 0.1, z: 0.1 },
      timestamp: 1100 // 100ms later
    });

    expect(result.eventType).toBe('NORMAL');
    expect(result.anomalyScore).toBeLessThan(0.1);
  });

  it('should classify SUDDEN_IMPACT pattern correctly', () => {
    const baseline = {
      acceleration: { x: 0, y: 9.81, z: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      timestamp: 1000
    };
    ai.processSensorData(baseline);

    const impact = {
      acceleration: { x: 30, y: 30, z: 0 }, // Very high acceleration
      gyro: { x: 1, y: 1, z: 1 },
      timestamp: 1100 // High jerk due to short dt
    };

    const result = ai.processSensorData(impact);
    expect(result.eventType).toBe('SUDDEN_IMPACT');
    expect(result.anomalyScore).toBeGreaterThan(0.8);
  });

  it('should classify COLLAPSE_PATTERN correctly', () => {
    const baseline = {
      acceleration: { x: 0, y: 9.81, z: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      timestamp: 1000
    };
    ai.processSensorData(baseline);

    const collapse = {
      acceleration: { x: 0, y: 0, z: 0 }, // Free fall / zero G
      gyro: { x: 0, y: 0, z: 0 },
      timestamp: 1100
    };

    const result = ai.processSensorData(collapse);
    expect(result.eventType).toBe('COLLAPSE_PATTERN');
    expect(result.anomalyScore).toBeGreaterThan(0.7);
  });

  it('should classify STAMPEDE_PATTERN correctly', () => {
    const baseline = {
      acceleration: { x: 0, y: 9.81, z: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      timestamp: 1000
    };
    ai.processSensorData(baseline);

    const stampede = {
      acceleration: { x: 10, y: 15, z: 5 }, // High acceleration
      gyro: { x: 2, y: 2, z: 2 }, // Some erratic gyro movement
      timestamp: 1100 // Short dt -> high jerk
    };

    const result = ai.processSensorData(stampede);
    expect(result.eventType).toBe('STAMPEDE_PATTERN');
    expect(result.anomalyScore).toBeGreaterThan(0.6);
  });
});
