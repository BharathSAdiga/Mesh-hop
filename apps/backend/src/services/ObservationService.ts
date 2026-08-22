import { NodeObservation, INodeObservation } from '../models/NodeObservation';
import { Incident } from '../models/Incident';
import { CandidateEventSchema } from '@rescuenet/shared';
import type { CandidateEvent } from '@rescuenet/shared';
import { v4 as uuidv4 } from 'uuid';

export interface IngestObservationInput extends CandidateEvent {
  nodeId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export class ObservationService {
  /**
   * Ingests, validates, and stores a candidate observation summary.
   * Strictly enforces privacy: no raw audio or sensor waveforms are stored.
   */
  static async ingestObservation(input: unknown, io?: any): Promise<{ success: boolean; observation?: INodeObservation; error?: string }> {
    const raw = input as any;
    if (!raw || typeof raw.nodeId !== 'string' || !raw.nodeId) {
      return { success: false, error: 'Missing required field: nodeId' };
    }

    let candidateEvent: CandidateEvent;
    try {
      candidateEvent = CandidateEventSchema.parse({
        anomalyScore: raw.anomalyScore,
        eventType: raw.eventType,
        confidence: raw.confidence,
        timestamp: raw.timestamp || Date.now(),
        featureSummary: raw.featureSummary || {},
      });
    } catch (err: any) {
      return { success: false, error: err?.message || 'Invalid candidate event schema' };
    }

    const observation = new NodeObservation({
      observationId: `obs_${uuidv4()}`,
      nodeId: raw.nodeId,
      eventType: candidateEvent.eventType,
      anomalyScore: candidateEvent.anomalyScore,
      confidence: candidateEvent.confidence,
      featureSummary: candidateEvent.featureSummary,
      timestamp: candidateEvent.timestamp,
      location: raw.location,
    });

    await observation.save();

    // Check for nearby / correlated observations in the last 60s
    const windowStart = candidateEvent.timestamp - 60000;
    const nearbyObservations = await NodeObservation.find({
      eventType: candidateEvent.eventType,
      timestamp: { $gte: windowStart },
    }).exec();

    const uniqueNodes = Array.from(new Set(nearbyObservations.map(o => o.nodeId)));

    // If 2 or more distinct nodes report the same anomaly, create or update a correlated incident
    if (uniqueNodes.length >= 2) {
      const avgScore = nearbyObservations.reduce((acc, o) => acc + o.anomalyScore, 0) / nearbyObservations.length;
      const consensusScore = Math.min(1.0, avgScore * 1.1);

      let incident = await Incident.findOne({
        eventType: candidateEvent.eventType,
        status: { $in: ['CANDIDATE', 'CORRELATED', 'CONFIRMED'] },
        timestamp: { $gte: windowStart },
      }).exec();

      if (!incident) {
        incident = new Incident({
          incidentId: `inc_${uuidv4()}`,
          packetId: `pkt_auto_${uuidv4()}`,
          eventType: candidateEvent.eventType,
          priority: consensusScore >= 0.75 ? 'CRITICAL' : 'HIGH',
          status: consensusScore >= 0.75 ? 'CONFIRMED' : 'CORRELATED',
          location: raw.location,
          anomalyScore: avgScore,
          consensusScore,
          participatingNodes: uniqueNodes,
          timestamp: candidateEvent.timestamp,
          ttl: 10,
        });
        await incident.save();

        if (io) {
          io.emit('new_incident', incident);
        }
      } else {
        incident.participatingNodes = uniqueNodes;
        incident.consensusScore = consensusScore;
        if (consensusScore >= 0.75) {
          incident.status = 'CONFIRMED';
        }
        await incident.save();

        if (io) {
          io.emit('incident_updated', incident);
        }
      }
    }

    if (io) {
      io.emit('new_observation', observation);
    }

    return { success: true, observation };
  }

  static async getObservations(limit = 100): Promise<INodeObservation[]> {
    return await NodeObservation.find().sort({ createdAt: -1 }).limit(limit).exec();
  }
}
