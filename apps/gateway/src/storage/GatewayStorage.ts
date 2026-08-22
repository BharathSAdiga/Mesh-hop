import fs from 'fs';
import path from 'path';
import type { RescuePacket } from '@rescuenet/shared';
import type { StoredGatewayPacket } from '../types';

export class GatewayStorage {
  private filePath: string;
  private packets: Map<string, StoredGatewayPacket> = new Map();
  private seenPacketIds: Set<string> = new Set();

  constructor(storageDir?: string) {
    const dir = storageDir || path.join(process.cwd(), '.gateway_data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    this.filePath = path.join(dir, 'packets.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data: StoredGatewayPacket[] = JSON.parse(raw);
        for (const item of data) {
          this.packets.set(item.packet.packetId, item);
          this.seenPacketIds.add(item.packet.packetId);
        }
      } catch (err) {
        console.warn('[GatewayStorage] Failed to read disk storage, starting fresh', err);
      }
    }
  }

  private saveToDisk(): void {
    try {
      const data = Array.from(this.packets.values());
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[GatewayStorage] Failed to write to disk', err);
    }
  }

  hasSeenPacket(packetId: string): boolean {
    return this.seenPacketIds.has(packetId);
  }

  savePacket(packet: RescuePacket, status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED' = 'PENDING'): StoredGatewayPacket {
    this.seenPacketIds.add(packet.packetId);
    const existing = this.packets.get(packet.packetId);
    const stored: StoredGatewayPacket = {
      packet,
      status,
      retryCount: existing ? existing.retryCount : 0,
      receivedAt: existing ? existing.receivedAt : Date.now(),
      lastAttemptAt: existing ? existing.lastAttemptAt : undefined,
    };
    this.packets.set(packet.packetId, stored);
    this.saveToDisk();
    return stored;
  }

  updatePacketStatus(packetId: string, status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED', retryIncrement: boolean = false): void {
    const item = this.packets.get(packetId);
    if (item) {
      item.status = status;
      item.lastAttemptAt = Date.now();
      if (retryIncrement) {
        item.retryCount += 1;
      }
      this.packets.set(packetId, item);
      this.saveToDisk();
    }
  }

  getPendingPackets(): StoredGatewayPacket[] {
    return Array.from(this.packets.values())
      .filter(item => item.status === 'PENDING' || item.status === 'UPLOADING')
      .sort((a, b) => {
        // Sort by priority (CRITICAL first) then arrival time
        const priorityWeight = (p: string) => (p === 'CRITICAL' ? 4 : p === 'HIGH' ? 3 : p === 'MEDIUM' ? 2 : 1);
        const diff = priorityWeight(b.packet.priority) - priorityWeight(a.packet.priority);
        if (diff !== 0) return diff;
        return a.receivedAt - b.receivedAt;
      });
  }

  getAllPackets(): StoredGatewayPacket[] {
    return Array.from(this.packets.values());
  }

  clear(): void {
    this.packets.clear();
    this.seenPacketIds.clear();
    this.saveToDisk();
  }
}
