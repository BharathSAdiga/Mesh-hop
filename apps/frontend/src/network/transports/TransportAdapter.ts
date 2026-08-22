import type { RescuePacket, TransportStatus } from '@rescuenet/shared';

export type PacketHandler = (packet: RescuePacket) => void;

export interface TransportAdapter {
  readonly name: string;
  
  initialize(): Promise<void>;
  startListening(onPacket: PacketHandler): Promise<void>;
  stopListening(): Promise<void>;
  discover(): Promise<string[]>;
  sendPacket(packet: RescuePacket): Promise<boolean>;
  receivePacket(): Promise<RescuePacket | null>;
  getStatus(): TransportStatus;
  disconnect(): Promise<void>;
}
