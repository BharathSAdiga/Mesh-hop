import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GatewayService } from './services/GatewayService';
import { createGatewayApp } from './server';
dotenv.config({ path: '../../.env' });

const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '3001', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const gatewayService = new GatewayService({
  backendUrl: BACKEND_URL,
});

const app = createGatewayApp(gatewayService);
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log(`[Gateway] Local browser client connected via WebSocket`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      let rawPacket: unknown = data;

      if (data && data.type === 'emergency_packet' && data.payload) {
        rawPacket = data.payload;
      }

      const result = await gatewayService.ingestPacket(rawPacket);
      ws.send(JSON.stringify({ type: 'ingest_result', result }));

      // Broadcast to other local browser clients if uploaded or queued
      if (result.success) {
        const broadcastMsg = JSON.stringify({ type: 'emergency_packet', payload: rawPacket });
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(broadcastMsg);
          }
        });
      }
    } catch (err) {
      console.error(`[Gateway] Failed to handle WS message`, err);
    }
  });

  ws.on('close', () => {
    console.log(`[Gateway] Local browser client disconnected`);
  });
});

async function main() {
  await gatewayService.start();

  server.listen(GATEWAY_PORT, () => {
    console.log(`[Gateway] RescuENet Gateway listening on http://localhost:${GATEWAY_PORT}`);
    console.log(`[Gateway] WebSocket active on ws://localhost:${GATEWAY_PORT}`);
    console.log(`[Gateway] Backend target: ${BACKEND_URL}`);
  });
}

main().catch((err) => {
  console.error('[Gateway] Fatal startup error', err);
});
