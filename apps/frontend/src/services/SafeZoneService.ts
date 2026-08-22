import type { Location } from '@rescuenet/shared';

export type SafeZoneType = 'SHELTER' | 'MEDICAL_POST' | 'EVACUATION_POINT' | 'SUPPLY_DISTRIBUTION';
export type SafeZoneStatus = 'OPEN' | 'LIMITED' | 'FULL' | 'RESTRICTED';

export interface SafeZone {
  id: string;
  name: string;
  type: SafeZoneType;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: SafeZoneStatus;
  capacityPercent: number;
  services: string[];
  contactRadio?: string;
  distanceMeters?: number;
}

export class SafeZoneService {
  private static CACHED_SAFE_ZONES: SafeZone[] = [
    {
      id: 'sz_central_high',
      name: 'Central High School Evacuation Shelter',
      type: 'SHELTER',
      location: { latitude: 12.9758, longitude: 77.5990, address: 'Sector 4, Central Boulevard' },
      status: 'OPEN',
      capacityPercent: 42,
      services: ['Emergency Cots', 'Potable Water', 'Backup Generator Power', 'Mesh Satellite Gateway'],
      contactRadio: 'CH 04 (462.5625 MHz)',
    },
    {
      id: 'sz_city_hall_med',
      name: 'City Hall Emergency Medical Post',
      type: 'MEDICAL_POST',
      location: { latitude: 12.9698, longitude: 77.5912, address: 'Civic Plaza, South Wing' },
      status: 'LIMITED',
      capacityPercent: 78,
      services: ['Triage & First Aid', 'Trauma Stabilization', 'Oxygen Supply', 'Emergency Medication'],
      contactRadio: 'CH 09 (462.6375 MHz)',
    },
    {
      id: 'sz_stadium_point',
      name: 'National Stadium Evacuation Staging Point',
      type: 'EVACUATION_POINT',
      location: { latitude: 12.9785, longitude: 77.5930, address: 'Gate 2 Staging Area' },
      status: 'OPEN',
      capacityPercent: 25,
      services: ['Helicopter Evac Pad', 'Disaster Bus Fleet', 'Ham Radio Station'],
      contactRadio: 'CH 12 (467.6875 MHz)',
    },
    {
      id: 'sz_metro_depot',
      name: 'Metro Transit Supply Distribution Depot',
      type: 'SUPPLY_DISTRIBUTION',
      location: { latitude: 12.9645, longitude: 77.5975, address: 'Warehouse 3, Logistics Bay' },
      status: 'OPEN',
      capacityPercent: 55,
      services: ['MRE Food Rations', 'Water Purification Kits', 'Blankets & Tarps', 'Solar Power Banks'],
      contactRadio: 'CH 06 (462.6875 MHz)',
    },
  ];

  /**
   * Calculates the approximate distance in meters between two GPS coordinates using the Haversine formula.
   */
  static calculateDistance(loc1: Location, loc2: { latitude: number; longitude: number }): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const dLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((loc1.latitude * Math.PI) / 180) *
        Math.cos((loc2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Returns safe zones, enriched with calculated distance if user coordinates are provided.
   */
  static getSafeZones(userLocation?: Location | null): { safeZones: SafeZone[]; isLive: boolean } {
    let zones = [...this.CACHED_SAFE_ZONES];

    if (userLocation) {
      zones = zones.map(zone => ({
        ...zone,
        distanceMeters: this.calculateDistance(userLocation, zone.location),
      })).sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }

    return {
      safeZones: zones,
      isLive: false, // Explicitly tagged as local cached information unless updated from live mesh
    };
  }
}
