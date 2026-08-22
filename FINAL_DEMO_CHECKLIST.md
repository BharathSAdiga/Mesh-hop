# RescuENet Final Live Demonstration Checklist

**Target:** Official Live Demonstration & Jury Walkthrough  
**Route:** `http://localhost:5173/demo` and `http://localhost:5173/command-center`

---

## 1. Pre-Demo Environment Launch Sequence

Execute the following commands in separate terminals to start all microservices:

```bash
# Terminal 1: Authoritative Backend (Port 3000)
npm run dev --workspace=@rescuenet/backend

# Terminal 2: Gateway Microservice (Port 3001)
npm run dev --workspace=@rescuenet/gateway

# Terminal 3: Frontend PWA & Command Center (Port 5173)
npm run dev --workspace=frontend
```

---

## 2. The 8-Step End-to-End Live Demonstration Sequence

Follow this exact sequential workflow to demonstrate RescuENet's complete multi-tier architecture:

### Step 1: Normal Baseline Telemetry (`NORMAL`)
1. Open the **Demo Control Center** at `http://localhost:5173/demo`.
2. Click **`[ 🟢 NORMAL STATE ]`**.
3. **What to Point Out:**
   - 5 virtual in-field devices (`Node A` through `Node E`) are actively reporting ambient kinematics.
   - Anomaly scores are nominal ($<0.08$), demonstrating that normal daily movement does not generate false alarms.
   - Zero incident alerts are declared.

---

### Step 2: Edge Sensor Anomaly Detection (`BEHAVIORAL ANOMALY`)
1. Click **`[ 🏢 SIMULATE COLLAPSE ]`**.
2. **What to Point Out:**
   - `Node A` (1st Floor) detects a violent shockwave: Anomaly Score surges to **`0.91`** (`COLLAPSE_PATTERN`).
   - `Node B` (2nd Floor) detects structural buckling: Anomaly Score reaches **`0.87`**.
   - `Node C` (3rd Floor) detects ceiling collapse: Anomaly Score reaches **`0.84`**.
   - Peripheral nodes (`Node D`, `Node E`) remain baseline.

---

### Step 3: Multi-Node Collective Consensus (`MULTI-NODE CONSENSUS`)
1. In the **Multi-Node Consensus Calculator** panel on `/demo`:
2. **What to Point Out:**
   - The consensus engine evaluates 4 distinct similarity dimensions:
     - **Behavioral Similarity (30%):** $0.94$
     - **Temporal Similarity (25%):** $0.92$ (all occurred within $\Delta t < 0.5\,\text{s}$)
     - **Spatial Proximity (25%):** $0.89$ (same building quadrant)
     - **Event Type Agreement (20%):** $1.00$ (`COLLAPSE_PATTERN`)
   - **Weighted Consensus Score:** $0.935 > 0.85$ threshold.
   - **State Elevation:** Promoted from `CANDIDATE` ➔ `CORRELATED` ➔ **`CONFIRMED STRUCTURAL COLLAPSE`**.

---

### Step 4: Incident Packet Packaging (`INCIDENT PACKET`)
1. Point to the generated `RescuePacket`:
   - `packetId`: `PKT-6612-BETA`
   - `priority`: `CRITICAL`
   - `ttl`: `10`
   - `authMetadata.hash`: Validated SHA-256 integrity digest.

---

### Step 5: Store-Carry-Forward Mesh Relaying (`RELAY`)
1. Observe the **Deterministic Mesh Traversal Chain** animation:
   - **Hop 1:** `Node A (Origin)` forwards to `Node B (Relay 1)` $\rightarrow$ `TTL: 9`, `Hop: 1`.
   - **Hop 2:** `Node B` forwards to `Node C (Relay 2)` $\rightarrow$ `TTL: 8`, `Hop: 2`.
2. **Demonstrate Store-and-Forward Offline Resilience:**
   - Click **`[ 🔌 GATEWAY OFFLINE ]`**: Packet enters local IndexedDB storage as `PENDING` without packet loss.
   - Click **`[ 🌐 GATEWAY ONLINE ]`**: Reconnected backhaul automatically enters `SYNCING` and drains the pending queue.

---

### Step 6: Gateway Ingestion & Deduplication (`GATEWAY`)
1. Click **`[ 🔄 DUPLICATE PACKET ]`**:
   - 1st Transmission: Validated and marked **`ACCEPTED`**.
   - 2nd Identical Transmission: Detected by gateway dedup cache and marked **`DROPPED_DUPLICATE`**.
2. Click **`[ ⏱️ TTL TEST ]`**:
   - Demonstrates packet lifetime enforcement ($3 \rightarrow 2 \rightarrow 1 \rightarrow 0 \rightarrow \text{STOP \& EXPIRED}$).

---

### Step 7: Authoritative Backend Ingestion (`BACKEND`)
1. Navigate to the backend terminal / API logs (`http://localhost:3000/api/incidents`).
2. Point out that the incident record is stored in MongoDB with participating node IDs, summary statistics, and broadcast via Socket.IO.

---

### Step 8: Tactical Operations Console (`COMMAND CENTER`)
1. Open the **Command Center** at `http://localhost:5173/command-center`.
2. **What to Point Out:**
   - **Live Operations Map (Leaflet):** Pulsing red hazard marker at the disaster epicenter.
   - **Active Incidents Stream:** Real-time card showing `CONFIRMED STRUCTURAL COLLAPSE` with participating nodes.
   - **Behavioral AI Panel:** Anomaly confidence progress meter, feature summaries, and non-medical disclaimer.
   - **Packet Propagation Trail:** Animated 5-step hop chain displaying live delivery status (`DELIVERED`).
   - **Manual SOS Override:** Click `[ 🚨 SEND MANUAL SOS ]` on the header to prove that a human distress signal immediately broadcasts and **bypasses consensus**.
