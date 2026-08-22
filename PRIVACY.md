# RescuENet Privacy & Data Minimization Architecture

---

## 1. Privacy Principles by Design

RescuENet operates under strict privacy and data minimization principles. During civil emergencies, personal privacy must be protected to prevent surveillance, identity theft, or unauthorized location tracking.

---

## 2. Core Privacy Guarantees

### A. Explicit, Permission-Gated Location
- **Zero Silent Tracking:** Location coordinates are queried strictly through `LocationService.getCurrentLocation()` upon explicit user authorization.
- **Optional Coordinates:** Manual SOS and all disaster incident report forms function completely with or without location data (`location: null`).
- **No Background Polling:** The application does not poll or record location history in the background.

### B. Local Edge Processing (Zero Raw Sensor Uploads)
- **Edge Computation:** Accelerometer waveforms and microphone acoustic readings are processed entirely in-memory on the client device.
- **Zero Raw Audio Storage:** Raw audio recordings are **never** stored on disk or transmitted over the mesh network or internet.
- **Data Minimization:** Only mathematical feature summary statistics (variance, peak magnitude) are attached to candidate observations.

### C. Pseudonymous Identity Protection
- **No Personally Identifiable Information (PII):** Packets, logs, and database records do not contain user names, phone numbers, email addresses, or device IMEI numbers.
- **Ephemeral Device Identifiers:** Nodes generate an unlinked pseudonymous identifier (`device_<uuid>`) stored only in the browser's local state.

### D. Data Retention & Expiration
- **Automatic Purging:** Mesh routing nodes purge packets immediately upon TTL expiration (`ttl <= 0`).
- **Local Control:** Users can clear all locally cached packets, reports, and simulated nodes with a single button click in settings.
