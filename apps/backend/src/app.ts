import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { PacketService } from './services/PacketService';
import { IncidentService } from './services/IncidentService';
import { ObservationService } from './services/ObservationService';
import { NodeRegistryService } from './services/NodeRegistryService';

/**
 * Simple in-memory rate limiter for backend API protection.
 */
function createRateLimiter(maxRequests: number = 300, windowMs: number = 60000) {
  const ipRequests = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = ipRequests.get(ip);

    if (!entry || now > entry.resetAt) {
      ipRequests.set(ip, { count: 1, resetAt: now + windowMs });
      next();
    } else {
      entry.count += 1;
      if (entry.count > maxRequests) {
        res.status(429).json({
          success: false,
          error: 'Too many requests. Rate limit exceeded.',
        });
        return;
      }
      next();
    }
  };
}

export function createApp(io?: any) {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(createRateLimiter(500, 60000));

  // GET /api/health
  app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'rescuenet-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // POST /api/packets
  app.post('/api/packets', async (req: Request, res: Response) => {
    try {
      const result = await PacketService.ingestPacket(req.body, io);
      if (result.success) {
        res.status(201).json(result);
      } else if (result.action === 'DROP_DUPLICATE') {
        res.status(409).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Internal server error processing packet' });
    }
  });

  // GET /api/packets
  app.get('/api/packets', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const packets = await PacketService.getPackets(limit);
      res.status(200).json({ count: packets.length, packets });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve packets' });
    }
  });

  // GET /api/incidents
  app.get('/api/incidents', async (req: Request, res: Response) => {
    try {
      const { status, eventType } = req.query;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const incidents = await IncidentService.getIncidents({
        status: status as string,
        eventType: eventType as string,
        limit,
      });
      res.status(200).json({ count: incidents.length, incidents });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve incidents' });
    }
  });

  // GET /api/incidents/:id
  app.get('/api/incidents/:id', async (req: Request, res: Response) => {
    try {
      const incident = await IncidentService.getIncidentById(req.params.id);
      if (!incident) {
        res.status(404).json({ success: false, error: 'Incident not found' });
        return;
      }
      res.status(200).json({ success: true, incident });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve incident details' });
    }
  });

  // POST /api/observations
  app.post('/api/observations', async (req: Request, res: Response) => {
    try {
      const result = await ObservationService.ingestObservation(req.body, io);
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch {
      res.status(500).json({ success: false, error: 'Failed to process observation' });
    }
  });

  // GET /api/observations
  app.get('/api/observations', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const observations = await ObservationService.getObservations(limit);
      res.status(200).json({ count: observations.length, observations });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve observations' });
    }
  });

  // GET /api/gateways
  app.get('/api/gateways', async (_req: Request, res: Response) => {
    try {
      const gateways = await NodeRegistryService.getGateways();
      res.status(200).json({ count: gateways.length, gateways });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve gateways' });
    }
  });

  // POST /api/gateways/heartbeat
  app.post('/api/gateways/heartbeat', async (req: Request, res: Response) => {
    try {
      const { gatewayId, name, status, metrics, location } = req.body;
      if (!gatewayId) {
        res.status(400).json({ success: false, error: 'gatewayId is required' });
        return;
      }
      const gateway = await NodeRegistryService.updateGatewayHeartbeat(gatewayId, { name, status, metrics, location }, io);
      res.status(200).json({ success: true, gateway });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to update gateway heartbeat' });
    }
  });

  // GET /api/nodes
  app.get('/api/nodes', async (_req: Request, res: Response) => {
    try {
      const nodes = await NodeRegistryService.getNodes();
      res.status(200).json({ count: nodes.length, nodes });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve nodes' });
    }
  });

  return app;
}

export default createApp();
