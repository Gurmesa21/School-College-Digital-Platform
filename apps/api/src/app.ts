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
import { ICmsRepository, PrismaCmsRepository } from './repositories/cmsRepository.js';
import { INavigationRepository, PrismaNavigationRepository } from './repositories/navigationRepository.js';
import { IMediaRepository, PrismaMediaRepository } from './repositories/mediaRepository.js';
import { ITaxonomyRepository, PrismaTaxonomyRepository } from './repositories/taxonomyRepository.js';
import { IFormRepository, PrismaFormRepository } from './repositories/formRepository.js';
import { ISectionRepository, PrismaSectionRepository } from './repositories/sectionRepository.js';
import { IAcademicRepository, PrismaAcademicRepository } from './repositories/academicRepository.js';
import { IStaffRepository, PrismaStaffRepository } from './repositories/staffRepository.js';
import { INewsRepository, PrismaNewsRepository } from './repositories/newsRepository.js';
import { IAnnouncementRepository, PrismaAnnouncementRepository } from './repositories/announcementRepository.js';
import { IEventRepository, PrismaEventRepository } from './repositories/eventRepository.js';
import { AuthService } from './services/authService.js';
import { UserAdminService } from './services/userAdminService.js';
import { CmsService } from './services/cmsService.js';
import { NavigationService } from './services/navigationService.js';
import { MediaService } from './services/mediaService.js';
import { FormService } from './services/formService.js';
import { SectionService } from './services/sectionService.js';
import { AcademicService } from './services/academicService.js';
import { StaffService } from './services/staffService.js';
import { NewsService } from './services/newsService.js';
import { AnnouncementService } from './services/announcementService.js';
import { EventService } from './services/eventService.js';
import { InMemoryEmailService } from './services/emailService.js';
import { healthRouter } from './routes/health.js';
import { createTenantRouter } from './routes/tenant.js';
import { createAuthRouter } from './routes/auth.js';
import { createPlatformRouter } from './routes/platform.js';
import { createUserAdminRouter } from './routes/userAdmin.js';
import { createCmsAdminRouter } from './routes/cmsAdmin.js';
import { createSectionAdminRouter } from './routes/sectionAdmin.js';
import { createPublicContentRouter } from './routes/publicContent.js';
import { createNavigationAdminRouter } from './routes/navigationAdmin.js';
import { createPublicNavigationRouter } from './routes/publicNavigation.js';
import { createMediaAdminRouter } from './routes/mediaAdmin.js';
import { createPublicMediaRouter } from './routes/publicMedia.js';
import { createTaxonomyAdminRouter } from './routes/taxonomyAdmin.js';
import { createFormAdminRouter } from './routes/formAdmin.js';
import { createPublicFormsRouter } from './routes/publicForms.js';
import { createAcademicAdminRouter } from './routes/academicAdmin.js';
import { createPublicAcademicsRouter } from './routes/publicAcademics.js';
import { createStaffAdminRouter } from './routes/staffAdmin.js';
import { createPublicStaffRouter } from './routes/publicStaff.js';
import { createNewsAdminRouter } from './routes/newsAdmin.js';
import { createPublicNewsRouter } from './routes/publicNews.js';
import { createAnnouncementAdminRouter } from './routes/announcementAdmin.js';
import { createPublicAnnouncementsRouter } from './routes/publicAnnouncements.js';
import { createEventAdminRouter } from './routes/eventAdmin.js';
import { createPublicEventsRouter } from './routes/publicEvents.js';

export interface AppOptions {
  repository?: ITenantRepository;
  authRepository?: IAuthRepository;
  auditRepository?: IAuditRepository;
  cmsRepository?: ICmsRepository;
  navigationRepository?: INavigationRepository;
  mediaRepository?: IMediaRepository;
  taxonomyRepository?: ITaxonomyRepository;
  formRepository?: IFormRepository;
  sectionRepository?: ISectionRepository;
  academicRepository?: IAcademicRepository;
  staffRepository?: IStaffRepository;
  newsRepository?: INewsRepository;
  announcementRepository?: IAnnouncementRepository;
  eventRepository?: IEventRepository;
  emailService?: IEmailService;
  authService?: AuthService;
  userAdminService?: UserAdminService;
  cmsService?: CmsService;
  navigationService?: NavigationService;
  mediaService?: MediaService;
  formService?: FormService;
  sectionService?: SectionService;
  academicService?: AcademicService;
  staffService?: StaffService;
  newsService?: NewsService;
  announcementService?: AnnouncementService;
  eventService?: EventService;
  envConfig?: EnvConfig;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const envConfig = options.envConfig || defaultEnvConfig;

  // Repositories and Services
  const authRepository = options.authRepository || new PrismaAuthRepository();
  const auditRepository = options.auditRepository || new PrismaAuditRepository();
  const cmsRepository = options.cmsRepository || new PrismaCmsRepository();
  const navigationRepository = options.navigationRepository || new PrismaNavigationRepository();
  const mediaRepository = options.mediaRepository || new PrismaMediaRepository();
  const taxonomyRepository = options.taxonomyRepository || new PrismaTaxonomyRepository();
  const formRepository = options.formRepository || new PrismaFormRepository();
  const sectionRepository = options.sectionRepository || new PrismaSectionRepository();
  const academicRepository = options.academicRepository || new PrismaAcademicRepository();
  const staffRepository = options.staffRepository || new PrismaStaffRepository();
  const newsRepository = options.newsRepository || new PrismaNewsRepository();
  const announcementRepository = options.announcementRepository || new PrismaAnnouncementRepository();
  const eventRepository = options.eventRepository || new PrismaEventRepository();

