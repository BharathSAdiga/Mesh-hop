import { Incident, IIncident } from '../models/Incident';
import type { RescuePacket, IncidentStatus } from '@rescuenet/shared';
import { v4 as uuidv4 } from 'uuid';

export class IncidentService {
  /**
   * Returns list of active or filtered incidents.
   */
  static async getIncidents(query: { status?: string; eventType?: string; limit?: number } = {}): Promise<IIncident[]> {
    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.eventType) {
      filter.eventType = query.eventType;
    }
    const limit = query.limit || 50;

    return await Incident.find(filter).sort({ createdAt: -1 }).limit(limit).exec();
  }

  /**
   * Finds incident by ID.
   */
  static async getIncidentById(incidentId: string): Promise<IIncident | null> {
    return await Incident.findOne({ incidentId }).exec();
  }

  /**
   * Creates or updates an incident from a confirmed packet or manual SOS.
   */
  static async createOrUpdateFromPacket(packet: RescuePacket, io?: any): Promise<IIncident> {
    // Check if incident already exists for this packet
    let incident = await Incident.findOne({ packetId: packet.packetId }).exec();

    if (!incident) {
      incident = new Incident({
        incidentId: `inc_${uuidv4()}`,
        packetId: packet.packetId,
        eventType: packet.eventType,
        priority: packet.priority,
        status: packet.eventType === 'SOS' ? 'CONFIRMED' : 'CORRELATED',
        location: packet.location,
        anomalyScore: packet.anomalyScore,
        consensusScore: packet.consensusScore,
        participatingNodes: [packet.senderId],
        timestamp: packet.timestamp,
        ttl: packet.ttl,
      });

      await incident.save();

      if (io) {
        io.emit('new_incident', incident);
      }
    } else {
      // Update existing incident
      if (!incident.participatingNodes.includes(packet.senderId)) {
        incident.participatingNodes.push(packet.senderId);
      }
      incident.consensusScore = Math.max(incident.consensusScore, packet.consensusScore);
      incident.updatedAt = new Date();
      await incident.save();

      if (io) {
        io.emit('incident_updated', incident);
      }
    }

    return incident;
  }

  /**
   * Updates incident status (e.g. RESOLVED).
   */
  static async updateStatus(incidentId: string, status: IncidentStatus | 'RESOLVED', io?: any): Promise<IIncident | null> {
    const incident = await Incident.findOneAndUpdate(
      { incidentId },
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).exec();

    if (incident && io) {
      io.emit('incident_updated', incident);
    }

    return incident;
  }
}
