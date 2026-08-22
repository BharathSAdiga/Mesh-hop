import { RescuePacket } from '@rescuenet/shared';

export class ObservationRegistry {
  private observations: Map<string, RescuePacket> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 60000) { // Default 60 seconds TTL
    this.ttlMs = ttlMs;
  }

  public addObservation(packet: RescuePacket): void {
    this.observations.set(packet.packetId, packet);
    this.cleanup();
  }

  public getActiveObservations(): RescuePacket[] {
    this.cleanup();
    return Array.from(this.observations.values());
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, packet] of this.observations.entries()) {
      if (now - packet.timestamp > this.ttlMs) {
        this.observations.delete(id);
      }
    }
  }

  public clear(): void {
    this.observations.clear();
  }
}
