import { Packet, IPacket } from '../models/Packet';
import { IncidentService } from './IncidentService';
import type { RescuePacket } from '@rescuenet/shared';
import { validatePacket } from '@rescuenet/shared';

export interface IngestPacketResult {
  success: boolean;
  action: 'STORED' | 'DROP_DUPLICATE' | 'INVALID_PACKET';
  packetId?: string;
  incidentId?: string;
  error?: string;
}

export class PacketService {
  /**
   * Ingests, validates, deduplicates, and persists an emergency packet.
   */
  static async ingestPacket(rawPacket: unknown, io?: any): Promise<IngestPacketResult> {
    // 1. Validate
    let packet: RescuePacket;
    try {
      packet = validatePacket(rawPacket);
    } catch (err: any) {
      return {
        success: false,
        action: 'INVALID_PACKET',
        error: err?.message || 'Invalid packet schema',
      };
    }

    // 2. Deduplicate Check
    const existing = await Packet.findOne({ packetId: packet.packetId }).exec();
    if (existing) {
      return {
        success: false,
        action: 'DROP_DUPLICATE',
        packetId: packet.packetId,
        error: 'Duplicate packet ID already exists',
      };
    }

    // 3. Save Packet
    const newPacket = new Packet({
      packetId: packet.packetId,
      senderId: packet.senderId,
      eventType: packet.eventType,
      timestamp: packet.timestamp,
      location: packet.location,
      anomalyScore: packet.anomalyScore,
      consensusScore: packet.consensusScore,
      priority: packet.priority,
      ttl: packet.ttl,
      hopCount: packet.hopCount,
      authMetadata: packet.authMetadata,
      createdAt: packet.createdAt,
      receivedAt: new Date(),
    });

    await newPacket.save();

    // 4. Create or Update Incident
    let incidentId: string | undefined;
    if (packet.eventType === 'SOS' || packet.priority === 'CRITICAL' || packet.priority === 'HIGH') {
      const incident = await IncidentService.createOrUpdateFromPacket(packet, io);
      incidentId = incident.incidentId;
    }

    // 5. Emit Socket.IO event
    if (io) {
      io.emit('new_packet', newPacket);
      io.emit('emergency_packet', packet);
    }

    return {
      success: true,
      action: 'STORED',
      packetId: packet.packetId,
      incidentId,
    };
  }

  /**
   * Lists all packets with pagination.
   */
  static async getPackets(limit = 100): Promise<IPacket[]> {
    return await Packet.find().sort({ receivedAt: -1 }).limit(limit).exec();
  }
}
