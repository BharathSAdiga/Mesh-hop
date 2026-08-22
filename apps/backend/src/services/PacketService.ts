import { Packet, IPacket } from '../models/Packet';
import { IncidentService } from './IncidentService';
import type { RescuePacket } from '@rescuenet/shared';
import { validatePacket } from '@rescuenet/shared';
import mongoose from 'mongoose';

export interface IngestPacketResult {
  success: boolean;
  action: 'STORED' | 'DROP_DUPLICATE' | 'INVALID_PACKET';
  packetId?: string;
  incidentId?: string;
  error?: string;
}

// In-memory fallback for offline/development mode when MongoDB is unavailable
const inMemoryPackets: IPacket[] = [];

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

    const isMongoConnected = mongoose.connection.readyState === 1;

    // 2. Deduplicate Check
    if (isMongoConnected) {
      try {
        const existing = await Packet.findOne({ packetId: packet.packetId }).exec();
        if (existing) {
          return {
            success: false,
            action: 'DROP_DUPLICATE',
            packetId: packet.packetId,
            error: 'Duplicate packet ID already exists',
          };
        }
      } catch {
        // Fallback to in-memory check
      }
    }

    const existingInMemory = inMemoryPackets.find(p => p.packetId === packet.packetId);
    if (existingInMemory) {
      return {
        success: false,
        action: 'DROP_DUPLICATE',
        packetId: packet.packetId,
        error: 'Duplicate packet ID already exists',
      };
    }

    // 3. Save Packet
    const packetData = {
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
    };

    if (isMongoConnected) {
      try {
        const newPacket = new Packet(packetData);
        await newPacket.save();
      } catch {
        inMemoryPackets.unshift(packetData as any);
      }
    } else {
      inMemoryPackets.unshift(packetData as any);
    }

    // 4. Create or Update Incident
    let incidentId: string | undefined;
    if (packet.eventType === 'SOS' || packet.priority === 'CRITICAL' || packet.priority === 'HIGH') {
      const incident = await IncidentService.createOrUpdateFromPacket(packet, io);
      incidentId = incident.incidentId;
    }

    // 5. Emit Socket.IO event
    if (io) {
      io.emit('new_packet', packetData);
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
    if (mongoose.connection.readyState === 1) {
      try {
        return await Packet.find().sort({ receivedAt: -1 }).limit(limit).exec();
      } catch {
        return inMemoryPackets.slice(0, limit);
      }
    }
    return inMemoryPackets.slice(0, limit);
  }
}
