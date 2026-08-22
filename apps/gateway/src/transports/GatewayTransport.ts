import type { RescuePacket } from '@rescuenet/shared';

export type PacketReceiverCallback = (packet: RescuePacket, source: string) => Promise<void>;

export interface GatewayLocalTransport {
  readonly name: string;
  start(onPacket: PacketReceiverCallback): Promise<void>;
  stop(): Promise<void>;
  broadcastToLocalMesh(packet: RescuePacket): Promise<void>;
}
