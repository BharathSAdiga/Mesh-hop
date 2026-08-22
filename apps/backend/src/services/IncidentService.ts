import { Incident, IIncident } from '../models/Incident';
import type { RescuePacket, IncidentStatus } from '@rescuenet/shared';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

// In-memory fallback for development / offline runs without standalone Mongo
const inMemoryIncidents: IIncident[] = [];

export class IncidentService {
  /**
   * Returns list of active or filtered incidents.
   */
  static async getIncidents(query: { status?: string; eventType?: string; limit?: number } = {}): Promise<IIncident[]> {
    const isMongoConnected = mongoose.connection.readyState === 1;
    const limit = query.limit || 50;

    if (isMongoConnected) {
      try {
        const filter: any = {};
        if (query.status) {
          filter.status = query.status;
        }
        if (query.eventType) {
          filter.eventType = query.eventType;
        }
        return await Incident.find(filter).sort({ createdAt: -1 }).limit(limit).exec();
      } catch {
        // Fallback to in-memory
      }
    }

    let filtered = [...inMemoryIncidents];
    if (query.status) {
      filtered = filtered.filter(i => i.status === query.status);
    }
    if (query.eventType) {
      filtered = filtered.filter(i => i.eventType === query.eventType);
    }
    return filtered.slice(0, limit);
  }

  /**
   * Finds incident by ID.
   */
  static async getIncidentById(incidentId: string): Promise<IIncident | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        return await Incident.findOne({ incidentId }).exec();
      } catch {
        // Fallback
      }
    }
    return inMemoryIncidents.find(i => i.incidentId === incidentId) || null;
  }

  /**
   * Creates or updates an incident from a confirmed packet or manual SOS.
   */
  static async createOrUpdateFromPacket(packet: RescuePacket, io?: any): Promise<IIncident> {
    const isMongoConnected = mongoose.connection.readyState === 1;

    let incident: any = null;

    if (isMongoConnected) {
      try {
        incident = await Incident.findOne({ packetId: packet.packetId }).exec();
      } catch {
        incident = inMemoryIncidents.find(i => i.packetId === packet.packetId);
      }
    } else {
      incident = inMemoryIncidents.find(i => i.packetId === packet.packetId);
    }

    if (!incident) {
      const incidentData = {
        incidentId: `inc_${uuidv4().slice(0, 8)}`,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (isMongoConnected) {
        try {
          const doc = new Incident(incidentData);
          incident = await doc.save();
        } catch {
          inMemoryIncidents.unshift(incidentData as any);
          incident = incidentData;
        }
      } else {
        inMemoryIncidents.unshift(incidentData as any);
        incident = incidentData;
      }

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

      if (isMongoConnected && typeof incident.save === 'function') {
        try {
          await incident.save();
        } catch {
          // In-memory update
        }
      }

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
    let incident: any = null;

    if (mongoose.connection.readyState === 1) {
      try {
        incident = await Incident.findOneAndUpdate(
          { incidentId },
          { $set: { status, updatedAt: new Date() } },
          { new: true }
        ).exec();
      } catch {
        // Fallback
      }
    }

    if (!incident) {
      incident = inMemoryIncidents.find(i => i.incidentId === incidentId);
      if (incident) {
        incident.status = status;
        incident.updatedAt = new Date();
      }
    }

    if (incident && io) {
      io.emit('incident_updated', incident);
    }

    return incident;
  }
}