  const sectionService =
    options.sectionService || new SectionService(sectionRepository, auditRepository);
  const academicService =
    options.academicService || new AcademicService(academicRepository, auditRepository);
  const staffService =
    options.staffService ||
    new StaffService(staffRepository, auditRepository, academicRepository, mediaRepository);
  const newsService =
    options.newsService ||
    new NewsService(newsRepository, auditRepository, mediaRepository);
  const announcementService =
    options.announcementService ||
    new AnnouncementService(announcementRepository, auditRepository);
  const eventService =
    options.eventService ||
    new EventService(eventRepository, auditRepository, mediaRepository);

  const emailService = options.emailService || new InMemoryEmailService();
  const authService = options.authService || new AuthService(authRepository, emailService);
  const userAdminService =
    options.userAdminService ||
    new UserAdminService(authRepository, auditRepository, emailService);
  const cmsService = options.cmsService || new CmsService(cmsRepository, auditRepository);
  const navigationService =
    options.navigationService || new NavigationService(navigationRepository, auditRepository);
  const mediaService = options.mediaService || new MediaService(mediaRepository, auditRepository);
  const formService =
    options.formService ||
    new FormService(formRepository, auditRepository, emailService, options.repository);

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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Tenant-Id', 'x-tenant-id', 'Accept'],
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
  const cmsAdminRouter = createCmsAdminRouter(cmsService, authRepository);
  const sectionAdminRouter = createSectionAdminRouter(sectionService, authRepository);
  const navigationAdminRouter = createNavigationAdminRouter(navigationService, authRepository);
  const mediaAdminRouter = createMediaAdminRouter(mediaService, authRepository);
  const taxonomyAdminRouter = createTaxonomyAdminRouter(taxonomyRepository, authRepository, auditRepository);
  const formAdminRouter = createFormAdminRouter(formService, authRepository);
  const academicAdminRouter = createAcademicAdminRouter(academicService, authRepository);
  const staffAdminRouter = createStaffAdminRouter(staffService, authRepository);
  const newsAdminRouter = createNewsAdminRouter(newsService, authRepository);
  const announcementAdminRouter = createAnnouncementAdminRouter(announcementService, authRepository);
  const eventAdminRouter = createEventAdminRouter(eventService, authRepository);

  const publicContentRouter = createPublicContentRouter(cmsService);
  const publicNavigationRouter = createPublicNavigationRouter(navigationService);
  const publicMediaRouter = createPublicMediaRouter(mediaService);
  const publicFormsRouter = createPublicFormsRouter(formService);
  const publicAcademicsRouter = createPublicAcademicsRouter(academicService);
  const publicStaffRouter = createPublicStaffRouter(staffService);
  const publicNewsRouter = createPublicNewsRouter(newsService);
  const publicAnnouncementsRouter = createPublicAnnouncementsRouter(announcementService);
  const publicEventsRouter = createPublicEventsRouter(eventService);
  const tenantRouter = createTenantRouter(authRepository);

  v1Router.use('/tenant/admin', tenantResolver, userAdminRouter);
  v1Router.use('/tenant/cms/pages', tenantResolver, cmsAdminRouter);
  v1Router.use('/tenant/cms/sections', tenantResolver, sectionAdminRouter);
  v1Router.use('/tenant/cms/navigation', tenantResolver, navigationAdminRouter);
  v1Router.use('/tenant/cms/media', tenantResolver, mediaAdminRouter);
  v1Router.use('/tenant/cms/taxonomy', tenantResolver, taxonomyAdminRouter);
  v1Router.use('/tenant/cms/forms', tenantResolver, formAdminRouter);
  v1Router.use('/tenant/cms/academics', tenantResolver, academicAdminRouter);
  v1Router.use('/tenant/cms/staff', tenantResolver, staffAdminRouter);
  v1Router.use('/tenant/cms/news', tenantResolver, newsAdminRouter);
  v1Router.use('/tenant/cms/announcements', tenantResolver, announcementAdminRouter);
  v1Router.use('/tenant/cms/events', tenantResolver, eventAdminRouter);

  v1Router.use('/tenant/public/staff', tenantResolver, publicStaffRouter);
  v1Router.use('/tenant/public/academics', tenantResolver, publicAcademicsRouter);
  v1Router.use('/tenant/public/forms', tenantResolver, publicFormsRouter);
  v1Router.use('/tenant/public/navigation', tenantResolver, publicNavigationRouter);
  v1Router.use('/tenant/public/media', tenantResolver, publicMediaRouter);
  v1Router.use('/tenant/public/news', tenantResolver, publicNewsRouter);
  v1Router.use('/tenant/public/announcements', tenantResolver, publicAnnouncementsRouter);
  v1Router.use('/tenant/public/events', tenantResolver, publicEventsRouter);
  v1Router.use('/tenant/public', tenantResolver, publicContentRouter);
  v1Router.use('/tenant', tenantResolver, tenantRouter);

  app.use(envConfig.API_PREFIX, v1Router);

  // 404 & Central Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
