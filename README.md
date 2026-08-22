# RescuENet: Decentralized Behavioral AI Disaster Mesh Network

RescuENet is an offline-first, decentralized emergency-response communication platform that leverages edge behavioral AI, collective consensus, and Store-Carry-Forward opportunistic mesh routing to detect and communicate acute disasters during complete telecommunication blackouts.

---

## 1. Problem Statement

During catastrophic natural disasters (earthquakes, structural collapses, floods, tsunamis) or acute public emergencies:
- **Centralized Infrastructure Fails First:** Cellular towers, broadband ISPs, and power grids suffer catastrophic disruptions or physical collapse.
- **Victims Become Trapped & Disconnected:** First responders operate blind, lacking real-time casualty locations and severity maps.
- **Panic & Congestion Overload Networks:** Conventional 911/emergency lines fail precisely when call volumes surge by orders of magnitude.

---

## 2. Solution & Core Innovations

RescuENet transforms standard commodity smartphones and field devices into autonomous, cooperative rescue nodes that operate with **zero internet or cellular infrastructure**:

1. **Browser-First Offline PWA:** Instant deployment without app store friction, running locally via Service Workers and IndexedDB.
2. **Edge Behavioral Anomaly AI:** On-device statistical feature extraction detecting sudden disaster impact, rapid movement, structural collapse, and crowd panic.
3. **Collective Multi-Node Consensus:** Corroborates independent sensor observations across spatial and temporal sliding windows to drastically reduce false alarms.
4. **Store-Carry-Forward Mesh Routing:** Packets hop opportunistically across peer nodes until reaching a field gateway or backhaul uplink.
5. **Real-Time Command Center:** Tactical operations dashboard with live Leaflet incident mapping, multi-factor AI evidence inspection, and packet propagation trails.

---

## 3. Key Features

- **🚨 Manual SOS Dispatch:** 1-click critical distress beacon that immediately broadcasts across the mesh and intentionally **bypasses consensus**.
- **🏢 Disaster Incident Reporting:** Field report forms for Structural Collapse, Stampede, Fire, Flood, and General Emergencies with permission-based GPS coordinates.
- **🤝 4-Factor Collective Consensus:** Evaluates Behavioral (30%), Temporal (25%), Spatial (25%), and Event Type (20%) similarity before elevating candidate events to `CONFIRMED`.
- **⏱️ Delay-Tolerant Store-Carry-Forward:** Priority-ordered queuing (`CRITICAL > HIGH > MEDIUM > LOW`), hop counting, and TTL expiration.
- **🛡️ Emergency Information Layer:** Offline safe zones with Haversine distance calculations and disaster-specific survival instructions.
- **🎮 Deterministic Demo Control Center:** Repeatable 8-scenario simulation engine for testing and live demonstration.
- **🔒 Privacy by Design:** Pseudonymous device IDs, zero raw audio or sensor waveform uploads, and optional permission-gated location.

---

## 4. System Architecture Overview

```
[ In-Field Victims / Devices ] ➔ [ Local Behavioral AI ] ➔ [ Collective Consensus ]
               │
               ▼
   [ RescuePacket Protocol ]
               │
               ▼
[ Store-Carry-Forward Mesh Routing (IndexedDB + Priority Queue) ]
               │
      (Opportunistic Relay)
               ▼
    [ Field Gateway Node ] (Disk-Backed Queue & Uplink Sync)
               │
      (Backhaul Restored / Cellular / Satellite)
               ▼
  [ Authoritative Backend ] (Express + MongoDB + Socket.IO)
               │
               ▼
[ Tactical Command Center Dashboard (Leaflet Operations Map) ]
```

---

## 5. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Leaflet, `idb` (IndexedDB), Socket.IO Client.
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.IO, Zod.
- **Gateway:** Node.js, Express, WebSocket (`ws`), Socket.IO Client, File-backed persistence.
- **Shared:** TypeScript, Zod Schema Validation, SHA-256 WebCrypto Protocol.
- **Testing:** Vitest, Testing Library, JSDOM (69/69 passing tests).

---

## 6. Monorepo Structure

```
├── packages/
│   └── shared/                 # Shared schemas, types, and protocol validators
├── apps/
│   ├── frontend/               # PWA, UI components, AI engine, mesh routing, dashboard
│   ├── backend/                # Authoritative Express API, MongoDB models, Socket.IO hub
│   └── gateway/                # Field Gateway service and backhaul sync engine
├── README.md                   # Project overview and setup guide
├── ARCHITECTURE.md             # In-depth architectural documentation
├── PROTOCOL.md                 # Packet protocol specification
├── AI.md                       # Behavioral AI & consensus methodology
├── PRIVACY.md                  # Privacy guarantees & data minimization
├── API.md                      # REST endpoints & Socket.IO specification
├── GATEWAY.md                  # Gateway microservice documentation
├── DEMO.md                     # Deterministic demo reproduction guide
├── LIMITATIONS.md              # Explicit prototype limitations disclosure
├── SECURITY_AUDIT.md           # Security & privacy audit report
└── AUDIT.md                    # 20-dimension engineering checklist audit
```

---

## 7. Installation & Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MongoDB:** (Optional for live persistence; mock memory fallbacks included for standalone test runs)

### Clone & Install Dependencies
```bash
git clone https://github.com/BharathSAdiga/Mesh-hop.git
cd Mesh-hop
npm install
```

### Environment Configuration
```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
```

---

## 8. Running the Application

### A. Run Frontend (PWA & Command Center)
```bash
npm run dev --workspace=frontend
```
Frontend URL: `http://localhost:5173`

### B. Run Authoritative Backend
```bash
npm run dev --workspace=@rescuenet/backend
```
Backend API & Socket.IO Port: `http://localhost:3000`

### C. Run Gateway Microservice
```bash
npm run dev --workspace=@rescuenet/gateway
```
Gateway Port: `http://localhost:3001`

---

## 9. Running Tests & Production Builds

### Run All Unit & Integration Tests (69 Tests)
```bash
# Frontend Tests (50 tests)
npm test --workspace=frontend

# Backend Tests (10 tests)
npm test --workspace=@rescuenet/backend

# Gateway Tests (5 tests)
npm test --workspace=@rescuenet/gateway

# Shared Protocol Tests (4 tests)
npm test --workspace=@rescuenet/shared
```

### Run Production Build Across All Workspaces
```bash
npm run build --workspaces
```

---

## 10. Disclaimer

> **DISCLAIMER:**  
> RescuENet is a disaster-management behavioral anomaly detection platform. It is **NOT** a medical diagnostic device and does not monitor, diagnose, or treat medical conditions, diseases, or heart attacks. It is currently an engineering prototype intended for disaster-relief research and simulation.
