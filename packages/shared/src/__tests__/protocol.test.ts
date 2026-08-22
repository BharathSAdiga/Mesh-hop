import { describe, it, expect } from 'vitest';
import {
  validatePacket,
  createPacket,
  calculatePacketHash,
  verifyPacketIntegrity,
  decrementTTL,
  isExpired,
  generateSenderId,
} from '../protocol';
import type { RescuePacket } from '../types';

describe('Shared Protocol & Packet Integrity Tests', () => {
  it('creates and validates a standard RescuePacket with auth hash', async () => {
    const packet = await createPacket({
      senderId: 'device_test_123',
      eventType: 'STRUCTURAL_COLLAPSE',
      priority: 'CRITICAL',
      anomalyScore: 0.95,
      consensusScore: 0.90,
      ttl: 10,
    });

    expect(packet.packetId.startsWith('pkt_')).toBe(true);
    expect(packet.authMetadata?.hash).toBeDefined();
    expect(packet.ttl).toBe(10);
    expect(packet.hopCount).toBe(0);

    const validated = validatePacket(packet);
    expect(validated.packetId).toBe(packet.packetId);
  });

  it('verifies packet integrity hash accurately and rejects tampered data', async () => {
    const packet = await createPacket({
      senderId: 'device_node_abc',
      eventType: 'FIRE',
      priority: 'HIGH',
      anomalyScore: 0.88,
      consensusScore: 0.85,
    });

    const isValid = await verifyPacketIntegrity(packet);
    expect(isValid).toBe(true);

    // Simulate malicious tampering with payload
    const tampered: RescuePacket = {
      ...packet,
      anomalyScore: 0.10, // Tampered
    };

    const isTamperedValid = await verifyPacketIntegrity(tampered);
    expect(isTamperedValid).toBe(false);
  });

  it('properly decrements TTL and increments hop count', async () => {
    const packet = await createPacket({
      senderId: 'device_node_1',
      eventType: 'SOS',
      priority: 'CRITICAL',
      anomalyScore: 1.0,
      consensusScore: 1.0,
      ttl: 2,
    });

    const hop1 = decrementTTL(packet);
    expect(hop1.ttl).toBe(1);
    expect(hop1.hopCount).toBe(1);
    expect(isExpired(hop1)).toBe(false);

    const hop2 = decrementTTL(hop1);
    expect(hop2.ttl).toBe(0);
    expect(hop2.hopCount).toBe(2);
    expect(isExpired(hop2)).toBe(true);
  });

  it('generates pseudonymous sender IDs with device_ prefix', () => {
    const id = generateSenderId();
    expect(id.startsWith('device_')).toBe(true);
  });
});
