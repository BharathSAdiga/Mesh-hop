# RescuENet Gateway Microservice Specification

**Package:** `@rescuenet/gateway`  
**Default Port:** `3001`  
**Runtime:** Node.js + TypeScript + Express + WebSocket

---

## 1. Gateway Responsibilities

The RescuENet Gateway operates on edge relay nodes (e.g. vehicle-mounted field computers, portable Raspberry Pi units, solar emergency poles). It bridges local ad-hoc peer-to-peer mesh traffic to the authoritative backend whenever cellular, satellite, or long-range wireless backhaul becomes available.

### Core Duties:
1. **Local Mesh Packet Ingestion:** Ingests packets via REST `POST /gateway/packet` and WebSocket listener.
2. **Schema Validation & Deduplication:** Rejects invalid payloads; drops duplicates against an in-memory cache.
3. **Disk-Backed Persistence:** Saves pending packets in `.gateway_data/packets.json` during backhaul blackout.
4. **Opportunistic Backhaul Synchronization:** Monitors Socket.IO connection to backend; automatically drains pending queue upon reconnection.
5. **Gateway State Machine:** Reports status (`ONLINE`, `OFFLINE`, `BACKHAUL_UNAVAILABLE`, `SYNCING`).

---

## 2. Gateway Endpoints

- `POST /gateway/packet`: Ingests packet from local mesh.
- `GET /gateway/status`: Returns gateway health, state, and metrics.
- `POST /gateway/simulate/backhaul`: Toggles backhaul link state (`online: boolean`) for developer testing.

---

## 3. Developer Gateway Simulator

The frontend includes an interactive **Gateway Simulator** (`/gateway-simulator`):
- Controls: `[ INTERNET ON ]` / `[ INTERNET OFF ]`.
- Real-time display counters:
  - **Received Packets:** Total packets accepted from field nodes.
  - **Pending Packets:** Packets stored in offline disk queue.
  - **Uploaded Packets:** Packets successfully synced to the backend.
  - **Failed Packets:** Rejections or expired packets.
