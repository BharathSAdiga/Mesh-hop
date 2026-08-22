import { RescuePacket, ConsensusResult, ConsensusWeights } from '@rescuenet/shared';
import { ObservationRegistry } from './ObservationRegistry';
import { SimilarityCalculator } from './SimilarityCalculator';

export interface ConsensusConfig {
  correlatedThreshold: number; // e.g., 0.5
  confirmedThreshold: number;  // e.g., 0.75
  minNodesForConsensus: number; // e.g., 2
}

const DEFAULT_WEIGHTS: ConsensusWeights = {
  behavioral: 0.30,
  temporal: 0.25,
  spatial: 0.25,
  eventType: 0.20,
};

export class ConsensusEngine {
  private registry: ObservationRegistry;
  private calculator: SimilarityCalculator;
  private config: ConsensusConfig;

  constructor(config: Partial<ConsensusConfig> = {}) {
    this.registry = new ObservationRegistry();
    this.calculator = new SimilarityCalculator();
    this.config = {
      correlatedThreshold: 0.5,
      confirmedThreshold: 0.75,
      minNodesForConsensus: 2,
      ...config,
    };
  }

  public processObservation(packet: RescuePacket): ConsensusResult {
    // SOS completely bypasses behavioral consensus
    if (packet.eventType === 'SOS') {
      return {
        consensusScore: 1.0,
        confidence: 1.0,
        participatingNodes: [packet.senderId],
        eventType: packet.eventType,
        evidence: [packet.packetId],
        status: 'CONFIRMED',
        timestamp: Date.now(),
      };
    }

    this.registry.addObservation(packet);
    const active = this.registry.getActiveObservations();

    // Group packets by event type to evaluate correlation
    // A more sophisticated system might cluster by space/time first.
    // For prototype, we evaluate all active matching the current packet's event type.
    const relevantPackets = active.filter(p => p.eventType === packet.eventType);

    if (relevantPackets.length < this.config.minNodesForConsensus) {
      return {
        consensusScore: 0,
        confidence: packet.anomalyScore, // Independent confidence
        participatingNodes: [packet.senderId],
        eventType: packet.eventType,
        evidence: [packet.packetId],
        status: 'CANDIDATE',
        timestamp: Date.now(),
      };
    }

    const similarity = this.calculator.calculateGroupSimilarity(relevantPackets);
    
    // Prototype formula
    const consensusScore = 
      (DEFAULT_WEIGHTS.behavioral * similarity.behavioralSimilarity) +
      (DEFAULT_WEIGHTS.temporal * similarity.temporalSimilarity) +
      (DEFAULT_WEIGHTS.spatial * similarity.spatialSimilarity) +
      (DEFAULT_WEIGHTS.eventType * similarity.eventTypeSimilarity);

    let status: 'CANDIDATE' | 'CORRELATED' | 'CONFIRMED' = 'CANDIDATE';
    
    if (consensusScore >= this.config.confirmedThreshold) {
      status = 'CONFIRMED';
    } else if (consensusScore >= this.config.correlatedThreshold) {
      status = 'CORRELATED';
    }

    // Unique participating nodes
    const participatingNodes = Array.from(new Set(relevantPackets.map(p => p.senderId)));
    const evidence = relevantPackets.map(p => p.packetId);
    
    // Confidence is elevated by high consensus and more nodes
    const confidence = Math.min(1.0, consensusScore * (1 + (participatingNodes.length * 0.1)));

    return {
      consensusScore,
      confidence,
      participatingNodes,
      eventType: packet.eventType,
      evidence,
      status,
      timestamp: Date.now(),
    };
  }
}
