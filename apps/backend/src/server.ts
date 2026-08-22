import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createApp } from './app';
import { PacketService } from './services/PacketService';
import { NodeRegistryService } from './services/NodeRegistryService';

dotenv.config({ path: '../../.env' });

const PORT = parseInt(process.env.PORT || '3000', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rescuenet';

// Initialize Socket.io instance with placeholder server
let ioInstance: Server | null = null;
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
});
ioInstance = io;

const app = createApp(ioInstance);
// Delegate HTTP requests to express app
server.removeAllListeners('request');
server.on('request', app);

io.on('connection', (socket) => {
  console.log(`[Backend Socket] Client/Gateway connected: ${socket.id}`);

  // When a gateway forwards an emergency packet over Socket.io
  socket.on('emergency_packet', async (packet, callback) => {
    console.log(`[Backend Socket] Received packet: ${packet?.packetId}`);
    try {
      const result = await PacketService.ingestPacket(packet, io);
      if (callback) {
        callback(result);
      }
    } catch (err: any) {
      if (callback) {
        callback({ success: false, error: err?.message });
      }
    }
  });

  // Gateway status heartbeat over Socket.io
  socket.on('gateway_heartbeat', async (data) => {
    if (data && data.gatewayId) {
      await NodeRegistryService.updateGatewayHeartbeat(data.gatewayId, data, io);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Backend Socket] Disconnected: ${socket.id}`);
  });
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Backend DB] Connected to MongoDB at ${MONGODB_URI}`);
  } catch (err) {
    console.warn(`[Backend DB] MongoDB connection skipped or unavailable. Running with in-memory fallbacks.`);
  }

  server.listen(PORT, () => {
    console.log(`[Backend] RescuENet Command Center API listening on http://localhost:${PORT}`);
    console.log(`[Backend] Socket.IO server active on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { server, io };
