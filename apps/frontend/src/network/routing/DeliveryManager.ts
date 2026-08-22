import type { RescuePacket } from '@rescuenet/shared';
import type { StoredPacket, PacketState } from '../../storage/db';
import { PacketRepository } from '../../storage/repositories/PacketRepository';

export class DeliveryManager {
  private seenPacketIds = new Set<string>();

  async isDuplicate(packetId: string): Promise<boolean> {
    if (this.seenPacketIds.has(packetId)) {
      return true;
    }
    const seenInDB = await PacketRepository.hasSeenPacket(packetId).catch(() => false);
    if (seenInDB) {
      this.seenPacketIds.add(packetId);
      return true;
    }
    return false;
  }

  recordSeen(packetId: string): void {
    this.seenPacketIds.add(packetId);
  }

  async persistPacket(packet: RescuePacket, state: PacketState = 'PENDING', retryCount: number = 0, lastAttemptAt?: number): Promise<StoredPacket> {
    const stored: StoredPacket = {
      ...packet,
      state,
      retryCount,
      lastAttemptAt,
    };
    await PacketRepository.savePacket(stored, state).catch(() => {});
    this.recordSeen(packet.packetId);
    return stored;
  }

  async markDelivered(packetId: string): Promise<void> {
    await PacketRepository.markDelivered(packetId).catch(() => {});
  }

  async markFailed(packetId: string): Promise<void> {
    await PacketRepository.markFailed(packetId).catch(() => {});
  }

  async markExpired(packetId: string): Promise<void> {
    const dbPacket = await PacketRepository.getAllPackets().then(all => all.find(p => p.packetId === packetId)).catch(() => null);
    if (dbPacket) {
      await PacketRepository.savePacket(dbPacket, 'EXPIRED').catch(() => {});
    }
  }

  async cleanupExpired(): Promise<number> {
    return await PacketRepository.removeExpiredPackets().catch(() => 0);
  }

  clearSeen(): void {
    this.seenPacketIds.clear();
  }
}
