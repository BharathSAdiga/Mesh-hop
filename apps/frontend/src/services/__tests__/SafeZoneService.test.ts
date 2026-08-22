import { describe, it, expect } from 'vitest';
import { SafeZoneService } from '../SafeZoneService';

describe('SafeZoneService & Emergency Information', () => {
  it('loads cached safe zones with local provenance', () => {
    const data = SafeZoneService.getSafeZones();
    expect(data.safeZones.length).toBeGreaterThan(0);
    expect(data.isLive).toBe(false);

    const shelter = data.safeZones.find(z => z.type === 'SHELTER');
    expect(shelter).toBeDefined();
    expect(shelter?.status).toBe('OPEN');
    expect(shelter?.services.length).toBeGreaterThan(0);
  });

  it('calculates Haversine distance in meters accurately when user coordinates exist', () => {
    // Bangalore coordinates
    const userLocation = { latitude: 12.9716, longitude: 77.5946, accuracy: 10 };
    const zoneLocation = { latitude: 12.9758, longitude: 77.5990 };

    const distance = SafeZoneService.calculateDistance(userLocation, zoneLocation);
    expect(distance).toBeGreaterThan(300);
    expect(distance).toBeLessThan(1000);
  });

  it('sorts safe zones by proximity when user coordinates are provided', () => {
    const userLocation = { latitude: 12.9758, longitude: 77.5990, accuracy: 5 }; // Same location as sz_central_high
    const data = SafeZoneService.getSafeZones(userLocation);

    expect(data.safeZones[0].id).toBe('sz_central_high');
    expect(data.safeZones[0].distanceMeters).toBeLessThan(20);
  });
});
