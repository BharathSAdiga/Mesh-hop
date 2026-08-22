import { z } from 'zod';
import {
  EventTypeSchema,
  PrioritySchema,
  PacketStatusSchema,
  IncidentStatusSchema,
  LocationSchema,
  AuthMetadataSchema,
  RescuePacketSchema,
  BehaviorPatternSchema,
  CandidateEventSchema,
  ConsensusResultSchema,
  TransportStatusSchema,
} from './schemas';

export type EventType = z.infer<typeof EventTypeSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type PacketStatus = z.infer<typeof PacketStatusSchema>;
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type AuthMetadata = z.infer<typeof AuthMetadataSchema>;
export type RescuePacket = z.infer<typeof RescuePacketSchema>;
export type EmergencyPacket = RescuePacket; // Alias for backward compatibility
export type BehaviorPattern = z.infer<typeof BehaviorPatternSchema>;
export type CandidateEvent = z.infer<typeof CandidateEventSchema>;
export type ConsensusResult = z.infer<typeof ConsensusResultSchema>;
export type TransportStatus = z.infer<typeof TransportStatusSchema>;

export interface ConsensusWeights {
  behavioral: 0.30;
  temporal: 0.25;
  spatial: 0.25;
  eventType: 0.20;
}
