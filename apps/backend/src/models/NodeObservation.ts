import mongoose, { Schema, Document } from 'mongoose';
import type { BehaviorPattern } from '@rescuenet/shared';

export interface INodeObservation extends Document {
  observationId: string;
  nodeId: string;
  eventType: BehaviorPattern;
  anomalyScore: number;
  confidence: number;
  featureSummary: Record<string, number>;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
}

const NodeObservationSchema = new Schema<INodeObservation>(
  {
    observationId: { type: String, required: true, unique: true, index: true },
    nodeId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    anomalyScore: { type: Number, required: true, min: 0, max: 1 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    // Privacy protection: strictly summary statistics, no raw audio or continuous accelerometer stream
    featureSummary: {
      type: Map,
      of: Number,
      required: true,
    },
    timestamp: { type: Number, required: true },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const NodeObservation = mongoose.model<INodeObservation>('NodeObservation', NodeObservationSchema);
