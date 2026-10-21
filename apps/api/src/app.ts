import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ITenantRepository, IEmailService } from '@school/shared';
import { config as defaultEnvConfig, EnvConfig } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createTenantResolver } from './middleware/tenantResolver.js';
import { createSessionResolver, createOriginGuard } from './middleware/authMiddleware.js';
import { IAuthRepository, PrismaAuthRepository } from './repositories/authRepository.js';
import { IAuditRepository, PrismaAuditRepository } from './repositories/auditRepository.js';
import { AuthService } from './services/authService.js';
import { UserAdminService } from './services/userAdminService.js';
import { InMemoryEmailService } from './services/emailService.js';
import { healthRouter } from './routes/health.js';
import { createTenantRouter } from './routes/tenant.js';
import { createAuthRouter } from './routes/auth.js';
import { createPlatformRouter } from './routes/platform.js';
import { createUserAdminRouter } from './routes/userAdmin.js';

export interface AppOptions {
  repository?: ITenantRepository;
  authRepository?: IAuthRepository;
  auditRepository?: IAuditRepository;
  emailService?: IEmailService;
  authService?: AuthService;
  userAdminService?: UserAdminService;
  envConfig?: EnvConfig;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const envConfig = options.envConfig || defaultEnvConfig;

  // Repositories and Services
  const authRepository = options.authRepository || new PrismaAuthRepository();
  const auditRepository = options.auditRepository || new PrismaAuditRepository();
  const emailService = options.emailService || new InMemoryEmailService();
  const authService = options.authService || new AuthService(authRepository, emailService);
  const userAdminService =
    options.userAdminService ||
    new UserAdminService(authRepository, auditRepository, emailService);

  // Basic Express configuration
  if (envConfig.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  // Middleware pipeline
  app.use(express.json());
  app.use(cookieParser());
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

  // Cookie and CSRF protection
  app.use(createOriginGuard(envConfig));

  // Global session resolution (attaches req.user & req.session if valid token is provided)
  app.use(createSessionResolver(authService));

  // --- Operational Health Probes (Explicitly Outside Tenant Resolution) ---
  app.use('/', healthRouter);

  // Versioned API routes (/api/v1)
  const v1Router = express.Router();
  v1Router.use('/', healthRouter);

  // --- Authentication Routes (/api/v1/auth) ---
  v1Router.use('/auth', createAuthRouter(authService, userAdminService, envConfig));

  // --- Platform-Level Operations (/api/v1/platform) ---
  v1Router.use('/platform', createPlatformRouter(auditRepository));

  // --- Tenant-Scoped Domain Boundary (/api/v1/tenant) ---
  const tenantResolver = createTenantResolver(options.repository, envConfig);
  const userAdminRouter = createUserAdminRouter(userAdminService, authRepository, auditRepository);
  const tenantRouter = createTenantRouter(authRepository);

  v1Router.use('/tenant/admin', tenantResolver, userAdminRouter);
  v1Router.use('/tenant', tenantResolver, tenantRouter);

  app.use(envConfig.API_PREFIX, v1Router);

  // 404 & Central Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
