import { io, Socket } from 'socket.io-client';
import type { RescuePacket } from '@rescuenet/shared';
import { validatePacket } from '@rescuenet/shared';
import { GatewayStorage } from '../storage/GatewayStorage';
import type { GatewayState, GatewayStatus, GatewayMetrics, StoredGatewayPacket } from '../types';

export interface GatewayConfig {
  gatewayId: string;
  backendUrl: string;
  maxRetries: number;
  syncIntervalMs: number;
  storageDir?: string;
}

export type IngestResult = 
  | { success: true; action: 'UPLOADED' | 'QUEUED_OFFLINE'; packetId: string }
  | { success: false; action: 'DROP_DUPLICATE' | 'INVALID_PACKET' | 'UPLOAD_FAILED'; packetId?: string; error?: string };

export class GatewayService {
  readonly gatewayId: string;
  private backendUrl: string;
  private storage: GatewayStorage;
  private state: GatewayState = 'OFFLINE';
  private backendSocket: Socket | null = null;
  private startTime = Date.now();
  private maxRetries: number;
  private isSimulatedOffline = false;
  private isSyncing = false;

  private metrics: GatewayMetrics = {
    receivedCount: 0,
    pendingCount: 0,
    uploadedCount: 0,
    failedCount: 0,
    duplicateCount: 0,
    lastSyncAt: null,
  };

  private listeners: ((status: GatewayStatus) => void)[] = [];

  constructor(config: Partial<GatewayConfig> = {}) {
    this.gatewayId = config.gatewayId || `gateway_${Math.random().toString(36).substring(2, 9)}`;
    this.backendUrl = config.backendUrl || 'http://localhost:3000';
    this.maxRetries = config.maxRetries || 3;
    this.storage = new GatewayStorage(config.storageDir);
    this.refreshMetrics();
  }

  async start(): Promise<void> {
    this.state = 'BACKHAUL_UNAVAILABLE';
    this.connectToBackend();
    this.refreshMetrics();
  }

  private connectToBackend(): void {
    if (this.backendSocket) {
      return;
    }

    try {
      this.backendSocket = io(this.backendUrl, {
        reconnection: true,
        reconnectionDelay: 2000,
        timeout: 5000,
      });

      this.backendSocket.on('connect', () => {
        if (!this.isSimulatedOffline) {
          this.state = 'ONLINE';
          this.syncPendingQueue();
        }
      });

      this.backendSocket.on('disconnect', () => {
        if (this.state !== 'OFFLINE') {
          this.state = 'BACKHAUL_UNAVAILABLE';
          this.emitStatus();
        }
      });

      this.backendSocket.on('connect_error', () => {
        if (this.state !== 'OFFLINE') {
          this.state = 'BACKHAUL_UNAVAILABLE';
          this.emitStatus();
        }
      });
    } catch (err) {
      this.state = 'BACKHAUL_UNAVAILABLE';
    }
  }

  /**
   * Receives a packet from local mesh node (HTTP REST or WebSocket).
   */
  async ingestPacket(rawPacket: unknown): Promise<IngestResult> {
    this.metrics.receivedCount++;

    // 1. Validate
    let packet: RescuePacket;
    try {
      packet = validatePacket(rawPacket);
    } catch (err: any) {
      this.refreshMetrics();
      return { success: false, action: 'INVALID_PACKET', error: err?.message || 'Invalid packet schema' };
    }

    // 2. Deduplicate
    if (this.storage.hasSeenPacket(packet.packetId)) {
      this.metrics.duplicateCount++;
      this.refreshMetrics();
      return { success: false, action: 'DROP_DUPLICATE', packetId: packet.packetId, error: 'Duplicate packet already processed' };
    }

    // 3. Check Backhaul availability
    const isBackhaulAvailable = !this.isSimulatedOffline && 
      this.backendSocket && 
      this.backendSocket.connected && 
      this.state === 'ONLINE';

    if (isBackhaulAvailable) {
      // Direct Upload
      const uploaded = await this.uploadToBackend(packet);
      if (uploaded) {
        this.storage.savePacket(packet, 'UPLOADED');
        this.metrics.uploadedCount++;
        this.metrics.lastSyncAt = Date.now();
        this.refreshMetrics();
        return { success: true, action: 'UPLOADED', packetId: packet.packetId };
      }
    }

    // If backhaul unavailable or direct upload failed -> store in local queue as PENDING
    this.storage.savePacket(packet, 'PENDING');
    this.refreshMetrics();
    return { success: true, action: 'QUEUED_OFFLINE', packetId: packet.packetId };
  }

