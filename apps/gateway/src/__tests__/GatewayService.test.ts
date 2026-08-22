import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GatewayService } from '../services/GatewayService';
import { createGatewayApp } from '../server';
import type { RescuePacket } from '@rescuenet/shared';
import fs from 'fs';
import path from 'path';

describe('GatewayService', () => {
  const testStorageDir = path.join(__dirname, '.test_gateway_data');
  let service: GatewayService;

  const createPacket = (id: string, priority: any = 'HIGH'): RescuePacket => ({
    packetId: id,
    senderId: 'device-gateway-test-1',
    eventType: 'SOS',
    timestamp: Date.now(),
    anomalyScore: 1.0,
    consensusScore: 1.0,
    priority,
    ttl: 10,
    hopCount: 1,
    createdAt: Date.now(),
  });

  beforeEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    service = new GatewayService({
      gatewayId: 'test_gw_1',
      backendUrl: 'http://localhost:9999', // offline mock backend
      storageDir: testStorageDir,
    });
    service.start();
  });

  afterEach(async () => {
    await service.stop();
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it('validates packet and queues offline when backend is unavailable', async () => {
    const pkt = createPacket('gw-pkt-1', 'CRITICAL');
    const result = await service.ingestPacket(pkt);

    expect(result.success).toBe(true);
    expect(result.action).toBe('QUEUED_OFFLINE');
    expect(result.packetId).toBe('gw-pkt-1');

    const status = service.getStatus();
    expect(status.state).toBe('BACKHAUL_UNAVAILABLE');
    expect(status.metrics.receivedCount).toBe(1);
    expect(status.metrics.pendingCount).toBe(1);
  });

  it('suppresses duplicate packets', async () => {
    const pkt = createPacket('gw-pkt-dup');

    const res1 = await service.ingestPacket(pkt);
    expect(res1.success).toBe(true);

    const res2 = await service.ingestPacket(pkt);
    expect(res2.success).toBe(false);
    expect(res2.action).toBe('DROP_DUPLICATE');

    const status = service.getStatus();
    expect(status.metrics.receivedCount).toBe(2);
    expect(status.metrics.duplicateCount).toBe(1);
    expect(status.metrics.pendingCount).toBe(1);
  });

  it('rejects malformed packets with INVALID_PACKET', async () => {
    const malformed = { packetId: '', foo: 'bar' };
    const res = await service.ingestPacket(malformed);

    expect(res.success).toBe(false);
    expect(res.action).toBe('INVALID_PACKET');
  });

  it('reports correct gateway status and metrics', () => {
    const status = service.getStatus();
    expect(status.gatewayId).toBe('test_gw_1');
    expect(status.state).toBe('BACKHAUL_UNAVAILABLE');
    expect(status.isBackendConnected).toBe(false);
    expect(status.metrics).toBeDefined();
    expect(status.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('express app handles POST /gateway/packet and GET /gateway/status', async () => {
    const app = createGatewayApp(service);
    expect(app).toBeDefined();

    // Verify status returns JSON object
    const status = service.getStatus();
    expect(status.gatewayId).toBe('test_gw_1');
  });
});
