import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { PacketRepository } from '../repositories/PacketRepository';
import type { EmergencyPacket } from '@rescuenet/shared';
import { getDB } from '../db';

describe('PacketRepository', () => {
  beforeEach(async () => {
    // Clear DB before each test
    const db = await getDB();
    await db.clear('packets');
    await db.clear('seenPackets');
  });

  const mockPacket: EmergencyPacket = {
    packetId: 'pkt-123',
    senderId: 'device-456',
    eventType: 'SOS',
    timestamp: Date.now(),
    anomalyScore: 1,
    consensusScore: 1,
    priority: 'CRITICAL',
    ttl: 10,
    hopCount: 0,
    createdAt: Date.now()
  };

  it('should save a packet as PENDING and seen', async () => {
    await PacketRepository.savePacket(mockPacket);
    
    const pending = await PacketRepository.getPendingPackets();
    expect(pending.length).toBe(1);
    expect(pending[0].packetId).toBe('pkt-123');
    expect(pending[0].state).toBe('PENDING');

    const hasSeen = await PacketRepository.hasSeenPacket('pkt-123');
    expect(hasSeen).toBe(true);
  });

  it('should mark a packet as delivered', async () => {
    await PacketRepository.savePacket(mockPacket);
    await PacketRepository.markDelivered('pkt-123');
    
    const pending = await PacketRepository.getPendingPackets();
    expect(pending.length).toBe(0); // No longer pending

    const all = await PacketRepository.getAllPackets();
    expect(all[0].state).toBe('DELIVERED');
  });

  it('should remove expired packets', async () => {
    const expiredPacket = { ...mockPacket, packetId: 'pkt-expired', ttl: 0 };
    await PacketRepository.savePacket(expiredPacket);
    
    const count = await PacketRepository.removeExpiredPackets();
    expect(count).toBe(1);

    const all = await PacketRepository.getAllPackets();
    expect(all[0].state).toBe('EXPIRED');
  });
});
