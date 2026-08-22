import type { RescuePacket, TransportStatus } from '@rescuenet/shared';
import type { TransportAdapter, PacketHandler } from './TransportAdapter';

// Standard UUIDs for emergency mesh BLE advertisement / GATT
export const RESCUENET_SERVICE_UUID = '0000fe99-0000-1000-8000-00805f9b34fb';
export const RESCUENET_CHARACTERISTIC_UUID = '0000fe9a-0000-1000-8000-00805f9b34fb';

export class WebBluetoothTransport implements TransportAdapter {
  readonly name = 'WebBluetooth';

  private status: TransportStatus = 'disconnected';
  private packetHandler: PacketHandler | null = null;
  private isSupported: boolean = false;
  private device: any = null;
  private characteristic: any = null;
  private messageQueue: RescuePacket[] = [];

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): boolean {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator && (navigator as any).bluetooth) {
      this.isSupported = true;
      this.status = 'disconnected';
    } else {
      this.isSupported = false;
      this.status = 'unsupported';
    }
    return this.isSupported;
  }

  async initialize(): Promise<void> {
    if (!this.checkSupport()) {
      this.status = 'unsupported';
      return;
    }
    this.status = 'disconnected';
  }

  async discover(): Promise<string[]> {
    if (!this.isSupported) {
      return [];
    }

    try {
      const bluetooth = (navigator as any).bluetooth;
      if (!bluetooth || !bluetooth.requestDevice) {
        return [];
      }

      // Request user gesture pairing for RescuENet peripheral
      this.device = await bluetooth.requestDevice({
        filters: [{ services: [RESCUENET_SERVICE_UUID] }],
        optionalServices: [RESCUENET_SERVICE_UUID],
      });

      if (this.device) {
        return [this.device.name || this.device.id || 'BLE_Peer'];
      }
    } catch (err: any) {
      // User cancelled pairing or BLE unavailable
      console.info('[WebBluetoothTransport] Discovery skipped or cancelled:', err?.message || err);
    }
    return [];
  }

  async startListening(onPacket: PacketHandler): Promise<void> {
    this.packetHandler = onPacket;
    if (!this.isSupported) {
      this.status = 'unsupported';
      return;
    }

    if (this.device && this.device.gatt) {
      try {
        this.status = 'connecting';
        const server = await this.device.gatt.connect();
        const service = await server.getPrimaryService(RESCUENET_SERVICE_UUID);
        this.characteristic = await service.getCharacteristic(RESCUENET_CHARACTERISTIC_UUID);

        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value;
          const decoder = new TextDecoder();
          const jsonStr = decoder.decode(value);
          try {
            const packet: RescuePacket = JSON.parse(jsonStr);
            this.messageQueue.push(packet);
            if (this.packetHandler) {
              this.packetHandler(packet);
            }
          } catch (err) {
            console.warn('[WebBluetoothTransport] Failed to parse BLE notification', err);
          }
        });

        this.status = 'listening';
      } catch (err) {
        console.warn('[WebBluetoothTransport] Failed to start notifications', err);
        this.status = 'disconnected';
      }
    } else {
      this.status = 'listening';
    }
  }

  async stopListening(): Promise<void> {
    this.packetHandler = null;
    if (this.characteristic) {
      try {
        await this.characteristic.stopNotifications();
      } catch {}
    }
    if (this.status === 'listening') {
      this.status = 'connected';
    }
  }

  async sendPacket(packet: RescuePacket): Promise<boolean> {
    if (!this.isSupported || !this.characteristic) {
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(packet));
      await this.characteristic.writeValue(data);
      return true;
    } catch (err) {
      console.warn('[WebBluetoothTransport] BLE send error', err);
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
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      try {
        this.device.gatt.disconnect();
      } catch {}
    }
    this.device = null;
    this.characteristic = null;
    this.status = this.isSupported ? 'disconnected' : 'unsupported';
  }
}
