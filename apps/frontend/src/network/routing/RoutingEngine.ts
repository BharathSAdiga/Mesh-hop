import type { RescuePacket } from '@rescuenet/shared';
import { validatePacket, decrementTTL, isExpired } from '@rescuenet/shared';
import type { TransportAdapter } from '../transports/TransportAdapter';
import type { StoredPacket } from '../../storage/db';
import { ForwardingQueue } from './ForwardingQueue';
import { RetryManager } from './RetryManager';
import { DeliveryManager } from './DeliveryManager';

export type RoutingAction = 
  | 'STORED_PENDING'
  | 'QUEUED'
  | 'TRANSMITTING'
  | 'DELIVERED'
  | 'FORWARDED'
  | 'DROP_DUPLICATE'
  | 'EXPIRED'
  | 'FAILED_MAX_RETRIES'
  | 'RETRY_SCHEDULED'
  | 'INVALID_PACKET';

export interface RoutingEvent {
  packet: StoredPacket | RescuePacket;
  action: RoutingAction;
  timestamp: number;
  details?: string;
}

export class RoutingEngine {
  readonly nodeId: string;
  private isGateway: boolean;
  private transports: TransportAdapter[] = [];
  private isRelayAvailable = false;
  private isDraining = false;

  readonly queue = new ForwardingQueue();
  readonly retryManager = new RetryManager();
  readonly deliveryManager = new DeliveryManager();

  private listeners: ((event: RoutingEvent) => void)[] = [];

  constructor(nodeId: string, isGateway: boolean = false) {
    this.nodeId = nodeId;
    this.isGateway = isGateway;
  }

  registerTransport(transport: TransportAdapter): void {
    this.transports.push(transport);
    this.checkRelayAvailability();
  }

  setRelayAvailable(available: boolean): void {
    const changed = this.isRelayAvailable !== available;
    this.isRelayAvailable = available;
    if (changed && available) {
      this.drainQueue();
    }
  }

  getRelayAvailable(): boolean {
    return this.isRelayAvailable;
  }

