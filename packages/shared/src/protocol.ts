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
  
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fast deterministic fallback for non-crypto runtime environments
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

export async function verifyPacketIntegrity(packet: RescuePacket): Promise<boolean> {
  if (!packet.authMetadata?.hash) {
    return false;
  }
  const calculated = await calculatePacketHash(packet);
  return packet.authMetadata.hash === calculated;
}

export function generateSenderId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID) {
    return `device_${globalThis.crypto.randomUUID()}`;
  }
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
  const packetId = `pkt_${typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).substring(2, 15)}`;
  
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
