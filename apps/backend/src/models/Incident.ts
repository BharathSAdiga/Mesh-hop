import mongoose, { Schema, Document } from 'mongoose';
import type { EventType, Priority, IncidentStatus } from '@rescuenet/shared';

export interface IIncident extends Document {
  incidentId: string;
  packetId: string;
  eventType: EventType;
  priority: Priority;
  status: IncidentStatus | 'RESOLVED';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  anomalyScore: number;
  consensusScore: number;
  participatingNodes: string[];
  timestamp: number;
  ttl: number;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    incidentId: { type: String, required: true, unique: true, index: true },
    packetId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    priority: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'HIGH',
    },
    status: {
      type: String,
      required: true,
      enum: ['CANDIDATE', 'CORRELATED', 'CONFIRMED', 'RESOLVED'],
      default: 'CONFIRMED',
      index: true,
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
    },
    anomalyScore: { type: Number, required: true, min: 0, max: 1 },
    consensusScore: { type: Number, required: true, min: 0, max: 1 },
    participatingNodes: [{ type: String }],
    timestamp: { type: Number, required: true },
    ttl: { type: Number, required: true, default: 10 },
  },
  {
    timestamps: true,
  }
);

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);
