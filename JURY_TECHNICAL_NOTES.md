# RescuENet Technical Defense & Jury Notes

This document provides rigorous, technically accurate explanations of all core engineering decisions, algorithmic models, and prototype boundaries in RescuENet.

---

### 1. Why is this a Web App (PWA)?
- **Zero Friction & Zero Installation Barrier:** During acute civil emergencies, victims cannot search, download, and install a 100MB native app from Google Play or Apple App Store—especially when cellular bandwidth is degraded or completely severed.
- **Universal Cross-Platform Access:** A Progressive Web App (PWA) runs instantaneously on any browser (Android, iOS, macOS, Windows, Linux) from a cached Service Worker or local Wi-Fi captive portal.
- **Instant Decentralized Distribution:** Emergency personnel can broadcast the PWA files from a portable micro-access point or Raspberry Pi field gateway in seconds.

---

### 2. How Does Offline Operation Work?
- **Service Worker Precaching:** The Vite PWA Service Worker precaches the HTML shell, compiled JavaScript bundles, Tailwind CSS styles, and static assets on first load, allowing the UI to render with zero internet connectivity.
- **IndexedDB Local Storage (`idb`):** The `PacketRepository` persists outgoing packets, incoming mesh packets, user reports, and safe zones locally on the device disk using IndexedDB.
- **Local Fallback Data:** Pre-bundled safe shelters and disaster survival instructions are stored on-device and tagged with explicit `LOCAL CACHED INFORMATION` provenance.

---

### 3. How Does Behavioral AI Work?
- **In-Memory Kinematic Sampling:** Inertial motion data (3-axis acceleration and gyroscope) and acoustic decibel readings are captured in sliding windows (1–5 seconds).
- **Statistical Feature Extraction:** Extracts peak acceleration magnitude ($g_{\text{max}}$), kinematic variance ($\sigma^2$), jerk rate ($\frac{da}{dt}$), and spectral peak frequency.
- **Deviation Scoring:** Evaluates deviation against a sliding baseline using Z-scores:
  $$Z = \frac{|x_{\text{observed}} - \mu_{\text{baseline}}|}{\sigma_{\text{baseline}}}$$
  $$\text{Anomaly Score} = \min\left(1.0, \; \frac{1}{1 + e^{-k(Z - Z_0)}}\right)$$
- If the score exceeds the detection threshold ($\ge 0.70$), it generates a candidate observation.

---

### 4. Why Collective Behavioral AI?
- **False-Positive Prevention:** A single device dropping from a table or a user jogging down stairs produces kinematic spikes nearly identical to an isolated impact. Declaring a disaster based on a single device would flood emergency services with false alarms.
- **Physical Reality of Disasters:** Disasters (building collapses, earthquakes, stampedes) physically affect multiple individuals simultaneously within a specific spatial perimeter. Multi-node corroboration is mathematically necessary to distinguish genuine disasters from isolated human accidents.

---

### 5. Why Doesn't the AI Diagnose Medical Conditions?
- **Scope & Safety:** RescuENet is strictly a disaster-management behavioral anomaly detection platform. It is **NOT** a medical diagnostic tool and makes no medical claims.
- **Sensor Limitations:** Standard smartphone accelerometers and microphones cannot reliably diagnose heart attacks, cardiac arrest, strokes, or internal illnesses. Attempting to claim medical diagnosis without clinical-grade physiological sensors (ECG, pulse oximetry, photoplethysmography) and FDA/CE clinical certification would be irresponsible and dangerous.

---

### 6. How Does Manual SOS Work?
- **Explicit Human Intent:** When a user presses the SOS button or completes the 3-second hold countdown, the action represents definitive distress.
- **Consensus Bypass:** Manual SOS is assigned a confidence score of `1.0` and `CRITICAL` priority. It **immediately bypasses AI consensus** and is queued directly for mesh broadcast to prevent any algorithmic delay in life-critical situations.

---

### 7. How Does the Mesh / Relay Work?
- **Opportunistic Peer-to-Peer Relaying:** Nodes broadcast packets to nearby peers using local network transports (`LocalWebSocketTransport` in prototype; Web Bluetooth / BLE where supported).
- **Hop Traversal Protocol:** Each receiving node validates the schema, checks for duplicates, decrements the TTL, increments the hop count, persists the packet in IndexedDB, enqueues it in the `ForwardingQueue`, and re-transmits it to neighboring nodes.

---

### 8. What Happens When Internet is Unavailable?
- **Zero Data Loss:** Packets generated on isolated devices are persisted to local IndexedDB storage in a `PENDING` state.
- **Store-and-Carry Propagation:** Mobile users physically moving through the disaster zone act as physical data mules, carrying packets toward functioning field gateways or communication perimeters.

---

