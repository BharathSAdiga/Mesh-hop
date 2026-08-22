# RescuENet Protocol Specification

This document details the shared packet protocol for RescuENet. The protocol uses a standard `RescuePacket` structure which is strictly validated using Zod at runtime boundaries (frontend, gateway, backend).

## RescuePacket

| Field | Type | Description |
|---|---|---|
| `packetId` | `string` | Unique identifier for the packet, prefixed with `pkt_`. UUIDv4 recommended. |
| `senderId` | `string` | Pseudonymous identifier of the sender device. Must not contain PII. |
| `eventType` | `EventType` | The nature of the emergency (e.g., `SOS`, `FIRE`). |
| `timestamp` | `number` | Unix epoch time in milliseconds when the packet was created. |
| `location` | `Location` (optional) | The geographic coordinates of the event. |
| `anomalyScore` | `number` | The AI confidence score (0 to 1) indicating behavioral anomaly. 1.0 for manual SOS. |
| `consensusScore` | `number` | The mesh consensus score (0 to 1) indicating peer verification. 1.0 for manual SOS. |
| `priority` | `Priority` | Urgency of the packet (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). |
| `ttl` | `number` | Time-to-Live in seconds. Decremented by peers during forwarding to prevent infinite loops. |
| `hopCount` | `number` | Incremented each time a peer forwards the packet. |
| `authMetadata` | `AuthMetadata` (optional) | Cryptographic proofs for data integrity. Contains `hash`. |
| `createdAt` | `number` | Local timestamp of record creation. |

## EventType
Defines the category of the emergency.
- `SOS`: Manual user-triggered distress signal.
- `STRUCTURAL_COLLAPSE`: Detected structural failure.
- `STAMPEDE`: Detected stampede pattern.
- `FIRE`: Detected fire.
- `FLOOD`: Detected flood.
- `GENERAL_EMERGENCY`: Unspecified emergency.
- `BEHAVIORAL_ANOMALY`: AI-detected abnormal behavior.

## Priority
Defines how nodes handle and enqueue the packet.
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL` (highest, always prioritized for forwarding).

## Packet Integrity
To ensure a packet hasn't been maliciously tampered with during mesh transit, `calculatePacketHash` generates a SHA-256 hash using the Web Crypto API (`crypto.subtle.digest`) over the critical fields:
- `packetId`
- `senderId`
- `eventType`
- `timestamp`
- `anomalyScore`
- `priority`

The resulting hexadecimal hash is stored in `authMetadata.hash`.

*Note: Since RescuENet is designed as a browser-first application, hardware-backed cryptography (e.g. Secure Enclave, Android Keystore) is not assumed or claimed.*
