import type { RescuePacket, TransportStatus } from '@rescuenet/shared';
import { deserializePacket } from '@rescuenet/shared';
import type { TransportAdapter, PacketHandler } from './TransportAdapter';

export class LocalWebSocketTransport implements TransportAdapter {
  readonly name = 'LocalWebSocket';
  
  private ws: WebSocket | null = null;
  private url: string;
  private status: TransportStatus = 'disconnected';
  private packetHandler: PacketHandler | null = null;
  private messageQueue: RescuePacket[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private autoReconnect: boolean;

  constructor(url: string = 'ws://localhost:3001', autoReconnect: boolean = true) {
    this.url = url;
    this.autoReconnect = autoReconnect;
  }

  async initialize(): Promise<void> {
    if (typeof WebSocket === 'undefined') {
      this.status = 'unsupported';
      return;
    }
    await this.connect();
  }

  private connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }

      this.status = 'connecting';

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.status = this.packetHandler ? 'listening' : 'connected';
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const raw = typeof event.data === 'string' ? event.data : event.data.toString();
            let parsedData: any;
            try {
              parsedData = JSON.parse(raw);
            } catch {
              return;
            }

            // Handle wrapped payload { type: 'emergency_packet', payload: packet } or direct packet
            let packet: RescuePacket;
            if (parsedData && parsedData.type === 'emergency_packet' && parsedData.payload) {
              packet = deserializePacket(JSON.stringify(parsedData.payload));
            } else {
              packet = deserializePacket(raw);
            }

            this.messageQueue.push(packet);
            if (this.packetHandler) {
              this.packetHandler(packet);
            }
          } catch (err) {
            console.warn('[LocalWebSocketTransport] Failed to deserialize incoming message', err);
          }
        };

        this.ws.onclose = () => {
          this.status = 'disconnected';
          this.ws = null;
          if (this.autoReconnect && !this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connect().catch(() => {});
            }, 3000);
          }
        };

        this.ws.onerror = () => {
          this.status = 'disconnected';
          resolve(); // Don't throw, fail gracefully
        };
      } catch {
        this.status = 'disconnected';
        resolve();
      }
    });
  }

  async startListening(onPacket: PacketHandler): Promise<void> {
    this.packetHandler = onPacket;
    if (this.status === 'connected' || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      this.status = 'listening';
    } else if (this.status === 'disconnected') {
      await this.connect();
    }
  }

  async stopListening(): Promise<void> {
    this.packetHandler = null;
    if (this.status === 'listening') {
      this.status = 'connected';
    }
  }

  async discover(): Promise<string[]> {
    if (this.status === 'connected' || this.status === 'listening') {
      return [`gateway@${this.url}`];
    }
    return [];
  }

  async sendPacket(packet: RescuePacket): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Try to reconnect once
      await this.connect();
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return false;
      }
    }

    try {
      const message = JSON.stringify({
        type: 'emergency_packet',
        payload: packet,
      });
      this.ws.send(message);
      return true;
    } catch (err) {
      console.warn('[LocalWebSocketTransport] Send error:', err);
      return false;
    }
  }

  async receivePacket(): Promise<RescuePacket | null> {
    return this.messageQueue.shift() || null;
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.autoReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
  }
}
