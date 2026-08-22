# RescuENet Packet Protocol Specification

**Package:** `@rescuenet/shared`  
**Protocol Version:** 1.0.0

---

## 1. Protocol Overview

The RescuENet Packet Protocol defines the standardized binary and JSON exchange format for all emergency telemetry, manual distress signals, and incident reports routed across peer-to-peer mesh links, gateway uplinks, and backend servers.

---

## 2. Packet Structure (`RescuePacket`)

| Field | Type | Required | Description |
|---|---|---|---|
| `packetId` | `string` | **Yes** | Unique identifier formatted as `pkt_<uuid>`. |
| `senderId` | `string` | **Yes** | Ephemeral pseudonymous sender ID (`device_<uuid>`). |
| `eventType` | `EventType` | **Yes** | Classified disaster event category. |
| `timestamp` | `number` | **Yes** | Epoch milliseconds when the packet was created. |
| `location` | `Location` | *No* | Optional GPS coordinates (`latitude`, `longitude`, `accuracy`). |
| `anomalyScore` | `number` | **Yes** | Edge AI anomaly confidence score ($0.0 \le \text{Score} \le 1.0$). |
| `consensusScore` | `number` | **Yes** | Multi-node consensus corroboration score ($0.0 \le \text{Score} \le 1.0$). |
| `priority` | `Priority` | **Yes** | Routing queue tier (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`). |
| `ttl` | `number` | **Yes** | Time-To-Live in seconds or hops. Decremented on each hop. |
| `hopCount` | `number` | **Yes** | Number of mesh forwarding hops traversed. |
| `createdAt` | `number` | **Yes** | Epoch timestamp of original node generation. |
| `featureSummary` | `FeatureSummary`| *No* | Optional edge mathematical statistics (variance, peak magnitude). |
| `authMetadata` | `AuthMetadata` | *No* | SHA-256 integrity hash verification digest. |

---

## 3. Event Types (`EventType`)

- `SOS`: Manual high-priority emergency distress beacon.
- `STRUCTURAL_COLLAPSE`: Building, bridge, or tunnel structural failure.
- `STAMPEDE`: High-density crowd surge, bottleneck crush, or panic.
- `FIRE`: Structure fire, smoke hazard, or extreme thermal blaze.
- `FLOOD`: Flash flood, rising waters, or dam overflow.
- `GENERAL_EMERGENCY`: Unspecified acute field crisis.
- `BEHAVIORAL_ANOMALY`: Edge AI candidate anomaly before consensus.
- `COLLAPSE_PATTERN`: In-flight candidate collapse signature.
- `STAMPEDE_PATTERN`: In-flight candidate stampede signature.
- `SUDDEN_IMPACT`: High-G acceleration shockwave.
- `RAPID_MOVEMENT`: Uncontrolled sudden directional acceleration.
- `NORMAL`: Ambient baseline telemetry (not forwarded across mesh).

---

## 4. Priority Tiers & Queue Ordering

Packets are stored and forwarded strictly by priority rank:

1. **`CRITICAL` (Weight 4):** Manual `SOS`, `STRUCTURAL_COLLAPSE`, `FIRE`. Forwarded immediately; never evicted during storage pressure.
2. **`HIGH` (Weight 3):** `STAMPEDE`, `FLOOD`, `CONFIRMED` collective consensus events.
3. **`MEDIUM` (Weight 2):** `GENERAL_EMERGENCY`, `CORRELATED` candidate events.
4. **`LOW` (Weight 1):** Routine node heartbeats and ambient network health telemetry.

---

## 5. Packet Lifecycle & Hop Invariants

Every forwarding node executes the following deterministic 8-step protocol:

```
[ INCOMING PACKET ]
        │
        ▼
1. SCHEMA VALIDATION (Zod parse against RescuePacketSchema)
        │
        ▼
2. DEDUPLICATION (Check packetId against recently seen set)
        │
        ▼
3. TTL CHECK (If ttl <= 0 ➔ DROP & EXPIRED)
        │
        ▼
4. DECREMENT TTL (ttl = max(0, ttl - 1))
        │
        ▼
5. INCREMENT HOP COUNT (hopCount = hopCount + 1)
        │
        ▼
6. PERSIST UPDATED PACKET (Save to IndexedDB repository)
        │
        ▼
7. QUEUE IN PRIORITY ORDER (Enqueue into ForwardingQueue)
        │
        ▼
8. TRANSMIT (Opportunistically send to next peer / gateway)
```

---

## 6. Packet Integrity & Auth Digest

Packets optionally contain an SHA-256 payload integrity digest:
$$\text{Payload} = \text{packetId} : \text{senderId} : \text{eventType} : \text{timestamp} : \text{anomalyScore} : \text{priority}$$
$$\text{authMetadata.hash} = \text{SHA-256}(\text{Payload})$$

Receiving nodes verify the integrity digest via `verifyPacketIntegrity(packet)`. If payload values are modified in-flight, the verification fails and the packet is rejected.
