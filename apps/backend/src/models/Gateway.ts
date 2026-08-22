import mongoose, { Schema, Document } from 'mongoose';

export interface IGateway extends Document {
  gatewayId: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'BACKHAUL_UNAVAILABLE' | 'SYNCING';
  lastSeenAt: Date;
  metrics?: Record<string, any>;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GatewaySchema = new Schema<IGateway>(
  {
    gatewayId: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: 'Gateway Node' },
    status: {
      type: String,
      required: true,
      enum: ['ONLINE', 'OFFLINE', 'BACKHAUL_UNAVAILABLE', 'SYNCING'],
      default: 'ONLINE',
      index: true,
    },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    metrics: { type: Schema.Types.Mixed },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

export const Gateway = mongoose.model<IGateway>('Gateway', GatewaySchema);
