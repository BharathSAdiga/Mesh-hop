import type { EmergencyPacket, Location } from '@rescuenet/shared';
import { v4 as uuidv4 } from 'uuid';

export class EmergencyPacketFactory {
  // 24 hours in seconds
  private static DEFAULT_TTL = 86400;

  static createSOSPacket(senderId: string, location: Location | null): EmergencyPacket {
    return {
      packetId: `pkt_${uuidv4()}`,
      senderId,
      eventType: 'SOS',
      timestamp: Date.now(),
      ...(location ? { location } : {}),
      anomalyScore: 1.0,
      consensusScore: 1.0, // Manual SOS implies explicit confirmation
      priority: 'CRITICAL',
      ttl: this.DEFAULT_TTL,
      hopCount: 0,
      createdAt: Date.now(),
    };
  }
}
