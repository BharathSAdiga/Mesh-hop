/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Demo } from '../Demo';

describe('Demo Control Center Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders master header and all scenario trigger buttons', () => {
    render(<Demo />);

    expect(screen.getByText('RescuENet Demo Control Center')).toBeDefined();
    expect(screen.getByText('🟢 NORMAL STATE')).toBeDefined();
    expect(screen.getByText('🏢 SIMULATE COLLAPSE')).toBeDefined();
    expect(screen.getByText('🏃 SIMULATE STAMPEDE')).toBeDefined();
    expect(screen.getByText('🚨 SEND MANUAL SOS')).toBeDefined();
    expect(screen.getByText('🔌 GATEWAY OFFLINE')).toBeDefined();
    expect(screen.getByText('🌐 GATEWAY ONLINE')).toBeDefined();
    expect(screen.getByText('🔄 DUPLICATE PACKET')).toBeDefined();
    expect(screen.getByText('⏱️ TTL TEST (TTL=3)')).toBeDefined();
  });

  it('triggers Collapse Scenario and displays multi-node consensus scores', () => {
    render(<Demo />);

    const collapseBtn = screen.getByText('🏢 SIMULATE COLLAPSE');
    fireEvent.click(collapseBtn);

    expect(screen.getByText('Scenario 2: Multi-Node Structural Collapse Corroboration')).toBeDefined();
    expect(screen.getAllByText(/CONFIRMED STRUCTURAL COLLAPSE/).length).toBeGreaterThan(0);
    expect(screen.getByText('0.91')).toBeDefined(); // Node A
    expect(screen.getByText('0.87')).toBeDefined(); // Node B
    expect(screen.getByText('0.84')).toBeDefined(); // Node C
  });

  it('triggers Manual SOS Scenario and shows immediate consensus bypass', () => {
    render(<Demo />);

    const sosBtn = screen.getByText('🚨 SEND MANUAL SOS');
    fireEvent.click(sosBtn);

    expect(screen.getByText('Scenario 8: Manual SOS Emergency Dispatch')).toBeDefined();
    expect(screen.getAllByText(/BYPASSED CONSENSUS/).length).toBeGreaterThan(0);
  });

  it('triggers Duplicate Scenario and displays ACCEPTED and DROPPED_DUPLICATE', () => {
    render(<Demo />);

    const dupBtn = screen.getByText('🔄 DUPLICATE PACKET');
    fireEvent.click(dupBtn);

    expect(screen.getByText('Scenario 6: Duplicate Packet Suppression')).toBeDefined();
    expect(screen.getByText('ACCEPTED')).toBeDefined();
    expect(screen.getByText('DROPPED_DUPLICATE')).toBeDefined();
  });

  it('triggers TTL Test Scenario and verifies expiration at Hop 3', () => {
    render(<Demo />);

    const ttlBtn = screen.getByText('⏱️ TTL TEST (TTL=3)');
    fireEvent.click(ttlBtn);

    expect(screen.getByText('Scenario 7: TTL Decrement & Packet Expiration')).toBeDefined();
    expect(screen.getByText('TTL 0: STOP & EXPIRED')).toBeDefined();
  });
});