### 9. How Does Store-Carry-Forward Work?
- **Delay-Tolerant Networking (DTN):** When no gateway or peer is in range, packets remain in local storage (`PENDING`).
- **Opportunistic Contact:** When a relay node or field gateway comes into wireless range, the `DeliveryManager` drains the pending queue in strict priority order (`CRITICAL > HIGH > MEDIUM > LOW`), transitioning state to `DELIVERED`.

---

### 10. How Do You Prevent Duplicate Packets?
- **Deterministic Unique IDs:** Every packet is assigned a globally unique `packetId` (`pkt_<uuid>`).
- **Multi-Tier Deduplication:**
  1. **Mesh Nodes:** `DeliveryManager` maintains an in-memory set and IndexedDB index of recently seen packet IDs.
  2. **Gateway:** `GatewayService` tracks ingested packet IDs and drops duplicates.
  3. **Backend:** `PacketService` uses a unique MongoDB index on `packetId` and returns HTTP `409 Conflict` (`DROP_DUPLICATE`).

---

### 11. What is TTL (Time-To-Live)?
- **Loop & Congestion Control:** TTL defines the maximum lifespan or hop count of a packet (default: 86,400s / customizable hop limits).
- **Hop Decrementing:** Every relay node decrements TTL by 1 (`decrementTTL`).
- **Immediate Expiration:** When `TTL <= 0`, forwarding immediately stops, preventing broadcast storms and infinite routing loops in circular mesh topologies.

---

### 12. How Does Consensus Work?
- **Sliding Spatiotemporal Window:** The consensus engine gathers candidate observations occurring within $\Delta t \le 30\,\text{s}$ and spatial proximity $\le 500\,\text{m}$.
- **4-Factor Weighted Formula:**
  $$\text{Consensus Score} = 0.30 \cdot S_{\text{beh}} + 0.25 \cdot S_{\text{temp}} + 0.25 \cdot S_{\text{spat}} + 0.20 \cdot S_{\text{event}}$$
- **Thresholds:**
  - $\ge 0.70$: `CANDIDATE` (1 node)
  - $\ge 0.75$: `CORRELATED` (2 nodes)
  - $\ge 0.85$: `CONFIRMED` ($\ge 3$ nodes)

---

### 13. How is Privacy Protected?
- **No Personally Identifiable Information (PII):** Packets contain zero names, phone numbers, email addresses, or IMEI numbers.
- **Ephemeral Pseudonymous Device IDs:** Nodes identify as `device_<uuid>` stored only in local browser state.
- **No Raw Sensor Uploads:** Microphone audio and continuous accelerometer waveforms are processed exclusively at the edge and immediately discarded.
- **Optional GPS:** Manual SOS and reports work with `location: null` when location permission is omitted.

---

### 14. How is Location Obtained?
- **Explicit HTML5 Geolocation API:** Queried strictly via `LocationService.getCurrentLocation()` with high accuracy enabled.
- **Graceful Fallback:** If permission is denied or GPS is unavailable (e.g. indoors/subterranean), the system transmits the report with `location: null` without impeding packet routing.

---

### 15. What are Browser BLE Limitations?
- **Platform Inconsistency:** Web Bluetooth is supported on Chromium (Chrome, Edge) on Android, macOS, and Windows, but is **unsupported on iOS Safari / WebKit**.
- **User-Initiated Pairing:** Web Bluetooth requires a manual user gesture to initiate pairing; continuous background advertising and scanning are restricted by browser sandboxing.
- **Architecture Strategy:** RescuENet provides a modular `TransportAdapter` abstraction using WebSocket for reliable prototyping, allowing native BLE firmware or Web Bluetooth to plug in seamlessly.

---

### 16. What is Simulated in the Prototype?
- **Simulated Kinematics in Demo:** The Demo Control Center provides deterministic synthetic shock datasets (`0.91`, `0.87`, `0.84`) to demonstrate consensus repeatability.
- **Simulated Backhaul Toggle:** The Gateway Simulator provides `[ INTERNET ON ]` / `[ INTERNET OFF ]` controls to test opportunistic queue draining without needing to physically disconnect cellular cables.
- **Multi-Device Cluster:** 5 virtual nodes run in browser state to simulate a physical building collapse scenario on a single test machine.

---

### 17. What Would Be Required for Production Deployment?
1. **Dedicated Hardware Radios:** Long-range sub-GHz mesh transceivers (LoRa SX1262 / ESP32 BLE 5.0 mesh) for physical RF propagation independent of OS browser throttling.
2. **Cryptographic PKI:** Ed25519 asymmetric device signatures backed by hardware keystores (Android KeyStore / iOS Secure Enclave) for Sybil-resistant identity.
3. **Hardened Field Gateways:** Vehicle-mounted units equipped with satellite modems (Iridium / Starlink), solar battery backups, and ruggedized Linux enclosures.
4. **Encrypted Local Storage:** AES-GCM-256 encrypted IndexedDB databases with user-derived keys.
5. **Calibrated Neural Models:** Deep learning models trained on physical shake-table structural collapse datasets and real-world disaster recordings.
