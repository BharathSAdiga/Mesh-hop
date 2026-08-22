# RescuENet Privacy & Security Hardening Audit

**Audit Date:** August 2026  
**Target:** RescuENet Disaster-Management Behavioral AI Mesh Platform  
**Scope:** Frontend PWA, Sensor & AI Engine, Consensus Engine, Store-Carry-Forward Mesh, Gateway Microservice, and Authoritative Backend.

---

## 1. Executive Summary

RescuENet is an offline-first disaster-response behavioral anomaly mesh platform designed to function during severe telecommunication blackouts. This security and privacy audit evaluates the controls implemented across identity, location, sensor telemetry, packet integrity, and network protocols.

---

## 2. Hardened Security & Privacy Controls

### A. Location Privacy
- **Explicit Permission-Gating:** Location coordinates are accessed strictly via `LocationService.getCurrentLocation()` after explicit browser permission prompts.
- **Zero Silent Tracking:** Location is never polled continuously in background worker threads without user authorization.
- **Graceful Omission:** Manual SOS and disaster incident reports (`Report.tsx`) function without location data (`location: null`). Rescue packets are valid and routable with or without GPS.

### B. Pseudonymous Identity
- **Zero Personally Identifiable Information (PII):** Packets, observations, and incident records contain no names, phone numbers, email addresses, or IMEI/hardware identifiers.
- **Ephemeral Pseudonymous Device IDs:** Generated as `device_<uuid>` and stored in local device storage (`localStorage`).

### C. Local Sensor Processing & Privacy
- **Edge Feature Extraction:** Raw audio waveforms and high-frequency accelerometer samples are processed exclusively in-memory on the client device.
- **Zero Raw Media Transmission:** Microphone audio, audio recordings, or continuous raw sensor time-series are **never** stored on disk or transmitted over the mesh network or internet. Only mathematical summary statistics (`FeatureSummary`: variance, magnitude, spectral peak frequency) are forwarded for collective consensus.

### D. Packet Integrity & Routing Defenses
- **Zod Protocol Schema Validation:** Every packet received via mesh, WebSocket, or REST API is validated against `@rescuenet/shared` schemas (`validatePacket`). Malformed payloads are immediately rejected.
- **Deduplication:** Tracked at mesh relays (`DeliveryManager`), gateways (`GatewayService`), and backend (`PacketService`) using unique `packetId` indexes.
- **TTL Enforcement:** Hop count is incremented and TTL is decremented at each node (`decrementTTL`). Expired packets (`TTL <= 0`) are purged immediately.
- **Packet Integrity Protection:** Payload hashing via SHA-256 (`calculatePacketHash`) attaches an integrity digest (`authMetadata.hash`) to verify that telemetry has not been tampered with during forwarding.

### E. Backend & API Hardening
- **In-Memory Rate Limiting:** Applied to all ingress REST endpoints (500 requests / minute / IP window) to protect against denial-of-service attempts.
- **Sanitized Error Responses:** Internal stack traces and database internal error strings are stripped from responses in production.
- **Environment Isolation:** Zero credentials or database passwords committed. Environment templates provided via `.env.example`.

---

## 3. Honest Prototype Limitations & Future Production Roadmap

While RescuENet incorporates robust defenses suitable for field prototypes, the following limitations exist and must be addressed for military-grade / mission-critical enterprise deployment:

| Category | Current Prototype Status | Future Production Requirement |
|---|---|---|
| **Cryptographic Identity** | Ephemeral pseudonyms (`device_<uuid>`) without asymmetric signatures. | Public Key Infrastructure (PKI) with Ed25519 device key pairs and hardware-backed keystores (Android KeyStore / iOS Secure Enclave). |
| **Sybil Attack Resistance** | Open prototype allows multiple virtual nodes on local network. | Proof-of-Physical-Proximity and signed node enrollment certificates to prevent rogue mesh flooding. |
| **Local Data-at-Rest Encryption** | Plain IndexedDB / LocalStorage. | Encrypted local storage using WebCrypto AES-GCM-256 with key derived from user passphrase. |
| **Hardware BLE Mesh** | Simulated and Web Bluetooth prototype. | Hardware BLE 5.0 mesh firmware on dedicated radio nodes (e.g. ESP32, Semtech LoRa SX1262). |
| **Backhaul Transport Security** | HTTP/WebSocket during development. | Mandatory mTLS (mutual TLS) between Gateway field hardware and Authoritative Backend. |

---

## 4. Compliance & Behavioral AI Disclaimer

> **DISCLAIMER:**  
> RescuENet is a disaster-management behavioral anomaly detection platform. It is **NOT** a medical diagnostic tool and does not detect, monitor, or claim to diagnose medical conditions, heart attacks, or illnesses. Manual SOS always bypasses consensus, and single-device anomalies never declare confirmed disasters without multi-node corroboration.
