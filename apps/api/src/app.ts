import express, { Express } from 'express';
import cors from 'cors';
import { ITenantRepository } from '@school/shared';
import { config as defaultEnvConfig, EnvConfig } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createTenantResolver } from './middleware/tenantResolver.js';
import { healthRouter } from './routes/health.js';
import { tenantRouter } from './routes/tenant.js';

export interface AppOptions {
  repository?: ITenantRepository;
  envConfig?: EnvConfig;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const envConfig = options.envConfig || defaultEnvConfig;

  // Basic Express configuration
  if (envConfig.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  // Middleware pipeline
  app.use(express.json());
  app.use(requestIdMiddleware);

  // Development CORS restricted to local frontend
  app.use(
    cors({
      origin: envConfig.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // --- Operational Health Probes (Explicitly Outside Tenant Resolution) ---
  app.use('/', healthRouter);

  // Versioned API routes (/api/v1)
  const v1Router = express.Router();
  v1Router.use('/', healthRouter);

  // --- Tenant-Scoped Domain Boundary ---
  const tenantResolver = createTenantResolver(options.repository, envConfig);
  v1Router.use('/tenant', tenantResolver, tenantRouter);

  app.use(envConfig.API_PREFIX, v1Router);

  // 404 & Central Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
