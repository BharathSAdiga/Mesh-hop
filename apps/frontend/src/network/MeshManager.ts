import type { RescuePacket, Priority } from '@rescuenet/shared';
import { validatePacket, decrementTTL, isExpired } from '@rescuenet/shared';
import type { TransportAdapter } from './transports/TransportAdapter';
import { PacketRepository } from '../storage/repositories/PacketRepository';

export type PacketProcessingResult = 
  | 'VALIDATED_AND_QUEUED'
  | 'DROP_DUPLICATE'
  | 'EXPIRED'
  | 'FORWARDED'
  | 'DELIVERED'
  | 'FAILED';

export interface QueuedPacket {
  packet: RescuePacket;
  priorityScore: number;
  retryCount: number;
  addedAt: number;
}

const PRIORITY_ORDER: Record<Priority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export class MeshManager {
  readonly nodeId: string;
  private transports: TransportAdapter[] = [];
  private seenPackets = new Set<string>();
  private outboundQueue: QueuedPacket[] = [];
  private isProcessing = false;
  private isGateway: boolean;
  private onPacketReceivedCallbacks: ((packet: RescuePacket, action: PacketProcessingResult) => void)[] = [];

  constructor(nodeId: string, isGateway: boolean = false) {
    this.nodeId = nodeId;
    this.isGateway = isGateway;
  }

  registerTransport(transport: TransportAdapter): void {
    this.transports.push(transport);
  }

  async initialize(): Promise<void> {
    for (const transport of this.transports) {
      await transport.initialize();
      await transport.startListening((packet) => this.handleIncomingPacket(packet));
    }
  }

  onPacket(callback: (packet: RescuePacket, action: PacketProcessingResult) => void): () => void {
    this.onPacketReceivedCallbacks.push(callback);
    return () => {
      this.onPacketReceivedCallbacks = this.onPacketReceivedCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Originates a new packet on this node.
   * FLOW: CREATE -> STORE -> QUEUE -> SEND
   */
  async createAndSendPacket(packet: RescuePacket): Promise<PacketProcessingResult> {
    // 1. VALIDATE
    const validated = validatePacket(packet);

    // 2. DEDUPLICATE (Register seen)
    this.seenPackets.add(validated.packetId);

    // 3. STORE LOCALLY
    await this.persistLocally(validated, 'PENDING');

    // 4. QUEUE with Priority
    this.enqueue(validated);

    // 5. SEND / PROCESS QUEUE
    this.processQueue();

    return 'VALIDATED_AND_QUEUED';
  }

  /**
   * Handles incoming packet from a transport adapter.
   * FLOW: RECEIVE -> VALIDATE -> DEDUPLICATE -> TTL CHECK -> STORE -> FORWARD
   */
  async handleIncomingPacket(rawPacket: unknown): Promise<PacketProcessingResult> {
    let packet: RescuePacket;

    // 1. VALIDATE
    try {
      packet = validatePacket(rawPacket);
    } catch (err) {
      console.warn(`[MeshManager:${this.nodeId}] Malformed packet rejected:`, err);
      return 'FAILED';
    }

    // 2. DEDUPLICATE Check
    if (this.seenPackets.has(packet.packetId)) {
      this.notifyListeners(packet, 'DROP_DUPLICATE');
      return 'DROP_DUPLICATE';
    }

    const alreadySeenInDB = await PacketRepository.hasSeenPacket(packet.packetId).catch(() => false);
    if (alreadySeenInDB) {
      this.seenPackets.add(packet.packetId);
      this.notifyListeners(packet, 'DROP_DUPLICATE');
      return 'DROP_DUPLICATE';
    }

    this.seenPackets.add(packet.packetId);

    // 3. TTL CHECK
    if (isExpired(packet)) {
      await this.persistLocally(packet, 'EXPIRED');
      this.notifyListeners(packet, 'EXPIRED');
      return 'EXPIRED';
    }

    // 4. STORE
    await this.persistLocally(packet, 'PENDING');

    // If this node is the destination/gateway
    if (this.isGateway) {
      await this.persistLocally(packet, 'DELIVERED');
      this.notifyListeners(packet, 'DELIVERED');
      return 'DELIVERED';
    }

    // 5. FORWARD: Decrement TTL, increment hopCount, enqueue
    const forwardedPacket = decrementTTL(packet);
    if (isExpired(forwardedPacket)) {
      await this.persistLocally(forwardedPacket, 'EXPIRED');
      this.notifyListeners(forwardedPacket, 'EXPIRED');
      return 'EXPIRED';
    }

    this.enqueue(forwardedPacket);
    this.notifyListeners(packet, 'FORWARDED');
    this.processQueue();

    return 'FORWARDED';
  }

  private enqueue(packet: RescuePacket): void {
    const priorityScore = PRIORITY_ORDER[packet.priority] || 1;
    const queuedItem: QueuedPacket = {
      packet,
      priorityScore,
      retryCount: 0,
      addedAt: Date.now(),
    };

    this.outboundQueue.push(queuedItem);

    // Sort priority queue: Highest priority first, then oldest addedAt
    this.outboundQueue.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return a.addedAt - b.addedAt;
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.outboundQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.outboundQueue.length > 0) {
      const item = this.outboundQueue.shift();
      if (!item) break;

      const { packet } = item;

      // Mark TRANSMITTING locally
      await this.persistLocally(packet, 'TRANSMITTING');

      let anySuccess = false;
      for (const transport of this.transports) {
        const sent = await transport.sendPacket(packet);
        if (sent) {
          anySuccess = true;
        }
      }

      if (anySuccess) {
        await this.persistLocally(packet, 'DELIVERED');
      } else {
        // Retry logic
        if (item.retryCount < 3) {
          item.retryCount++;
          // Re-insert into queue with penalty
          this.outboundQueue.push(item);
          await this.persistLocally(packet, 'PENDING');
        } else {
          await this.persistLocally(packet, 'FAILED');
        }
      }
    }

    this.isProcessing = false;
  }

  private async persistLocally(packet: RescuePacket, state: 'PENDING' | 'TRANSMITTING' | 'DELIVERED' | 'FAILED' | 'EXPIRED'): Promise<void> {
    try {
      await PacketRepository.savePacket(packet, state);
    } catch {
      // In isolated/mock environments without IndexedDB, continue gracefully
    }
  }

  private notifyListeners(packet: RescuePacket, action: PacketProcessingResult): void {
    for (const callback of this.onPacketReceivedCallbacks) {
      try {
        callback(packet, action);
      } catch (err) {
        console.error('[MeshManager] Callback error', err);
      }
    }
  }

  getQueue(): QueuedPacket[] {
    return [...this.outboundQueue];
  }

  clear(): void {
    this.outboundQueue = [];
    this.seenPackets.clear();
  }
}
