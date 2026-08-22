import type { RescuePacket } from '@rescuenet/shared';

export type GatewayState = 
  | 'ONLINE'
  | 'OFFLINE'
  | 'BACKHAUL_UNAVAILABLE'
  | 'SYNCING';

export interface GatewayMetrics {
  receivedCount: number;
  pendingCount: number;
  uploadedCount: number;
  failedCount: number;
  duplicateCount: number;
  lastSyncAt: number | null;
}

export interface GatewayStatus {
  gatewayId: string;
  state: GatewayState;
  backendUrl: string;
  isBackendConnected: boolean;
  metrics: GatewayMetrics;
  uptimeSeconds: number;
}

export interface StoredGatewayPacket {
  packet: RescuePacket;
  status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  retryCount: number;
  receivedAt: number;
  lastAttemptAt?: number;
}
