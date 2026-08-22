import { Gateway, IGateway } from '../models/Gateway';
import { Packet } from '../models/Packet';
import { NodeObservation } from '../models/NodeObservation';

export interface MeshNodeSummary {
  nodeId: string;
  lastSeenAt: Date;
  packetCount: number;
  observationCount: number;
  lastLocation?: {
    latitude: number;
    longitude: number;
  };
}

export class NodeRegistryService {
  /**
   * Registers or updates gateway heartbeat.
   */
  static async updateGatewayHeartbeat(
    gatewayId: string,
    data: { name?: string; status?: string; metrics?: any; location?: any } = {},
    io?: any
  ): Promise<IGateway> {
    const update: any = {
      lastSeenAt: new Date(),
    };
    if (data.name) update.name = data.name;
    if (data.status) update.status = data.status;
    if (data.metrics) update.metrics = data.metrics;
    if (data.location) update.location = data.location;

    const gateway = await Gateway.findOneAndUpdate(
      { gatewayId },
      { $set: update },
      { upsert: true, new: true }
    ).exec();

    if (io) {
      io.emit('gateway_status', gateway);
    }

    return gateway;
  }

  /**
   * Returns list of all registered gateways.
   */
  static async getGateways(): Promise<IGateway[]> {
    return await Gateway.find().sort({ lastSeenAt: -1 }).exec();
  }

  /**
   * Returns list of active mesh nodes aggregated from packets and observations.
   */
  static async getNodes(): Promise<MeshNodeSummary[]> {
    const nodeMap = new Map<string, MeshNodeSummary>();

    // 1. Scan recent packets
    const packets = await Packet.find().sort({ receivedAt: -1 }).limit(200).exec();
    for (const pkt of packets) {
      const existing = nodeMap.get(pkt.senderId);
      if (!existing) {
        nodeMap.set(pkt.senderId, {
          nodeId: pkt.senderId,
          lastSeenAt: pkt.receivedAt,
          packetCount: 1,
          observationCount: 0,
          lastLocation: pkt.location ? { latitude: pkt.location.latitude, longitude: pkt.location.longitude } : undefined,
        });
      } else {
        existing.packetCount += 1;
        if (pkt.receivedAt > existing.lastSeenAt) {
          existing.lastSeenAt = pkt.receivedAt;
          if (pkt.location) {
            existing.lastLocation = { latitude: pkt.location.latitude, longitude: pkt.location.longitude };
          }
        }
      }
    }

    // 2. Scan recent observations
    const observations = await NodeObservation.find().sort({ createdAt: -1 }).limit(200).exec();
    for (const obs of observations) {
      const existing = nodeMap.get(obs.nodeId);
      if (!existing) {
        nodeMap.set(obs.nodeId, {
          nodeId: obs.nodeId,
          lastSeenAt: obs.createdAt,
          packetCount: 0,
          observationCount: 1,
          lastLocation: obs.location,
        });
      } else {
        existing.observationCount += 1;
        if (obs.createdAt > existing.lastSeenAt) {
          existing.lastSeenAt = obs.createdAt;
          if (obs.location) {
            existing.lastLocation = obs.location;
          }
        }
      }
    }

    return Array.from(nodeMap.values()).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  }
}