  onRoutingEvent(callback: (event: RoutingEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Originates a new packet locally.
   * If no relay is available, packet goes to local storage as PENDING.
   * If relay is available, packet is queued and transmitted.
   */
  async ingestLocalPacket(packet: RescuePacket): Promise<RoutingAction> {
    // 1. Validate packet
    let validated: RescuePacket;
    try {
      validated = validatePacket(packet);
    } catch {
      this.emitEvent(packet as StoredPacket, 'INVALID_PACKET', 'Validation failed');
      return 'INVALID_PACKET';
    }

    // 2. Check duplicate
    const isDup = await this.deliveryManager.isDuplicate(validated.packetId);
    if (isDup) {
      this.emitEvent(validated as StoredPacket, 'DROP_DUPLICATE', 'Duplicate packet suppressed');
      return 'DROP_DUPLICATE';
    }

    // 3. Check TTL
    if (isExpired(validated)) {
      await this.deliveryManager.persistPacket(validated, 'EXPIRED');
      this.emitEvent(validated as StoredPacket, 'EXPIRED', 'TTL expired');
      return 'EXPIRED';
    }

    // 4. Store locally as PENDING
    const stored = await this.deliveryManager.persistPacket(validated, 'PENDING');
    this.emitEvent(stored, 'STORED_PENDING', 'Saved to local storage as PENDING');

    // 5. Queue by priority
    this.queue.enqueue(stored);
    this.emitEvent(stored, 'QUEUED', 'Added to priority queue');

    // 6. If relay is available, drain queue immediately
    if (this.isRelayAvailable) {
      await this.drainQueue();
      return 'TRANSMITTING';
    }

    return 'STORED_PENDING';
  }

  /**
   * Executes the exact 8-step forwarding protocol on an incoming or queued packet:
   * 1. validate packet
   * 2. check duplicate
   * 3. check TTL
   * 4. decrement TTL
   * 5. increment hopCount
   * 6. persist updated packet
   * 7. queue by priority
   * 8. transmit
   */
  async forwardPacket(rawPacket: unknown): Promise<RoutingAction> {
    // Step 1: Validate packet
    let packet: RescuePacket;
    try {
      packet = validatePacket(rawPacket);
    } catch {
      this.emitEvent(rawPacket as StoredPacket, 'INVALID_PACKET', 'Validation failed');
      return 'INVALID_PACKET';
    }

    // Step 2: Check duplicate
    const isDup = await this.deliveryManager.isDuplicate(packet.packetId);
    if (isDup) {
      this.emitEvent(packet as StoredPacket, 'DROP_DUPLICATE', 'Duplicate packet suppressed');
      return 'DROP_DUPLICATE';
    }

    // Step 3: Check TTL
    if (isExpired(packet)) {
      await this.deliveryManager.persistPacket(packet, 'EXPIRED');
      this.emitEvent(packet as StoredPacket, 'EXPIRED', 'TTL <= 0');
      return 'EXPIRED';
    }

    // If this node is the destination Gateway
    if (this.isGateway) {
      const delivered = await this.deliveryManager.persistPacket(packet, 'DELIVERED');
      this.emitEvent(delivered, 'DELIVERED', 'Delivered to destination Gateway');
      return 'DELIVERED';
    }

    // Step 4 & 5: Decrement TTL & increment hopCount
    const updatedPacket = decrementTTL(packet);

    if (isExpired(updatedPacket)) {
      await this.deliveryManager.persistPacket(updatedPacket, 'EXPIRED');
      this.emitEvent(updatedPacket as StoredPacket, 'EXPIRED', 'TTL <= 0 after hop');
      return 'EXPIRED';
    }

    // Step 6: Persist updated packet
    const stored = await this.deliveryManager.persistPacket(updatedPacket, 'PENDING');

    // Step 7: Queue by priority
    this.queue.enqueue(stored);
    this.emitEvent(stored, 'QUEUED', 'Queued for transmission');

    // Step 8: Transmit (if relay available)
    if (this.isRelayAvailable) {
      await this.drainQueue();
      return 'FORWARDED';
    }

    this.emitEvent(stored, 'STORED_PENDING', 'Store-and-Carry: awaiting relay encounter');
    return 'STORED_PENDING';
  }

  /**
   * Drains the forwarding queue in strict priority order.
   */
  async drainQueue(): Promise<void> {
    if (this.isDraining || this.queue.isEmpty() || !this.isRelayAvailable) {
      return;
    }

    this.isDraining = true;

    while (!this.queue.isEmpty() && this.isRelayAvailable) {
      const packet = this.queue.peek();
      if (!packet) break;

      // Update state to TRANSMITTING
      await this.deliveryManager.persistPacket(packet, 'TRANSMITTING', packet.retryCount, Date.now());
      this.emitEvent(packet, 'TRANSMITTING', 'Attempting transmission');

      let transmissionSuccess = false;

      for (const transport of this.transports) {
        const success = await transport.sendPacket(packet);
        if (success) {
          transmissionSuccess = true;
          break;
        }
      }

      if (transmissionSuccess) {
        // Success: Dequeue and mark DELIVERED
        this.queue.dequeue();
        const delivered = await this.deliveryManager.persistPacket(packet, 'DELIVERED', packet.retryCount, Date.now());
        this.emitEvent(delivered, 'DELIVERED', 'Transmission succeeded');
      } else {
        // Transmission failed: evaluate retry
        if (this.retryManager.shouldRetry(packet)) {
          const retriedPacket = this.retryManager.recordAttempt(packet);
          await this.deliveryManager.persistPacket(retriedPacket, 'PENDING', retriedPacket.retryCount, retriedPacket.lastAttemptAt);
          this.emitEvent(retriedPacket, 'RETRY_SCHEDULED', `Retry ${retriedPacket.retryCount}/${this.retryManager.getMaxRetries()}`);
          
          // Move from peek to back of same priority tier
          this.queue.dequeue();
          this.queue.enqueue(retriedPacket);
        } else {
          // Max retries exceeded
          this.queue.dequeue();
          const failed = await this.deliveryManager.persistPacket(packet, 'FAILED', packet.retryCount, Date.now());
          this.emitEvent(failed, 'FAILED_MAX_RETRIES', 'Exceeded maximum retries');
        }
        break; // Stop draining on connection failure
      }
    }

    this.isDraining = false;
  }

  private checkRelayAvailability(): void {
    const hasActiveTransport = this.transports.some(t => {
      const status = t.getStatus();
      return status === 'connected' || status === 'listening';
    });
    this.setRelayAvailable(hasActiveTransport);
  }

  private emitEvent(packet: StoredPacket | RescuePacket, action: RoutingAction, details?: string): void {
    const event: RoutingEvent = {
      packet,
      action,
      timestamp: Date.now(),
      details,
    };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[RoutingEngine] Listener error:', err);
      }
    }
  }

  clear(): void {
    this.queue.clear();
    this.deliveryManager.clearSeen();
  }
}
