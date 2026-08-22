import { describe, it, expect, beforeEach } from 'vitest';
import { RoutingEngine } from '../RoutingEngine';
import type { RescuePacket, Priority } from '@rescuenet/shared';
import type { TransportAdapter } from '../../transports/TransportAdapter';
import type { StoredPacket } from '../../../storage/db';

class MockTransport implements TransportAdapter {
  readonly name = 'MockTransport';
  public isConnected = true;
  public sentPackets: RescuePacket[] = [];
  async initialize(): Promise<void> {}
  async startListening(_handler: (p: RescuePacket) => void): Promise<void> {}
  async stopListening(): Promise<void> {}
  async discover(): Promise<string[]> {
    return ['mock_peer'];
  }
  async sendPacket(packet: RescuePacket): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    this.sentPackets.push(packet);
    return true;
  }
  async receivePacket(): Promise<RescuePacket | null> {
    return this.sentPackets.shift() || null;
  }
  getStatus() {
    return this.isConnected ? ('connected' as const) : ('disconnected' as const);
  }
  async disconnect(): Promise<void> {
    this.isConnected = false;
  }
}

describe('RoutingEngine - Store-Carry-Forward', () => {
  let engine: RoutingEngine;
  let transport: MockTransport;

  const createPacket = (id: string, priority: Priority = 'HIGH', ttl: number = 5): RescuePacket => ({
    packetId: id,
    senderId: 'dev_origin_1',
    eventType: 'SOS',
    timestamp: Date.now(),
    anomalyScore: 1.0,
    consensusScore: 1.0,
    priority,
    ttl,
    hopCount: 0,
    createdAt: Date.now(),
  });

  beforeEach(() => {
    engine = new RoutingEngine('NODE_ORIGIN');
    transport = new MockTransport();
    engine.registerTransport(transport);
  });

  it('performs successful forwarding when relay is available', async () => {
    engine.setRelayAvailable(true);
    const pkt = createPacket('pkt-fwd-1');

    const result = await engine.ingestLocalPacket(pkt);
    expect(['TRANSMITTING', 'STORED_PENDING']).toContain(result);
    expect(transport.sentPackets).toHaveLength(1);
    expect(transport.sentPackets[0].packetId).toBe('pkt-fwd-1');
  });

  it('stores packet as PENDING when gateway/relay is unavailable', async () => {
    engine.setRelayAvailable(false);
    const pkt = createPacket('pkt-offline-1', 'CRITICAL');

    const result = await engine.ingestLocalPacket(pkt);
    expect(result).toBe('STORED_PENDING');
    expect(transport.sentPackets).toHaveLength(0);
    expect(engine.queue.size()).toBe(1);

    const queued = engine.queue.peek();
    expect(queued?.packetId).toBe('pkt-offline-1');
    expect(queued?.state).toBe('PENDING');
  });

  it('eventually delivers stored packet when gateway/relay is restored', async () => {
    // 1. Gateway offline
    engine.setRelayAvailable(false);
    const pkt = createPacket('pkt-carry-1', 'CRITICAL');
    await engine.ingestLocalPacket(pkt);
    expect(engine.queue.size()).toBe(1);
    expect(transport.sentPackets).toHaveLength(0);

    // 2. Relay becomes available (Store-and-Carry encounter)
    engine.setRelayAvailable(true);

    // Give microtask tick for async drain
    await new Promise(r => setTimeout(r, 10));

    expect(transport.sentPackets).toHaveLength(1);
    expect(transport.sentPackets[0].packetId).toBe('pkt-carry-1');
    expect(engine.queue.isEmpty()).toBe(true);
  });

  it('suppresses duplicate packets using packetId', async () => {
    engine.setRelayAvailable(true);
    const pkt = createPacket('pkt-dup-test');

    await engine.ingestLocalPacket(pkt);
    expect(transport.sentPackets).toHaveLength(1);

    // Re-forwarding the exact same packetId
    const dupResult = await engine.forwardPacket(pkt);
    expect(dupResult).toBe('DROP_DUPLICATE');
    expect(transport.sentPackets).toHaveLength(1); // No additional send
  });

  it('drops packet when TTL expires (ttl <= 0: EXPIRED)', async () => {
    engine.setRelayAvailable(true);
    const expiredPkt = createPacket('pkt-expired-test', 'HIGH', 0);

    const result = await engine.forwardPacket(expiredPkt);
    expect(result).toBe('EXPIRED');
    expect(transport.sentPackets).toHaveLength(0);
  });

  it('decrements TTL and increments hopCount during forwarding', async () => {
    engine.setRelayAvailable(true);
    const pkt = createPacket('pkt-hop-test', 'MEDIUM', 10);

    const result = await engine.forwardPacket(pkt);
    expect(result).toBe('FORWARDED');
    expect(transport.sentPackets).toHaveLength(1);

    const sent = transport.sentPackets[0];
    expect(sent.ttl).toBe(9);
    expect(sent.hopCount).toBe(1);
  });

  it('orders transmissions strictly by priority: CRITICAL > HIGH > MEDIUM > LOW', async () => {
    engine.setRelayAvailable(false); // Accumulate in queue

    const lowPkt = createPacket('pkt-low', 'LOW');
    const criticalPkt = createPacket('pkt-crit', 'CRITICAL');
    const mediumPkt = createPacket('pkt-med', 'MEDIUM');
    const highPkt = createPacket('pkt-high', 'HIGH');

    await engine.ingestLocalPacket(lowPkt);
    await engine.ingestLocalPacket(criticalPkt);
    await engine.ingestLocalPacket(mediumPkt);
    await engine.ingestLocalPacket(highPkt);

    expect(engine.queue.size()).toBe(4);

    // Verify queue order
    const ordered = engine.queue.getPackets();
    expect(ordered.map((p: StoredPacket) => p.priority)).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);

    // Now restore connection and verify drain sequence
    engine.setRelayAvailable(true);
    await new Promise(r => setTimeout(r, 10));

    expect(transport.sentPackets.map((p: RescuePacket) => p.priority)).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
  });
});
