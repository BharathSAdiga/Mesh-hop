import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { EmergencyPacket, EventType, Priority } from '@rescuenet/shared';

export type PacketState = 'PENDING' | 'TRANSMITTING' | 'DELIVERED' | 'FAILED' | 'EXPIRED';

export interface StoredPacket extends EmergencyPacket {
  state: PacketState;
  retryCount: number;
}

export interface StoredIncident {
  id: string;
  type: EventType;
  priority: Priority;
  confidence: number;
  timeDetected: number;
}

export interface RescuENetDB extends DBSchema {
  packets: {
    key: string; // packetId
    value: StoredPacket;
    indexes: { 'by-state': string, 'by-createdAt': number };
  };
  incidents: {
    key: string;
    value: StoredIncident;
  };
  alerts: {
    key: string;
    value: any;
  };
  devices: {
    key: string;
    value: any;
  };
  consensus: {
    key: string;
    value: any;
  };
  gateways: {
    key: string;
    value: any;
  };
  seenPackets: {
    key: string; // packetId to prevent duplicates
    value: { packetId: string; seenAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<RescuENetDB>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<RescuENetDB>('rescuenet-db', 1, {
      upgrade(db) {
        const packetStore = db.createObjectStore('packets', { keyPath: 'packetId' });
        packetStore.createIndex('by-state', 'state');
        packetStore.createIndex('by-createdAt', 'createdAt');

        db.createObjectStore('incidents', { keyPath: 'id' });
        db.createObjectStore('alerts', { keyPath: 'id' });
        db.createObjectStore('devices', { keyPath: 'id' });
        db.createObjectStore('consensus', { keyPath: 'id' });
        db.createObjectStore('gateways', { keyPath: 'id' });
        db.createObjectStore('seenPackets', { keyPath: 'packetId' });
      }
    });
  }
  return dbPromise;
}
