import type { Priority } from '@rescuenet/shared';
import type { StoredPacket } from '../../storage/db';

const PRIORITY_WEIGHTS: Record<Priority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export interface QueuedItem {
  packet: StoredPacket;
  priorityScore: number;
  enqueuedAt: number;
}

export class ForwardingQueue {
  private queue: QueuedItem[] = [];

  enqueue(packet: StoredPacket): void {
    // Prevent duplicate entries of the same packet in queue
    const existingIndex = this.queue.findIndex(item => item.packet.packetId === packet.packetId);
    if (existingIndex !== -1) {
      this.queue[existingIndex].packet = packet;
      return;
    }

    const priorityScore = PRIORITY_WEIGHTS[packet.priority] || 1;
    const item: QueuedItem = {
      packet,
      priorityScore,
      enqueuedAt: Date.now(),
    };

    this.queue.push(item);
    this.sort();
  }

  dequeue(): StoredPacket | undefined {
    const item = this.queue.shift();
    return item?.packet;
  }

  peek(): StoredPacket | undefined {
    return this.queue[0]?.packet;
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  getPackets(): StoredPacket[] {
    return this.queue.map(item => item.packet);
  }

  remove(packetId: string): boolean {
    const initialLen = this.queue.length;
    this.queue = this.queue.filter(item => item.packet.packetId !== packetId);
    return this.queue.length < initialLen;
  }

  clear(): void {
    this.queue = [];
  }

  private sort(): void {
    this.queue.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore; // Highest priority first
      }
      return a.packet.createdAt - b.packet.createdAt; // FIFO for equal priority
    });
  }
}
