# RescuENet Privacy Audit Report

**Date of Audit:** August 2026  
**Subject:** Data Protection, Anonymity, and Edge Processing Verification  
**Repository:** [BharathSAdiga/Mesh-hop](https://github.com/BharathSAdiga/Mesh-hop)

---

## 1. Privacy Scope & Principles

This privacy audit examines compliance with privacy-by-design standards across the RescuENet platform during emergency mesh communications.

---

## 2. Verification of Privacy Controls

### A. Location Privacy & Permission Model
- **Explicit User Consent:** Location is accessed exclusively through `LocationService.getCurrentLocation()` which invokes the browser's native permission modal.
- **Zero Silent Background Tracking:** The application performs zero background geolocation polling when the user is inactive.
- **Full Offline & Location-Denied Operability:** Manual SOS and all disaster reporting forms (`Report.tsx`) function without GPS (`location: null`). Ingestion, multi-hop relaying, and Command Center mapping operate gracefully without location coordinates.

### B. Sensor Telemetry & In-Memory Processing
- **Edge Computation:** Accelerometer kinematic samples (3-axis) and microphone acoustic decibel peaks are analyzed exclusively in temporary browser RAM buffers (1–5 second sliding windows).
- **Zero Raw Audio Storage/Upload:** Microphone audio streams are never saved to disk, encoded to audio files, or uploaded to peer devices or backend servers.
- **Mathematical Summary Abstraction:** Only statistical summaries (`FeatureSummary`: variance, peak magnitude, jerk rate, spectral frequency) are extracted for anomaly scoring.

### C. Pseudonymous Identity Guarantees
- **No Personally Identifiable Information (PII):** Packets, logs, and database schemas do not contain user names, phone numbers, email addresses, national IDs, or hardware IMEI numbers.
- **Ephemeral Device Identifiers:** Nodes generate unlinked pseudonymous identifiers formatted as `device_<uuid>`, persisted only within local browser storage.

### D. Packet Integrity & Replay Defenses
- **Schema Validation:** Strict Zod parsing on all ingress endpoints (`validatePacket`).
- **Integrity Digest:** SHA-256 hash calculation (`calculatePacketHash`) on payload components.
- **Automatic TTL Expiration:** Nodes purge expired packets immediately (`TTL <= 0`) to prevent data accumulation.
- **Deduplication:** Multi-tier duplicate suppression at mesh relays, gateway, and backend prevents replay attacks.

---

## 3. Privacy Audit Conclusion

The RescuENet codebase strictly complies with the specified data minimization, edge processing, and privacy-preserving requirements.
