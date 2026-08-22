# RescuENet Architectural Specification

This document details the architectural layers and component design of RescuENet.

---

## 1. Architectural Layers

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Tactical Command Center                         │
│   (Leaflet Operations Map, Incident Feed, AI & Consensus Inspectors)   │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Socket.IO / REST API
┌──────────────────────────────────┴─────────────────────────────────────┐
│                       Authoritative Backend                            │
│   (Express, MongoDB/Mongoose, Observation Aggregator, Rate Limiter)    │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Opportunistic Backhaul Uplink
┌──────────────────────────────────┴─────────────────────────────────────┐
│                         Field Gateway Service                          │
│   (Ingestion, Disk Storage, Dedup Cache, Backhaul Reconnection Drain)  │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Mesh Transports (WebSocket / BLE)
┌──────────────────────────────────┴─────────────────────────────────────┐
│                    Store-Carry-Forward Mesh Engine                     │
│    (Priority ForwardingQueue, DeliveryManager, RetryManager, TTL)      │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ RescuePacket Protocol
┌──────────────────────────────────┴─────────────────────────────────────┐
│                 Collective Behavioral Consensus Engine                 │
│   (ObservationRegistry, 4-Factor Similarity Calculator, Corroborator)  │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Feature Summaries (Edge Only)
┌──────────────────────────────────┴─────────────────────────────────────┐
│                Edge Behavioral AI & Sensor Engine                      │
│   (In-Memory Accelerometer & Audio Sampling, Z-Score Anomaly Scoring)  │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Device Hardware APIs
┌──────────────────────────────────┴─────────────────────────────────────┐
│                  Progressive Web Application (PWA)                     │
│    (Service Worker, IndexedDB Storage, Permission-Based Location)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Deep Dives

### A. Progressive Web Application (PWA) Foundation
- **Service Worker (`sw.js` via Vite PWA):** Precaches application shell, stylesheets, icons, and routing components for 100% offline availability.
- **IndexedDB Persistence (`idb`):** Backs `PacketRepository` to store outgoing and received mesh packets across device restarts.
- **Permission-Gated Location (`LocationService`):** Prompts for GPS coordinates only when explicitly authorized by the user. If omitted or denied, reports and SOS signals route with `location: null`.

### B. Edge Sensor & Behavioral AI Engine
- **In-Memory Sampling:** Captures 3-axis accelerometer motions and microphone acoustic decibel peaks in sliding time windows (1–5 seconds).
- **Statistical Feature Extraction (`FeatureSummary`):** Extracts peak acceleration magnitude, variance, spectral peak frequency, and jerk rate.
- **Edge Anomaly Detection (`BehavioralAI`):** Computes deviation scores against a sliding baseline ($0.0 \le \text{Score} \le 1.0$). If an anomaly exceeds the threshold ($>0.70$), it triggers a candidate observation.
- **Zero Raw Streaming:** Raw audio recordings and high-frequency sensor streams are strictly discarded immediately after feature extraction.

### C. Collective Behavioral Consensus Engine
- **Observation Registry:** Maintains recent candidate observations from independent peer devices.
- **4-Factor Weighted Similarity:**
  $$\text{Consensus Score} = 0.30 \cdot S_{\text{beh}} + 0.25 \cdot S_{\text{temp}} + 0.25 \cdot S_{\text{spat}} + 0.20 \cdot S_{\text{event}}$$
- **State Progression:** `CANDIDATE` ➔ `CORRELATED` ➔ `CONFIRMED`.
- **Manual SOS Consensus Bypass:** Manual SOS distress signals are assigned a confidence of `1.0` and immediately bypass consensus.

### D. RescuePacket Protocol (`@rescuenet/shared`)
- Canonical Zod schema defining `packetId`, `senderId` (pseudonymous), `eventType`, `priority` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), `ttl`, `hopCount`, and `authMetadata.hash` (SHA-256 integrity digest).
- Payload serialization, deserialization, and strict validation.

### E. Transport Abstraction Layer
- Standardized `TransportAdapter` interface: `initialize()`, `startListening()`, `stopListening()`, `sendPacket()`, `receivePacket()`, `getStatus()`, `disconnect()`.
- **`LocalWebSocketTransport`:** High-throughput, reliable peer-to-peer prototype network.
- **`WebBluetoothTransport`:** Browser-first Bluetooth Low Energy discovery and GATT characteristics with graceful fallback.

### F. Store-Carry-Forward Mesh Routing Engine
- **`RoutingEngine`:** Implements the 8-step forwarding protocol:
  1. Validate packet schema.
  2. Deduplicate via `packetId`.
  3. Check TTL expiration (`ttl <= 0`).
  4. Decrement TTL.
  5. Increment hop count.
  6. Persist updated packet to local IndexedDB.
  7. Enqueue in priority order (`ForwardingQueue`).
  8. Transmit opportunistically to discovered peers or gateway.
- **`DeliveryManager` & `RetryManager`:** Manages delivery state transitions (`PENDING` ➔ `TRANSMITTING` ➔ `DELIVERED` / `FAILED` / `EXPIRED`) with exponential backoff.

### G. Field Gateway Microservice (`apps/gateway`)
- Operates on field relay hardware (e.g. Raspberry Pi / mobile gateway node).
- Ingests mesh packets, validates schemas, eliminates duplicates, and queues unsent packets in disk-backed storage (`.gateway_data/packets.json`).
- Monitors backhaul status (`ONLINE`, `OFFLINE`, `BACKHAUL_UNAVAILABLE`, `SYNCING`). Upon backhaul restoration, it automatically drains the offline queue to the authoritative backend.

### H. Authoritative Backend Service (`apps/backend`)
- Express REST API & Socket.IO server backed by MongoDB.
- Aggregates multi-node observations, generates authoritative incident records, maintains gateway heartbeats, and broadcasts real-time telemetry updates.
- Protected by in-memory rate limiting and sanitized error handling.

### I. Tactical Command Center Dashboard (`apps/frontend/src/pages/CommandCenter.tsx`)
- 8-panel live operations console for emergency coordinators:
  1. **Leaflet Tactical Map:** Pulsing SOS beacons, confirmed/candidate incident radii, gateway signals.
  2. **Active Incidents Feed:** Filterable stream by priority and status.
  3. **Incident Inspector:** Coordinate inspection, triage controls, and dispatch triggers.
  4. **Behavioral AI Panel:** Anomaly meter, feature summaries, and non-medical disclaimer.
  5. **Consensus Evidence Panel:** 4-factor similarity breakdown and participating nodes.
  6. **Packet Propagation Trail:** Animated 5-step hop chain visualizer.
  7. **Field Gateway Panel:** Uplink health, throughput counters, and connection states.
  8. **Mesh Relay Registry:** Active node count and network density metrics.
