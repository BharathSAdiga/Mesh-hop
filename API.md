# RescuENet Backend API & WebSocket Specification

**Base URL:** `http://localhost:3000`  
**Protocol:** HTTP/1.1 REST + Socket.IO v4

---

## 1. REST Endpoints

### `GET /api/health`
Health check and server uptime indicator.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "rescuenet-backend",
  "timestamp": "2026-08-22T14:30:00.000Z",
  "uptime": 342.1
}
```

---

### `POST /api/packets`
Ingests a mesh packet from a field gateway or direct peer node.

**Request Body (`RescuePacket`):**
```json
{
  "packetId": "pkt_7721_alpha",
  "senderId": "device_9941_beta",
  "eventType": "SOS",
  "timestamp": 1787401800000,
  "location": { "latitude": 12.9716, "longitude": 77.5946, "accuracy": 10 },
  "anomalyScore": 1.0,
  "consensusScore": 1.0,
  "priority": "CRITICAL",
  "ttl": 86400,
  "hopCount": 2,
  "createdAt": 1787401790000
}
```

**Responses:**
- `201 Created`: Packet ingested and broadcast to Command Center.
- `409 Conflict`: Duplicate `packetId` (already ingested).
- `400 Bad Request`: Schema validation error (malformed fields).
- `429 Too Many Requests`: Rate limit exceeded.

---

### `GET /api/packets`
Retrieves recently ingested packets.
- Query params: `limit` (default 50).

---

### `GET /api/incidents`
Retrieves active and historical incidents.
- Query params: `status` (`CONFIRMED`, `CORRELATED`, `CANDIDATE`, `RESOLVED`), `eventType`, `limit`.

---

### `GET /api/incidents/:id`
Retrieves details for a specific incident by `incidentId`.

---

### `POST /api/observations`
Submits a single-node behavioral observation. Correlates with existing incidents within sliding time/spatial windows.

---

### `GET /api/gateways` & `POST /api/gateways/heartbeat`
Lists registered field gateways and receives gateway health heartbeats (metrics, queue depth, GPS).

---

### `GET /api/nodes`
Aggregates active mesh nodes observed across the network.

---

## 2. WebSocket Events (Socket.IO)

Clients connect to `ws://localhost:3000` to receive real-time tactical updates:

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `new_incident` | Server ➔ Client | `Incident` | Emitted when a new incident or manual SOS is declared. |
| `incident_updated` | Server ➔ Client | `Partial<Incident>` | Emitted when consensus scores or status changes. |
| `new_packet` | Server ➔ Client | `RescuePacket` | Emitted on every unique packet ingested. |
| `gateway_status` | Server ➔ Client | `Gateway` | Emitted when gateway heartbeats or backhaul changes. |

---

## 3. Rate Limiting & Error Sanitization

- **Rate Limit:** 500 requests per minute per IP address. Exceeding limits returns `429 Too Many Requests`.
- **Sanitized Errors:** Internal server error responses return `{ "success": false, "error": "Internal server error" }` to prevent leaking server internals.
