import mongoose, { Schema, Document } from 'mongoose';
import type { EventType, Priority } from '@rescuenet/shared';

export interface IPacket extends Document {
  packetId: string;
  senderId: string;
  eventType: EventType;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  anomalyScore: number;
  consensusScore: number;
  priority: Priority;
  ttl: number;
  hopCount: number;
  authMetadata?: {
    hash: string;
  };
  createdAt: number;
  receivedAt: Date;
}

const PacketSchema = new Schema<IPacket>(
  {
    packetId: { type: String, required: true, unique: true, index: true },
    senderId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    timestamp: { type: Number, required: true },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
    },
    anomalyScore: { type: Number, required: true, min: 0, max: 1 },
    consensusScore: { type: Number, required: true, min: 0, max: 1 },
    priority: { type: String, required: true, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    ttl: { type: Number, required: true },
    hopCount: { type: Number, required: true, default: 0 },
    authMetadata: {
      hash: { type: String },
    },
    createdAt: { type: Number, required: true },
    receivedAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
  }
);

export const Packet = mongoose.model<IPacket>('Packet', PacketSchema);
