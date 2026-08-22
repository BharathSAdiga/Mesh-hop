import { z } from 'zod';

export const EventTypeSchema = z.enum([
  'SOS',
  'STRUCTURAL_COLLAPSE',
  'STAMPEDE',
  'FIRE',
  'FLOOD',
  'GENERAL_EMERGENCY',
  'BEHAVIORAL_ANOMALY',
]);

export const BehaviorPatternSchema = z.enum([
  'NORMAL',
  'SUDDEN_IMPACT',
  'RAPID_MOVEMENT',
  'COLLAPSE_PATTERN',
  'STAMPEDE_PATTERN',
]);

export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const PacketStatusSchema = z.enum([
  'PENDING',
  'TRANSMITTING',
  'DELIVERED',
  'FAILED',
  'EXPIRED',
]);

export const IncidentStatusSchema = z.enum([
  'CANDIDATE',
  'CORRELATED',
  'CONFIRMED',
]);

export const LocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
});

export const AuthMetadataSchema = z.object({
  hash: z.string(),
});

export const RescuePacketSchema = z.object({
  packetId: z.string().min(1),
  senderId: z.string().min(1),
  eventType: EventTypeSchema,
  timestamp: z.number().int().positive(),
  location: LocationSchema.optional(),
  anomalyScore: z.number().min(0).max(1),
  consensusScore: z.number().min(0).max(1),
  priority: PrioritySchema,
  ttl: z.number().int().nonnegative(),
  hopCount: z.number().int().nonnegative(),
  authMetadata: AuthMetadataSchema.optional(),
  createdAt: z.number().int().positive(),
});

export const CandidateEventSchema = z.object({
  anomalyScore: z.number().min(0).max(1),
  eventType: BehaviorPatternSchema,
  confidence: z.number().min(0).max(1),
  timestamp: z.number().int().positive(),
  featureSummary: z.record(z.string(), z.number()),
});

export const ConsensusResultSchema = z.object({
  consensusScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  participatingNodes: z.array(z.string()),
  eventType: EventTypeSchema,
  evidence: z.array(z.string()),
  status: IncidentStatusSchema,
  timestamp: z.number().int().positive(),
});
