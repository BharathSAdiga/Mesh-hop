# RescuENet Prototype Limitations & Engineering Constraints

---

## 1. Explicit Statement on Prototype Status

> [!IMPORTANT]
> **RescuENet is an engineering prototype and research platform.**
> It is **NOT** currently certified as a production-grade life-safety or military telecommunications system. Deployments in life-critical rescue scenarios must be backed by hardened emergency radio hardware.

---

## 2. Documented Technical Limitations

### A. Browser Sensor API Support Varies Across Platforms
- **Generic Sensor API / Accelerometer:** Modern Chromium browsers on Android support `Accelerometer` and `DeviceMotionEvent` with user interaction. iOS Safari imposes strict permission prompts and restricts high-frequency sensor background sampling.
- **Microphone Acoustic Permissions:** Web Audio API requires explicit user gesture to initialize the `AudioContext`.

### B. Web Bluetooth API Constraints
- **Platform Inconsistency:** Web Bluetooth is supported in Chromium-based browsers (Chrome, Edge, Opera) on Android, macOS, and Windows. It is **unsupported in iOS WebKit / Safari**.
- **User-Initiated Pairing:** Web Bluetooth requires a manual user click for device pairing; autonomous background peripheral scanning is restricted by the Web Bluetooth specification.

### C. Background Execution & OS Sleeping Restrictions
- When a mobile device screen turns off or the browser is minimized, mobile operating systems (iOS and Android) aggressively throttle background JavaScript timers, WebSocket connections, and Service Worker CPU usage.
- In a full production deployment, native background daemon services (e.g. Android Foreground Services or dedicated firmware on LoRa/ESP32 radios) are required for persistent background mesh relaying.

### D. Prototype Gateway & Backhaul
- The current Gateway microservice uses disk-backed JSON queues and prototype WebSockets for development simulation.
- Production field gateways require hardware cellular modems (LTE-M / NB-IoT), Iridium satellite transceivers, and industrial flash storage with power-loss protection.

### E. Prototype Behavioral AI & Simulated Disaster Patterns
- The edge anomaly detection model uses baseline statistical heuristics (Z-score thresholds, jerk rate, variance).
- Training data is based on simulated kinematic signatures and benchmark shock datasets. Deep neural network models trained on extensive real-world seismic collapse shake-table trials are recommended for production calibration.

### F. Non-Medical Disclaimer
- RescuENet is strictly a disaster-management kinematic anomaly detection tool. It does **NOT** monitor, detect, or claim to diagnose medical conditions, heart attacks, or physiological distress.
