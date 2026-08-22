import { RescuePacketSchema } from './schemas';
import type { RescuePacket, EventType, Priority, Location } from './types';

export function validatePacket(data: unknown): RescuePacket {
  return RescuePacketSchema.parse(data);
}

export function serializePacket(packet: RescuePacket): string {
  return JSON.stringify(packet);
}

export function deserializePacket(data: string): RescuePacket {
  const parsed = JSON.parse(data);
  return validatePacket(parsed);
}

export async function calculatePacketHash(packet: RescuePacket): Promise<string> {
  const payload = `${packet.packetId}:${packet.senderId}:${packet.eventType}:${packet.timestamp}:${packet.anomalyScore}:${packet.priority}`;
  
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without Web Crypto API (e.g. older node during tests without jsdom)
  // In a pure browser-first app, crypto.subtle is preferred.
  // For simplicity if crypto.subtle is absent (rare in modern browsers), we throw.
  throw new Error('Web Crypto API not available for hashing.');
}

export function generateSenderId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `device_${crypto.randomUUID()}`;
  }
  // Fallback if randomUUID is missing
  return `device_${Math.random().toString(36).substring(2, 15)}`;
}

export async function createPacket(params: {
  senderId: string;
  eventType: EventType;
  priority: Priority;
  anomalyScore: number;
  consensusScore: number;
  ttl?: number;
  location?: Location;
}): Promise<RescuePacket> {
  const packetId = `pkt_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)}`;
  
  const packet: RescuePacket = {
    packetId,
    senderId: params.senderId,
    eventType: params.eventType,
    timestamp: Date.now(),
    location: params.location,
    anomalyScore: params.anomalyScore,
    consensusScore: params.consensusScore,
    priority: params.priority,
    ttl: params.ttl ?? 86400, // 24 hours default
    hopCount: 0,
    createdAt: Date.now(),
  };

  const hash = await calculatePacketHash(packet);
  packet.authMetadata = { hash };
  
  // Final validation against our schema
  return validatePacket(packet);
}

export function decrementTTL(packet: RescuePacket): RescuePacket {
  return {
    ...packet,
    ttl: Math.max(0, packet.ttl - 1),
    hopCount: packet.hopCount + 1,
  };
}

export function isExpired(packet: RescuePacket): boolean {
  return packet.ttl <= 0;
}
