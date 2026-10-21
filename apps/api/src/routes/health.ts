import { Router, Request, Response } from 'express';
import { ApiResponse, HealthStatus } from '@school/shared';

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get(['/health', '/healthz'], (req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const healthData: HealthStatus = {
    status: 'healthy',
    service: '@school/api',
    version: '0.1.0',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };

  const response: ApiResponse<HealthStatus> = {
    success: true,
    data: healthData,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      note: 'Liveness probe active. Database connectivity requires verified credentials in upcoming milestone.',
    },
  };

  res.status(200).json(response);
});
