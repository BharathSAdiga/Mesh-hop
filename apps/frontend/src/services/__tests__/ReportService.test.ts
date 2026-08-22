import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportService } from '../ReportService';
import { AlertService } from '../AlertService';
import { PacketRepository } from '../../storage/repositories/PacketRepository';

// Mock dependencies
vi.mock('../LocationService', () => ({
  LocationService: {
    getCurrentLocation: vi.fn().mockResolvedValue({
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
    }),
  },
}));

vi.mock('../../storage/repositories/PacketRepository', () => ({
  PacketRepository: {
    savePacket: vi.fn().mockResolvedValue(undefined),
    markDelivered: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', mockLocalStorage);

describe('ReportService & Disaster Reporting System', () => {
  beforeEach(() => {
    localStorage.clear();
    AlertService.clear();
    vi.clearAllMocks();
  });

  it('creates and submits a STRUCTURAL_COLLAPSE report with GPS coordinates', async () => {
    const report = await ReportService.submitReport({
      eventType: 'STRUCTURAL_COLLAPSE',
      description: 'Corner building collapse with blocked egress',
      withLocation: true,
      severity: 'CRITICAL',
    });

    expect(report.reportId).toBeDefined();
    expect(report.packetId).toBeDefined();
    expect(report.eventType).toBe('STRUCTURAL_COLLAPSE');
    expect(report.priority).toBe('CRITICAL');
    expect(report.location).toEqual({ latitude: 37.7749, longitude: -122.4194, accuracy: 10 });
    expect(report.acknowledgementState).toBe('RECEIVED');

    // Verify stored in PacketRepository
    expect(PacketRepository.savePacket).toHaveBeenCalledWith(
      expect.objectContaining({
        packetId: report.packetId,
        eventType: 'STRUCTURAL_COLLAPSE',
        priority: 'CRITICAL',
      }),
      'PENDING'
    );
  });

  it('creates and submits report without location when location permission is skipped', async () => {
    const report = await ReportService.submitReport({
      eventType: 'FIRE',
      description: 'Brush fire visible from north hill',
      withLocation: false,
      severity: 'HIGH',
    });

    expect(report.eventType).toBe('FIRE');
    expect(report.priority).toBe('HIGH');
    expect(report.location).toBeNull();
  });

  it('supports all 5 required disaster report types', async () => {
    const types = ['STRUCTURAL_COLLAPSE', 'STAMPEDE', 'FIRE', 'FLOOD', 'GENERAL_EMERGENCY'] as const;

    for (const evt of types) {
      const report = await ReportService.submitReport({
        eventType: evt,
        description: `Test report for ${evt}`,
        withLocation: false,
      });

      expect(report.eventType).toBe(evt);
    }

    const allReports = ReportService.getReports();
    expect(allReports.length).toBe(5);
  });

  it('updates acknowledgement state from RECEIVED to CONFIRMED to RESOLVED', async () => {
    const report = await ReportService.submitReport({
      eventType: 'FLOOD',
      description: 'Road inundated',
      withLocation: false,
    });

    expect(report.acknowledgementState).toBe('RECEIVED');

    ReportService.updateAcknowledgement(report.reportId, 'PROCESSING');
    let updated = ReportService.getReports().find(r => r.reportId === report.reportId);
    expect(updated?.acknowledgementState).toBe('PROCESSING');

    ReportService.updateAcknowledgement(report.reportId, 'CONFIRMED');
    updated = ReportService.getReports().find(r => r.reportId === report.reportId);
    expect(updated?.acknowledgementState).toBe('CONFIRMED');

    ReportService.updateAcknowledgement(report.reportId, 'RESOLVED');
    updated = ReportService.getReports().find(r => r.reportId === report.reportId);
    expect(updated?.acknowledgementState).toBe('RESOLVED');
  });

  it('registers new alerts with AlertService and notifies subscribers', async () => {
    let notifiedAlerts: any[] = [];
    const unsubscribe = AlertService.subscribe((alerts) => {
      notifiedAlerts = alerts;
    });

    await ReportService.submitReport({
      eventType: 'STAMPEDE',
      description: 'Gate 4 crowd crush',
      withLocation: false,
      severity: 'CRITICAL',
    });

    expect(notifiedAlerts.length).toBeGreaterThan(0);
    const alert = notifiedAlerts.find(a => a.type === 'STAMPEDE');
    expect(alert).toBeDefined();
    expect(alert?.priority).toBe('CRITICAL');

    unsubscribe();
  });
});