  /**
   * Automatically drains the local pending queue when backend connectivity returns.
   */
  async syncPendingQueue(): Promise<void> {
    if (this.isSyncing || this.isSimulatedOffline || !this.backendSocket || !this.backendSocket.connected) {
      return;
    }

    this.isSyncing = true;
    this.state = 'SYNCING';
    this.emitStatus();

    const pendingItems = this.storage.getPendingPackets();

    for (const item of pendingItems) {
      if (this.isSimulatedOffline || !this.backendSocket.connected) {
        this.state = 'BACKHAUL_UNAVAILABLE';
        break;
      }

      this.storage.updatePacketStatus(item.packet.packetId, 'UPLOADING');
      const success = await this.uploadToBackend(item.packet);

      if (success) {
        this.storage.updatePacketStatus(item.packet.packetId, 'UPLOADED');
        this.metrics.uploadedCount++;
      } else {
        if (item.retryCount < this.maxRetries) {
          this.storage.updatePacketStatus(item.packet.packetId, 'PENDING', true);
        } else {
          this.storage.updatePacketStatus(item.packet.packetId, 'FAILED', true);
          this.metrics.failedCount++;
        }
      }
    }

    this.metrics.lastSyncAt = Date.now();
    this.isSyncing = false;
    this.state = this.backendSocket.connected && !this.isSimulatedOffline ? 'ONLINE' : 'BACKHAUL_UNAVAILABLE';
    this.refreshMetrics();
  }

  private uploadToBackend(packet: RescuePacket): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.backendSocket || !this.backendSocket.connected || this.isSimulatedOffline) {
        resolve(false);
        return;
      }

      try {
        this.backendSocket.emit('emergency_packet', packet);
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Simulator toggle for Internet ON / OFF.
   */
  setSimulatedInternet(enabled: boolean): void {
    this.isSimulatedOffline = !enabled;
    if (enabled) {
      this.state = this.backendSocket && this.backendSocket.connected ? 'ONLINE' : 'BACKHAUL_UNAVAILABLE';
      this.syncPendingQueue();
    } else {
      this.state = 'BACKHAUL_UNAVAILABLE';
    }
    this.emitStatus();
  }

  getStatus(): GatewayStatus {
    const isConnected = !this.isSimulatedOffline && !!this.backendSocket && this.backendSocket.connected;
    return {
      gatewayId: this.gatewayId,
      state: this.state,
      backendUrl: this.backendUrl,
      isBackendConnected: isConnected,
      metrics: { ...this.metrics },
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  getStorage(): GatewayStorage {
    return this.storage;
  }

  onStatusChange(callback: (status: GatewayStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private refreshMetrics(): void {
    const pending = this.storage.getPendingPackets().length;
    const all = this.storage.getAllPackets();
    const uploaded = all.filter(p => p.status === 'UPLOADED').length;
    const failed = all.filter(p => p.status === 'FAILED').length;

    this.metrics.pendingCount = pending;
    this.metrics.uploadedCount = uploaded;
    this.metrics.failedCount = failed;
    this.emitStatus();
  }

  private emitStatus(): void {
    const status = this.getStatus();
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch {}
    }
  }

  async stop(): Promise<void> {
    this.state = 'OFFLINE';
    if (this.backendSocket) {
      this.backendSocket.disconnect();
      this.backendSocket = null;
    }
    this.emitStatus();
  }
}
