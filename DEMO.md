# RescuENet Deterministic Demo Mode & Control Center Guide

**Route:** `/demo`  
**File:** `apps/frontend/src/pages/Demo.tsx`

---

## 1. Overview

RescuENet includes a **Deterministic Demo Mode** designed for repeatable presentations, architectural validation, and evaluation by disaster management authorities. It operates without random flakiness, guaranteeing consistent outputs for every scenario trigger.

---

## 2. The 10 Master Control Buttons

| Button Label | Action | Deterministic Outcome |
|---|---|---|
| `[ 🟢 NORMAL STATE ]` | Scenario 1 | 5 virtual nodes report `NORMAL` ambient telemetry; 0 incidents. |
| `[ 🏢 SIMULATE COLLAPSE ]` | Scenario 2 | Node A (`0.91`), Node B (`0.87`), Node C (`0.84`) trigger consensus (`0.935`) ➔ `CONFIRMED STRUCTURAL COLLAPSE`. |
| `[ 🏃 SIMULATE STAMPEDE ]` | Scenario 3 | Multi-node crowd surge detection evaluated to `CONFIRMED STAMPEDE PATTERN`. |
| `[ 🚨 SEND MANUAL SOS ]` | Scenario 8 | Instant broadcast with `CRITICAL` priority that **bypasses consensus**. |
| `[ 🔌 GATEWAY OFFLINE ]` | Scenario 4 | Backhaul severed; packet stored locally in IndexedDB as `PENDING`. |
| `[ 🌐 GATEWAY ONLINE ]` | Scenario 5 | Reconnected backhaul enters `SYNCING`, drains pending queue to `DELIVERED`. |
| `[ 🔄 DUPLICATE PACKET ]` | Scenario 6 | 1st transmission `ACCEPTED`, 2nd identical packet `DROPPED_DUPLICATE`. |
| `[ ⏱️ TTL TEST (TTL=3) ]` | Scenario 7 | `TTL=3 ➔ Hop 1 (2) ➔ Hop 2 (1) ➔ Hop 3 (0: STOP & EXPIRED)`. |
| `[ 🤝 MULTI-NODE CONSENSUS ]` | Consensus Demo | Displays 4-factor formula breakdown ($0.30 \cdot S_{\text{beh}} + 0.25 \cdot S_{\text{temp}} + 0.25 \cdot S_{\text{spat}} + 0.20 \cdot S_{\text{event}}$). |
| `[ 🔄 RESET DEMO ]` | Reset | Restores system to clean baseline. |

---

## 3. Step-by-Step Demonstration Script

1. **Start in Normal Baseline:** Click `[ 🟢 NORMAL STATE ]`. Point out that 5 independent browser nodes report baseline movements ($<0.10$), proving false-alarm suppression.
2. **Demonstrate Structural Collapse Consensus:** Click `[ 🏢 SIMULATE COLLAPSE ]`. Point out the 3 node scores (`0.91`, `0.87`, `0.84`) and the resulting weighted calculation yielding `CONFIRMED STRUCTURAL COLLAPSE`.
3. **Demonstrate Consensus Bypass on SOS:** Click `[ 🚨 SEND MANUAL SOS ]`. Emphasize that when a human presses the SOS button, the system does **not** wait for AI consensus—it transmits immediately.
4. **Demonstrate Store-and-Forward Routing:** Click `[ 🔌 GATEWAY OFFLINE ]` (stored as PENDING), then `[ 🌐 GATEWAY ONLINE ]` (drained to DELIVERED).
5. **Demonstrate Deduplication & TTL:** Click `[ 🔄 DUPLICATE PACKET ]` and `[ ⏱️ TTL TEST ]` to inspect protocol enforcement in real time.
