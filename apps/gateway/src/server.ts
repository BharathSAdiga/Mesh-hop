import express from 'express';
import cors from 'cors';
import { GatewayService } from './services/GatewayService';

export function createGatewayApp(gatewayService: GatewayService) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'rescuenet-gateway' });
  });

  // GET /gateway/status
  app.get('/gateway/status', (req, res) => {
    res.json(gatewayService.getStatus());
  });

  // POST /gateway/packet
  app.post('/gateway/packet', async (req, res) => {
    try {
      const result = await gatewayService.ingestPacket(req.body);
      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.action === 'DROP_DUPLICATE' ? 409 : 400;
        res.status(statusCode).json(result);
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
    }
  });

  // POST /gateway/simulate/backhaul
  app.post('/gateway/simulate/backhaul', (req, res) => {
    const { internet } = req.body;
    gatewayService.setSimulatedInternet(!!internet);
    res.json({ success: true, status: gatewayService.getStatus() });
  });

  // GET /gateway/packets (for developer inspection)
  app.get('/gateway/packets', (req, res) => {
    res.json({
      pending: gatewayService.getStorage().getPendingPackets(),
      all: gatewayService.getStorage().getAllPackets(),
    });
  });

  return app;
}
