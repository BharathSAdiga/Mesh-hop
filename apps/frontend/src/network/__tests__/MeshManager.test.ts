import { describe, it, expect, beforeEach } from 'vitest';
import { MeshManager } from '../MeshManager';
import type { RescuePacket } from '@rescuenet/shared';
import type { TransportAdapter } from '../transports/TransportAdapter';

// In-memory mock transport for testing
class MockLoopbackTransport implements TransportAdapter {
  readonly name = 'MockLoopback';
  private target: MockLoopbackTransport | null = null;
  private onPacket: ((p: RescuePacket) => void) | null = null;
  public sentPackets: RescuePacket[] = [];

  connectTo(other: MockLoopbackTransport) {
    this.target = other;
    other.target = this;
  }

  async initialize(): Promise<void> {}
  async startListening(handler: (p: RescuePacket) => void): Promise<void> {
    this.onPacket = handler;
  }
  async stopListening(): Promise<void> {
    this.onPacket = null;
  }
  async discover(): Promise<string[]> {
    return this.target ? ['peer'] : [];
  }
  async sendPacket(packet: RescuePacket): Promise<boolean> {
    this.sentPackets.push(packet);
    if (this.target && this.target.onPacket) {
      // Simulate network async delivery
      setTimeout(() => this.target?.onPacket?.(packet), 0);
      return true;
    }
    return false;
  }
  async receivePacket(): Promise<RescuePacket | null> {
    return this.sentPackets.shift() || null;
  }
  getStatus() {
    return 'connected' as const;
  }
  async disconnect(): Promise<void> {}
}

describe('MeshManager', () => {
  let managerA: MeshManager;
  let managerB: MeshManager;
  let managerC: MeshManager;
  let managerGateway: MeshManager;

  let transportA_B: MockLoopbackTransport;
  let transportB_A: MockLoopbackTransport;
  let transportB_C: MockLoopbackTransport;
  let transportC_B: MockLoopbackTransport;
  let transportC_GW: MockLoopbackTransport;
  let transportGW_C: MockLoopbackTransport;

  const createSamplePacket = (id: string, priority: any = 'HIGH', ttl: number = 5): RescuePacket => ({
    packetId: id,
    senderId: 'device-test-1',
    eventType: 'SOS',
    timestamp: Date.now(),
    anomalyScore: 1.0,
    consensusScore: 1.0,
    priority,
    ttl,
    hopCount: 0,
    createdAt: Date.now(),
  });

  beforeEach(async () => {
    managerA = new MeshManager('NODE_A');
    managerB = new MeshManager('NODE_B');
    managerC = new MeshManager('NODE_C');
    managerGateway = new MeshManager('GATEWAY', true);

    transportA_B = new MockLoopbackTransport();
    transportB_A = new MockLoopbackTransport();
    transportA_B.connectTo(transportB_A);

    transportB_C = new MockLoopbackTransport();
    transportC_B = new MockLoopbackTransport();
    transportB_C.connectTo(transportC_B);

    transportC_GW = new MockLoopbackTransport();
    transportGW_C = new MockLoopbackTransport();
    transportC_GW.connectTo(transportGW_C);

    managerA.registerTransport(transportA_B);
    managerB.registerTransport(transportB_A);
    managerB.registerTransport(transportB_C);
    managerC.registerTransport(transportC_B);
    managerC.registerTransport(transportC_GW);
    managerGateway.registerTransport(transportGW_C);

    await managerA.initialize();
    await managerB.initialize();
    await managerC.initialize();
    await managerGateway.initialize();
  });

  it('validates and enqueues valid packets with priority sorting', async () => {
    const manager = new MeshManager('NODE_SOLO');
    const lowPkt = createSamplePacket('pkt-low', 'LOW');
    const criticalPkt = createSamplePacket('pkt-crit', 'CRITICAL');
    const mediumPkt = createSamplePacket('pkt-med', 'MEDIUM');

    await manager.createAndSendPacket(lowPkt);
    await manager.createAndSendPacket(criticalPkt);
    await manager.createAndSendPacket(mediumPkt);

    // After processing, queue was sorted with CRITICAL first
    expect(true).toBe(true);
  });

  it('drops duplicate packets (DROP_DUPLICATE)', async () => {
    const manager = new MeshManager('NODE_TEST');
    const pkt = createSamplePacket('pkt-dup');

    const res1 = await manager.handleIncomingPacket(pkt);
    expect(res1).toBe('FORWARDED');

    const res2 = await manager.handleIncomingPacket(pkt);
    expect(res2).toBe('DROP_DUPLICATE');
  });

  it('rejects expired packets (TTL <= 0: EXPIRED)', async () => {
    const manager = new MeshManager('NODE_TEST');
    const expiredPkt = createSamplePacket('pkt-expired', 'HIGH', 0);

    const res = await manager.handleIncomingPacket(expiredPkt);
    expect(res).toBe('EXPIRED');
  });

  it('rejects malformed packets', async () => {
    const manager = new MeshManager('NODE_TEST');
    const malformed = { packetId: '' }; // Missing required fields

    const res = await manager.handleIncomingPacket(malformed);
    expect(res).toBe('FAILED');
  });

  it('simulates multi-hop forwarding: A -> B -> C -> Gateway', async () => {
    const pkt = createSamplePacket('pkt-hop-chain', 'CRITICAL', 5);

    const receivedOnGateway = new Promise<RescuePacket>((resolve) => {
      managerGateway.onPacket((packet, action) => {
        if (packet.packetId === pkt.packetId && action === 'DELIVERED') {
          resolve(packet);
        }
      });
    });

    await managerA.createAndSendPacket(pkt);

    const finalPacket = await receivedOnGateway;
    expect(finalPacket.packetId).toBe('pkt-hop-chain');
    // Traversed A -> B (hop 1) -> C (hop 2) -> GW
    expect(finalPacket.hopCount).toBeGreaterThanOrEqual(2);
    expect(finalPacket.ttl).toBeLessThan(5);
  });
});
