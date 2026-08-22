import type { EventType, Priority, RescuePacket, Location } from '@rescuenet/shared';
import { LocationService } from './LocationService';
import { PacketRepository } from '../storage/repositories/PacketRepository';
import { AlertService } from './AlertService';
import { v4 as uuidv4 } from 'uuid';

export type ReportEventType = 
  | 'STRUCTURAL_COLLAPSE'
  | 'STAMPEDE'
  | 'FIRE'
  | 'FLOOD'
  | 'GENERAL_EMERGENCY';

export type AcknowledgementState = 
  | 'RECEIVED'
  | 'PROCESSING'
  | 'CONFIRMED'
  | 'RESOLVED';

export interface DisasterReportInput {
  eventType: ReportEventType;
  description: string;
  withLocation: boolean;
  severity?: Priority;
  customLocation?: Location | null;
}

export interface DisasterReport {
  reportId: string;
  packetId: string;
  eventType: EventType;
  description: string;
  priority: Priority;
  location: Location | null;
  timestamp: number;
  acknowledgementState: AcknowledgementState;
  senderId: string;
}

export class ReportService {
  private static STORAGE_KEY = 'rescuenet_disaster_reports';

  static getSenderId(): string {
    let senderId = localStorage.getItem('rescuenet_sender_id');
    if (!senderId) {
      senderId = `device_${uuidv4().slice(0, 8)}`;
      localStorage.setItem('rescuenet_sender_id', senderId);
    }
    return senderId;
  }

  /**
   * Submits a disaster report:
   * 1. Obtains permission-based location
   * 2. Encapsulates into a validated RescuePacket
   * 3. Stores in local storage (IndexedDB)
   * 4. Updates acknowledgement state (RECEIVED -> PROCESSING -> CONFIRMED)
   * 5. Forwards to AlertService & backend if available
   */
  static async submitReport(input: DisasterReportInput): Promise<DisasterReport> {
    let location: Location | null = input.customLocation || null;

    if (input.withLocation && !location) {
      location = await LocationService.getCurrentLocation();
    }

    const priority: Priority = input.severity || 
      (input.eventType === 'STRUCTURAL_COLLAPSE' || input.eventType === 'FIRE' ? 'CRITICAL' : 'HIGH');

    const reportId = `rep_${uuidv4().slice(0, 8)}`;
    const packetId = `pkt_${uuidv4()}`;
    const senderId = this.getSenderId();
    const timestamp = Date.now();

    // 1. Create DisasterReport object
    const report: DisasterReport = {
      reportId,
      packetId,
      eventType: input.eventType,
      description: input.description,
      priority,
      location,
      timestamp,
      acknowledgementState: 'RECEIVED',
      senderId,
    };

    // 2. Convert to RescuePacket
    const packet: RescuePacket = {
      packetId,
      senderId,
      eventType: input.eventType,
      timestamp,
      ...(location ? { location } : {}),
      anomalyScore: priority === 'CRITICAL' ? 1.0 : 0.85,
      consensusScore: priority === 'CRITICAL' ? 1.0 : 0.8,
      priority,
      ttl: 86400, // 24 hours
      hopCount: 0,
      createdAt: timestamp,
    };

    // 3. Store in local IndexedDB Queue
    await PacketRepository.savePacket(packet, 'PENDING');
    this.persistReport(report);

    // 4. Register with AlertService
    AlertService.addAlert({
      id: report.reportId,
      type: report.eventType,
      priority: report.priority,
      location: report.location || undefined,
      timestamp: report.timestamp,
      confidence: 1.0,
      description: report.description,
      source: report.senderId,
      acknowledgementState: 'PROCESSING',
    });

    // 5. Attempt direct uplink to gateway/backend if connected
    this.attemptUplink(packet, report);

    return report;
  }

  private static async attemptUplink(packet: RescuePacket, report: DisasterReport): Promise<void> {
    try {
      const response = await fetch('http://localhost:3000/api/packets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet),
      });

      if (response.ok) {
        this.updateAcknowledgement(report.reportId, 'CONFIRMED');
        await PacketRepository.markDelivered(packet.packetId);
      } else {
        this.updateAcknowledgement(report.reportId, 'PROCESSING');
      }
    } catch {
      // Offline / standalone mesh mode
      this.updateAcknowledgement(report.reportId, 'PROCESSING');
    }
  }

  static getReports(): DisasterReport[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static updateAcknowledgement(reportId: string, state: AcknowledgementState): void {
    const reports = this.getReports();
    const idx = reports.findIndex(r => r.reportId === reportId);
    if (idx >= 0) {
      reports[idx].acknowledgementState = state;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reports));
    }
    AlertService.updateStatus(reportId, state);
  }

  private static persistReport(report: DisasterReport): void {
    const reports = this.getReports();
    reports.unshift(report);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reports));
  }
}
