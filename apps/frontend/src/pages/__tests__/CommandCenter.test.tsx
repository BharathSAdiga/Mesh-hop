/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        mergeOptions: vi.fn(),
      },
    },
  },
}));

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="mock-map-container">{children}</div>,
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="mock-marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="mock-popup">{children}</div>,
  Circle: () => <div data-testid="mock-circle" />,
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

import { CommandCenter } from '../CommandCenter';

describe('CommandCenter Dashboard Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders all 8 emergency dashboard sections and header', () => {
    render(<CommandCenter />);

    // Header
    expect(screen.getByText(/RescuENet Command Center/i)).toBeDefined();

    // 8 Section Headings
    expect(screen.getByText(/1\. Live Disaster Operations Map/i)).toBeDefined();
    expect(screen.getByText(/2\. Active Incidents Feed/i)).toBeDefined();
    expect(screen.getByText(/3\. Incident Details/i)).toBeDefined();
    expect(screen.getByText(/4\. Behavioral AI Analysis/i)).toBeDefined();
    expect(screen.getByText(/5\. Consensus Evidence/i)).toBeDefined();
    expect(screen.getByText(/6\. Real-Time Packet Propagation Trail/i)).toBeDefined();
    expect(screen.getByText(/7\. Field Gateway Status/i)).toBeDefined();
    expect(screen.getByText(/8\. Mesh Network & Relay Nodes/i)).toBeDefined();
  });

  it('renders KPI metrics (Active Incidents, Gateways, Nodes, Ingested Packets)', () => {
    render(<CommandCenter />);

    expect(screen.getAllByText(/Active Incidents/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Connected Gateways/i)).toBeDefined();
    expect(screen.getByText(/Active Mesh Nodes/i)).toBeDefined();
    expect(screen.getByText(/Total Ingested Packets/i)).toBeDefined();
  });

  it('injects scenario incident when clicking demo button', () => {
    render(<CommandCenter />);

    const sosBtn = screen.getByText(/Manual SOS Beacon/i);
    fireEvent.click(sosBtn);

    // Verify incident cards and selection
    expect(screen.getAllByText(/SOS/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/✓ Mark Incident as RESOLVED/i)).toBeDefined();
  });

  it('toggles mode between DEMO and AUTHORITATIVE LIVE FEED', () => {
    render(<CommandCenter />);

    const modeBtn = screen.getByText(/DEMO SIMULATION MODE/i);
    expect(modeBtn).toBeDefined();

    fireEvent.click(modeBtn);
    expect(screen.getByText(/AUTHORITATIVE LIVE FEED/i)).toBeDefined();
  });
});
