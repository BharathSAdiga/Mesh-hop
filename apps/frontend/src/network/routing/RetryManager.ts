import type { StoredPacket } from '../../storage/db';

export interface RetryConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
}

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      initialBackoffMs: 1000,
      maxBackoffMs: 30000,
      backoffMultiplier: 2,
      ...config,
    };
  }

  shouldRetry(packet: StoredPacket): boolean {
    return packet.retryCount < this.config.maxRetries;
  }

  recordAttempt(packet: StoredPacket): StoredPacket {
    return {
      ...packet,
      retryCount: packet.retryCount + 1,
      lastAttemptAt: Date.now(),
    };
  }

  calculateBackoff(retryCount: number): number {
    const backoff = this.config.initialBackoffMs * Math.pow(this.config.backoffMultiplier, Math.max(0, retryCount - 1));
    return Math.min(backoff, this.config.maxBackoffMs);
  }

  getMaxRetries(): number {
    return this.config.maxRetries;
  }
}
