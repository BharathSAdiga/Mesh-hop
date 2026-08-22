import app from './app';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Priority } from '@rescuenet/shared'; // just to verify shared package works

dotenv.config({ path: '../../.env' });

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rescuenet';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  console.log(`[Backend] Gateway/Client connected: ${socket.id}`);

  socket.on('emergency_packet', (packet) => {
    console.log(`[Backend] Received packet: ${packet.packetId}`);
    // Broadcast back to command center or other gateways
    io.emit('emergency_packet', packet);
  });

  socket.on('disconnect', () => {
    console.log(`[Backend] Disconnected: ${socket.id}`);
  });
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[Backend] Connected to MongoDB at ${MONGODB_URI}`);

    server.listen(PORT, () => {
      console.log(`[Backend] Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error(`[Backend] Failed to start:`, err);
  }
}

startServer();
