# RescuENet Frontend Redesign & UX Architecture Report

**Product:** RESCUENet — Consensus-Verified Emergency Network  
**Target:** Professional Emergency Response & Hackathon Jury Defense  
**Repository:** [BharathSAdiga/Mesh-hop](https://github.com/BharathSAdiga/Mesh-hop)

---

## 1. Executive Summary & Design System

The RescuENet frontend has been completely redesigned from the ground up, establishing **two distinct, purpose-built interfaces**:

1. **Citizen Emergency PWA (`/`):** Mobile-first, high-contrast, emergency-first UX designed for a person experiencing acute disaster conditions. Features a circular hold-to-confirm SOS mechanism (preventing accidental triggers), optional GPS permission gating, offline shelter maps with Haversine distance, numbered survival guides, and transparent privacy disclosures.
2. **Command Center Operations Console (`/command-center`):** Desktop-first tactical console designed for emergency operations personnel. Features top-level KPIs, an interactive Leaflet geospatial grid, real-time active incident stream, comprehensive behavioral consensus evidence inspector, and an animated 5-step deterministic packet propagation hop graph.

---

## 2. Pages & Layouts Redesigned

| Page / Experience | Route | Redesign Highlights | Real Service Connection |
|---|---|---|---|
| **Citizen Layout** | `CitizenLayout.tsx` | Mobile navigation bar, top network status badge (`CONNECTED` / `OFFLINE` / `LOCAL GATEWAY`), pending packet alert, quick switcher to Ops Console. | `NetworkManager`, `PacketRepository`, Gateway health API |
| **Citizen Home** | `/` (`Home.tsx`) | 2-second hold-to-confirm emergency SOS button with circular progress fill, haptic vibration, quick disaster action cards, privacy & offline status footer. | `SosService`, `LocationService`, `PacketRepository` |
| **Dedicated SOS Portal** | `/sos` (`SOS.tsx`) | Explicit choice between sharing GPS and omitting coordinates, hold-to-confirm trigger, live transmission status (`SOS SENT` / `SOS STORED LOCALLY`), packet ID feedback. | `SosService`, `IndexedDB` storage |
| **Nearby Alerts Feed** | `/alerts` (`Alerts.tsx`) | Emergency severity hierarchy (`CRITICAL` red, `HIGH` orange, `MEDIUM` yellow, `LOW` blue), distance estimates, filter pills, interactive map toggle. | `AlertService` reactive observer pattern |
| **Safe Zones & Shelters** | `/safe-zones` (`SafeZones.tsx`) | Full-screen Leaflet map with safe zone markers, dynamic distance calculation from user GPS, occupancy capacity gauges, radio frequencies, `LOCAL CACHED INFORMATION` badging. | `SafeZoneService`, `LocationService` |
| **Survival Protocols** | `/instructions` (`Instructions.tsx`) | Tabbed offline protocols for Collapse, Stampede, Fire, Flood. Numbered step-by-step actions, critical DO NOT warnings, and mesh signaling advice. | `InstructionService` (100% offline) |
| **Network Diagnostics** | `/network` (`Network.tsx`) | Non-cluttered indicators for Internet, Field Gateway (port 3001), and Local Mesh, with IndexedDB pending count and last sync timer. | `NetworkManager`, `GatewayService` |
| **Incident Reporting** | `/report` (`Report.tsx`) | 5 disaster categories, severity selector, optional description, GPS toggle, and acknowledgement timeline (`RECEIVED ➔ PROCESSING ➔ CONFIRMED ➔ RESOLVED`). | `ReportService`, `PacketRepository` |
| **Command Center** | `/command-center` (`CommandCenter.tsx`) | 8-panel tactical console: Top KPIs, 3-column workspace (Active Incidents, Leaflet grid, Incident Telemetry), animated packet propagation graph, and Demo triggers. | Authoritative Backend REST API, Socket.IO live stream |

---

## 3. Real Services vs Prototype Simulation

| Dimension | Real Implementation | Prototype / Simulation Feature |
|---|---|---|
| **Distress SOS Routing** | Full `SosService` packaging with SHA-256 integrity hash, TTL decrementing, and priority queues. | — |
| **Offline Persistence** | Real IndexedDB storage via `idb` and Service Worker precaching. | — |
| **Consensus Engine** | Mathematical 4-factor formula ($0.30 \cdot S_{\text{beh}} + 0.25 \cdot S_{\text{temp}} + 0.25 \cdot S_{\text{spat}} + 0.20 \cdot S_{\text{event}}$). | Synthetic collapse shockwave inputs in Demo Mode (`0.91`, `0.87`, `0.84`) for deterministic reproduction. |
| **Backend & Socket.IO** | Real Express server on port `3000` with live WebSocket event emitters and in-memory fallback queues. | — |
| **Field Gateway** | Real Node.js microservice on port `3001` with disk-backed storage and opportunistic sync. | Backhaul disconnect toggle button for developer simulation. |
| **Transport Layer** | Real WebSocket and IndexedDB local transport; capability detection for Web Bluetooth. | Web Bluetooth background relaying is simulated due to browser sandbox restrictions. |

---

## 4. Responsive Breakpoints & Accessibility

- **Mobile Viewports (375px, 390px, 414px, 768px):** Citizen PWA layout with large tap targets ($\ge 44\text{px}$), high contrast text, and smooth touch-and-hold gestures.
- **Desktop Viewports (1280px, 1440px, 1920px):** Command Center renders a dense, high-information 3-column tactical workspace with Leaflet map dominance and live metric feeds.
- **Accessibility:** ARIA labels on emergency buttons, keyboard focus states, screen-reader friendly status text, and color-coded badges with accompanying text descriptors (never relying on color alone).

---

## 5. Build & Verification Status

- **TypeScript Typecheck:** `tsc -b` passed with **0 errors**.
- **Linter:** `oxlint` passed with **0 errors**.
- **Unit & Integration Tests:** **69 / 69 tests passing (100%)**.
- **Production Build:** Vite production bundle with PWA Service Worker generated successfully.
