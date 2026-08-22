import { describe, it, expect } from 'vitest';
import { LocalWebSocketTransport } from '../transports/LocalWebSocketTransport';
import { WebBluetoothTransport } from '../transports/WebBluetoothTransport';
import type { RescuePacket } from '@rescuenet/shared';

describe('Transport Adapters', () => {
  const samplePacket: RescuePacket = {
    packetId: 'pkt-trans-1',
    senderId: 'dev-1',
    eventType: 'SOS',
    timestamp: Date.now(),
    anomalyScore: 1,
    consensusScore: 1,
    priority: 'CRITICAL',
    ttl: 10,
    hopCount: 0,
    createdAt: Date.now(),
  };

  describe('LocalWebSocketTransport', () => {
    it('initializes and reports status gracefully', async () => {
      const transport = new LocalWebSocketTransport('ws://localhost:9999', false);
      await transport.initialize();
      expect(['disconnected', 'connecting', 'connected', 'unsupported']).toContain(transport.getStatus());
      await transport.disconnect();
      expect(transport.getStatus()).toBe('disconnected');
    });
  });

  describe('WebBluetoothTransport', () => {
    it('gracefully handles unsupported environment without throwing', async () => {
      const transport = new WebBluetoothTransport();
      await transport.initialize();
      expect(['unsupported', 'disconnected']).toContain(transport.getStatus());

      const peers = await transport.discover();
      expect(peers).toEqual([]);

      const sent = await transport.sendPacket(samplePacket);
      expect(sent).toBe(false);

      await transport.disconnect();
    });
  });
});
