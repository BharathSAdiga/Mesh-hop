import { getDB } from '../db';
import type { StoredPacket, PacketState } from '../db';
import type { EmergencyPacket } from '@rescuenet/shared';

export class PacketRepository {
  
  static async savePacket(packet: EmergencyPacket, state: PacketState = 'PENDING'): Promise<void> {
    const db = await getDB();
    const storedPacket: StoredPacket = { ...packet, state, retryCount: 0 };
    await db.put('packets', storedPacket);
    await db.put('seenPackets', { packetId: packet.packetId, seenAt: Date.now() });
  }

  static async getPendingPackets(): Promise<StoredPacket[]> {
    const db = await getDB();
    const tx = db.transaction('packets', 'readonly');
    const index = tx.store.index('by-state');
    return await index.getAll('PENDING');
  }

  static async markDelivered(packetId: string): Promise<void> {
    await this.updateState(packetId, 'DELIVERED');
  }

  static async markFailed(packetId: string): Promise<void> {
    await this.updateState(packetId, 'FAILED');
  }

  static async retryFailed(packetId: string): Promise<void> {
    const db = await getDB();
    const packet = await db.get('packets', packetId);
    if (packet && packet.state === 'FAILED') {
      packet.state = 'PENDING';
      packet.retryCount += 1;
      await db.put('packets', packet);
    }
  }

  static async removeExpiredPackets(): Promise<number> {
    const db = await getDB();
    const tx = db.transaction('packets', 'readwrite');
    let cursor = await tx.store.openCursor();
    let expiredCount = 0;

    while (cursor) {
      if (cursor.value.ttl <= 0) {
        const packet = cursor.value;
        packet.state = 'EXPIRED';
        await cursor.update(packet);
        expiredCount++;
      }
      cursor = await cursor.continue();
    }
    await tx.done;
    return expiredCount;
  }

  static async getAllPackets(): Promise<StoredPacket[]> {
    const db = await getDB();
    return await db.getAll('packets');
  }

  static async hasSeenPacket(packetId: string): Promise<boolean> {
    const db = await getDB();
    const record = await db.get('seenPackets', packetId);
    return !!record;
  }

  private static async updateState(packetId: string, state: PacketState): Promise<void> {
    const db = await getDB();
    const packet = await db.get('packets', packetId);
    if (packet) {
      packet.state = state;
      await db.put('packets', packet);
    }
  }
}
