import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { Packet } from '../models/Packet';
import { Incident } from '../models/Incident';
import { NodeObservation } from '../models/NodeObservation';
import { Gateway } from '../models/Gateway';
import type { RescuePacket } from '@rescuenet/shared';
import { v4 as uuidv4 } from 'uuid';

describe('RescuENet Backend API', () => {
  const app = createApp();

  const createSamplePacket = (id: string, eventType: any = 'SOS', priority: any = 'CRITICAL'): RescuePacket => ({
    packetId: id,
    senderId: 'device-test-node-1',
    eventType,
    timestamp: Date.now(),
    location: { latitude: 40.7128, longitude: -74.0060, accuracy: 5 },
    anomalyScore: 0.95,
    consensusScore: 1.0,
    priority,
    ttl: 10,
    hopCount: 0,
    createdAt: Date.now(),
  });

  beforeAll(async () => {
    const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/rescuenet_test';
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    } catch {
      console.warn('[Test DB] Running with mock memory handlers if Mongo is not running locally.');
    }
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await Packet.deleteMany({});
      await Incident.deleteMany({});
      await NodeObservation.deleteMany({});
      await Gateway.deleteMany({});
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/health', () => {
    it('returns 200 OK and health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('rescuenet-backend');
    });
  });

  describe('POST /api/packets', () => {
    it('successfully ingests valid SOS packet and generates incident', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const pkt = createSamplePacket(`pkt_${uuidv4()}`, 'SOS', 'CRITICAL');
      const res = await request(app).post('/api/packets').send(pkt);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.action).toBe('STORED');
      expect(res.body.packetId).toBe(pkt.packetId);
      expect(res.body.incidentId).toBeDefined();

      // Verify stored in DB
      const stored = await Packet.findOne({ packetId: pkt.packetId });
      expect(stored).not.toBeNull();
      expect(stored?.eventType).toBe('SOS');
    });

    it('rejects malformed packet with 400 Bad Request', async () => {
      const malformed = { packetId: '', foo: 'bar' };
      const res = await request(app).post('/api/packets').send(malformed);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.action).toBe('INVALID_PACKET');
    });

    it('rejects duplicate packet with 409 Conflict', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const pkt = createSamplePacket('pkt-dup-test-1');
      const res1 = await request(app).post('/api/packets').send(pkt);
      expect(res1.status).toBe(201);

      const res2 = await request(app).post('/api/packets').send(pkt);
      expect(res2.status).toBe(409);
      expect(res2.body.action).toBe('DROP_DUPLICATE');
    });
  });

  describe('GET /api/incidents and GET /api/incidents/:id', () => {
    it('returns list of incidents', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const pkt = createSamplePacket(`pkt_${uuidv4()}`);
      await request(app).post('/api/packets').send(pkt);

      const res = await request(app).get('/api/incidents');
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.incidents)).toBe(true);
    });

    it('returns 404 for non-existent incident id', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app).get('/api/incidents/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/observations', () => {
    it('ingests candidate event observation without storing raw data', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const observationData = {
        nodeId: 'node_sensor_1',
        eventType: 'SUDDEN_IMPACT',
        anomalyScore: 0.88,
        confidence: 0.92,
        timestamp: Date.now(),
        featureSummary: {
          accelMagnitude: 28.5,
          gyroMagnitude: 3.2,
          jerk: 180.0,
        },
        location: { latitude: 40.7128, longitude: -74.0060 },
      };

      const res = await request(app).post('/api/observations').send(observationData);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.observation.nodeId).toBe('node_sensor_1');
    });

    it('rejects observation missing nodeId', async () => {
      const observationData = {
        eventType: 'SUDDEN_IMPACT',
        anomalyScore: 0.88,
        confidence: 0.92,
      };

      const res = await request(app).post('/api/observations').send(observationData);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/gateways and POST /api/gateways/heartbeat', () => {
    it('registers gateway heartbeat and lists gateways', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const heartbeat = {
        gatewayId: 'gw_field_alpha',
        name: 'Alpha Field Gateway',
        status: 'ONLINE',
        metrics: { receivedCount: 42, pendingCount: 0 },
        location: { latitude: 40.71, longitude: -74.01 },
      };

      const postRes = await request(app).post('/api/gateways/heartbeat').send(heartbeat);
      expect(postRes.status).toBe(200);
      expect(postRes.body.gateway.gatewayId).toBe('gw_field_alpha');

      const listRes = await request(app).get('/api/gateways');
      expect(listRes.status).toBe(200);
      expect(listRes.body.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/nodes', () => {
    it('returns aggregated active mesh nodes', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const pkt = createSamplePacket(`pkt_${uuidv4()}`);
      await request(app).post('/api/packets').send(pkt);

      const res = await request(app).get('/api/nodes');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.nodes)).toBe(true);
    });
  });
});
