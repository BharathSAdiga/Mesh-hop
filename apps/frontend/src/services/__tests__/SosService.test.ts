import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SosService } from '../SosService';
import { LocationService } from '../LocationService';
import { PacketRepository } from '../../storage/repositories/PacketRepository';

// Mock dependencies
vi.mock('../LocationService');
vi.mock('../../storage/repositories/PacketRepository');

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', mockLocalStorage);

describe('SosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should generate and persist a senderId', () => {
    const id1 = SosService.getSenderId();
    expect(id1).toBeDefined();
    expect(id1.startsWith('device_')).toBe(true);

    const id2 = SosService.getSenderId();
    expect(id1).toBe(id2);
  });

  it('should create and store an SOS packet with location', async () => {
    const mockLocation = { latitude: 10, longitude: 20, accuracy: 5 };
    vi.mocked(LocationService.getCurrentLocation).mockResolvedValue(mockLocation);

    const packet = await SosService.sendSOS(true);

    expect(LocationService.getCurrentLocation).toHaveBeenCalled();
    expect(packet.eventType).toBe('SOS');
    expect(packet.priority).toBe('CRITICAL');
    expect(packet.location).toEqual(mockLocation);
    expect(packet.state).toBe('PENDING');

    expect(PacketRepository.savePacket).toHaveBeenCalledWith(
      expect.objectContaining({ packetId: packet.packetId }),
      'PENDING'
    );
  });

  it('should create and store an SOS packet without location if denied', async () => {
    // Simulate user denying permission or timeout
    vi.mocked(LocationService.getCurrentLocation).mockResolvedValue(null);

    const packet = await SosService.sendSOS(true);

    expect(LocationService.getCurrentLocation).toHaveBeenCalled();
    expect(packet.location).toBeUndefined();
    
    expect(PacketRepository.savePacket).toHaveBeenCalled();
  });

  it('should create and store an SOS packet explicitly without location', async () => {
    const packet = await SosService.sendSOS(false);

    expect(LocationService.getCurrentLocation).not.toHaveBeenCalled();
    expect(packet.location).toBeUndefined();
    expect(PacketRepository.savePacket).toHaveBeenCalled();
  });
});
