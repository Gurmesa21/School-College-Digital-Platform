import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';

export function createApp(): Express {
  const app = express();

  // Middleware pipeline
  app.use(express.json());
  app.use(requestIdMiddleware);

  // Development CORS restricted to local frontend
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // Root health probe
  app.use('/', healthRouter);

  // Versioned API routes (/api/v1)
  const v1Router = express.Router();
  v1Router.use('/', healthRouter);
  app.use(config.API_PREFIX, v1Router);

  // 404 & Central Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
