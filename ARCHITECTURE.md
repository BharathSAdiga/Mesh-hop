# RESCUENet Architecture

## Overview
RESCUENet is a browser-first application utilizing WebSockets (and optionally Web Bluetooth where supported) to maintain an emergency communication mesh when internet infrastructure fails.

## Core Components

1. **Frontend (`apps/frontend`)**: A React/Vite PWA that operates offline-first. It handles user interactions, local anomaly detection (Behavioral AI), and mesh network routing via the Gateway.
2. **Backend (`apps/backend`)**: A Node.js/Express application with MongoDB and Socket.IO. It serves as the authoritative truth and command center for managing incidents, processing confirmed mesh packets, and providing real-time disaster dashboard updates.
3. **Gateway (`apps/gateway`)**: A local Node.js WebSocket server bridging the browser to the rest of the mesh network. This simulates a local mesh node.
4. **Shared (`packages/shared`)**: Contains the emergency packet protocol definitions, TypeScript types, and schemas used consistently across the monorepo.

## Emergency Packet Protocol
Each packet flows via a Store-Carry-Forward mechanism with a TTL (Time-To-Live). Duplicates are suppressed based on `packetId`.

Packets contain:
- `packetId`, `senderId`, `eventType`, `timestamp`, `location`, `anomalyScore`, `consensusScore`, `priority`, `ttl`, `hopCount`, `createdAt`.

## Behavioral AI & Consensus
- Local anomaly detection identifies sudden impact, collapse, or stampede patterns.
- Consensus is achieved when multiple nodes report similar behavioral, temporal, and spatial anomalies. Consensus states: CANDIDATE -> CORRELATED -> CONFIRMED.
