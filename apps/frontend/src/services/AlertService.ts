import type { EventType, Priority, Location } from '@rescuenet/shared';

export type AlertAcknowledgement = 'RECEIVED' | 'PROCESSING' | 'CONFIRMED' | 'RESOLVED';

export interface LocalAlert {
  id: string;
  type: EventType;
  priority: Priority;
  location?: Location;
  timestamp: number;
  confidence: number;
  description?: string;
  source?: string;
  acknowledgementState?: AlertAcknowledgement;
}

type AlertListener = (alerts: LocalAlert[]) => void;

export class AlertService {
  private static alerts: LocalAlert[] = [
    {
      id: 'alert-seed-1',
      type: 'COLLAPSE_PATTERN',
      priority: 'CRITICAL',
      location: { latitude: 40.7118, longitude: -74.0080, accuracy: 20 },
      timestamp: Date.now() - 1000 * 60 * 5,
      confidence: 0.95,
      description: 'North quadrant building structural collapse detected by 4 independent sensors.',
      source: 'NODE_ALPHA',
      acknowledgementState: 'CONFIRMED',
    },
    {
      id: 'alert-seed-2',
      type: 'FIRE',
      priority: 'HIGH',
      location: { latitude: 40.7138, longitude: -74.0050, accuracy: 30 },
      timestamp: Date.now() - 1000 * 60 * 15,
      confidence: 0.88,
      description: 'Active structure fire spreading along main access corridor.',
      source: 'FIELD_USER_12',
      acknowledgementState: 'PROCESSING',
    },
    {
      id: 'alert-seed-3',
      type: 'SOS',
      priority: 'CRITICAL',
      location: { latitude: 40.7148, longitude: -74.0030, accuracy: 10 },
      timestamp: Date.now() - 1000 * 60 * 20,
      confidence: 1.0,
      description: 'Manual SOS distress signal triggered.',
      source: 'device_sos_99',
      acknowledgementState: 'CONFIRMED',
    },
  ];

  private static listeners: AlertListener[] = [];

  static getAlerts(): LocalAlert[] {
    return [...this.alerts];
  }

  static addAlert(alert: LocalAlert): void {
    const existingIndex = this.alerts.findIndex(a => a.id === alert.id);
    if (existingIndex >= 0) {
      this.alerts[existingIndex] = { ...this.alerts[existingIndex], ...alert };
    } else {
      this.alerts.unshift(alert);
    }
    this.notify();
  }

  static updateStatus(id: string, state: AlertAcknowledgement): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledgementState = state;
      this.notify();
    }
  }

  static resolveAlert(id: string): void {
    this.updateStatus(id, 'RESOLVED');
  }

  static subscribe(listener: AlertListener): () => void {
    this.listeners.push(listener);
    listener([...this.alerts]);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify(): void {
    for (const listener of this.listeners) {
      try {
        listener([...this.alerts]);
      } catch (err) {
        console.error('Error notifying alert listener:', err);
      }
    }
  }

  static clear(): void {
    this.alerts = [];
    this.notify();
  }
}
