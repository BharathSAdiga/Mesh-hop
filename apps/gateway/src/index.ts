import { WebSocketServer, WebSocket } from 'ws';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';
import { EmergencyPacket } from '@rescuenet/shared';

dotenv.config({ path: '../../.env' });

const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '3001', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const wss = new WebSocketServer({ port: GATEWAY_PORT });
console.log(`[Gateway] Local Mesh Gateway listening on ws://localhost:${GATEWAY_PORT}`);

// Connect to the authoritative backend (Command Center)
const backendSocket = io(BACKEND_URL);

backendSocket.on('connect', () => {
  console.log(`[Gateway] Connected to backend Command Center at ${BACKEND_URL}`);
});

backendSocket.on('emergency_packet', (packet: EmergencyPacket) => {
  // If the backend broadcasts a packet, forward it to local connected mesh nodes (browser clients)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'emergency_packet', payload: packet }));
    }
  });
});

wss.on('connection', (ws) => {
  console.log(`[Gateway] Local browser client connected`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'emergency_packet') {
        const packet: EmergencyPacket = data.payload;
        console.log(`[Gateway] Received packet from local client: ${packet.packetId}`);
        
        // Forward to the backend (simulate mesh reaching internet)
        backendSocket.emit('emergency_packet', packet);
      }
    } catch (err) {
      console.error(`[Gateway] Failed to parse message`, err);
    }
  });

  ws.on('close', () => {
    console.log(`[Gateway] Local browser client disconnected`);
  });
});
