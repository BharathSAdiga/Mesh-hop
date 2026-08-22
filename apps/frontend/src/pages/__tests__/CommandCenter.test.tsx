/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

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

  it('renders operations center header and navigation tabs', () => {
    render(
      <BrowserRouter>
        <CommandCenter />
      </BrowserRouter>
    );

    // Header
    expect(screen.getByText(/RESCUENet COMMAND CENTER/i)).toBeDefined();
    expect(screen.getByText(/SYSTEM ● OPERATIONAL/i)).toBeDefined();

    // Navigation Tabs
    expect(screen.getByText(/Overview/i)).toBeDefined();
    expect(screen.getAllByText(/Active Incidents/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Live Map/i)).toBeDefined();
    expect(screen.getByText(/Network & Mesh/i)).toBeDefined();
    expect(screen.getByText(/AI & Consensus/i)).toBeDefined();
  });

  it('renders top KPI metrics (Active Incidents, Critical Alerts, Connected Nodes, Gateways)', () => {
    render(
      <BrowserRouter>
        <CommandCenter />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/ACTIVE INCIDENTS/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/CRITICAL ALERTS/i)).toBeDefined();
    expect(screen.getByText(/CONNECTED NODES/i)).toBeDefined();
    expect(screen.getByText(/GATEWAYS ONLINE/i)).toBeDefined();
  });

  it('renders tactical 3-column workspace with active incident feed and telemetry', () => {
    render(
      <BrowserRouter>
        <CommandCenter />
      </BrowserRouter>
    );

    expect(screen.getByText(/Active Incident Stream/i)).toBeDefined();
    expect(screen.getByText(/Tactical Disaster Geospatial Grid/i)).toBeDefined();
    expect(screen.getByText(/Incident Telemetry/i)).toBeDefined();
  });

  it('renders animated packet propagation hop chain graph', () => {
    render(
      <BrowserRouter>
        <CommandCenter />
      </BrowserRouter>
    );

    expect(screen.getByText(/Deterministic Packet Propagation Graph/i)).toBeDefined();
    expect(screen.getByText(/Node A \(Origin\)/i)).toBeDefined();
    expect(screen.getByText(/Authoritative Backend/i)).toBeDefined();
  });
});
