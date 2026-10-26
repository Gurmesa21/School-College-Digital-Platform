import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryCmsRepository } from '../src/repositories/cmsRepository.js';
import { InMemoryNavigationRepository } from '../src/repositories/navigationRepository.js';
import { InMemoryMediaRepository } from '../src/repositories/mediaRepository.js';
import { InMemoryTaxonomyRepository } from '../src/repositories/taxonomyRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { CmsService } from '../src/services/cmsService.js';
import { NavigationService } from '../src/services/navigationService.js';
import { MediaService } from '../src/services/mediaService.js';
import { PasswordService } from '../src/services/passwordService.js';
import {
  InMemoryStorageProvider,
  S3CompatibleStorageProvider,
  LocalStorageProvider,
} from '../src/storage/storageProvider.js';
import { validateFileContent, sanitizeFilename } from '../src/utils/fileValidation.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Day 11 Media Library, Dual-Storage Architecture & Access Control Suite', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let cmsRepo: InMemoryCmsRepository;
  let navRepo: InMemoryNavigationRepository;
  let mediaRepo: InMemoryMediaRepository;
  let taxRepo: InMemoryTaxonomyRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let cmsService: CmsService;
  let navService: NavigationService;
  let storageProvider: InMemoryStorageProvider;
  let mediaService: MediaService;
  let app: ReturnType<typeof createApp>;

  const defaultPassword = 'SecurePassword123!';
  let defaultPasswordHash: string;

  const tenantA: ResolvedTenant = {
    id: 'tenant-oxford-id',
    slug: 'oxford',
    name: 'Oxford International School',
    institutionType: 'PRIMARY_SECONDARY',
    status: 'ACTIVE',
    timezone: 'UTC',
    defaultLocale: 'en',
    contactEmail: 'admin@oxford.school.example',
    matchedHostname: 'oxford.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  const tenantB: ResolvedTenant = {
    id: 'tenant-greenwood-id',
    slug: 'greenwood',
    name: 'Greenwood Secondary School',
    institutionType: 'PRIMARY_SECONDARY',
    status: 'ACTIVE',
    timezone: 'Africa/Addis_Ababa',
    defaultLocale: 'en',
    contactEmail: 'admin@greenwood.school.example',
    matchedHostname: 'secondary.localhost',
    resolutionMethod: 'DOMAIN_MAPPING',
  };

  let tokenAdminA: string;
  let tokenStaffA: string;
  let tokenAdminB: string;

  // Real magic bytes test buffers
  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const validSvgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>');

  beforeEach(async () => {
    defaultPasswordHash = await PasswordService.hashPassword(defaultPassword);

    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantA, domains: ['oxford.localhost'] },
      { tenant: tenantB, domains: ['secondary.localhost'] },
    ]);

    authRepo = new InMemoryAuthRepository();
    auditRepo = new InMemoryAuditRepository();
    cmsRepo = new InMemoryCmsRepository();
    navRepo = new InMemoryNavigationRepository();
    mediaRepo = new InMemoryMediaRepository();
    taxRepo = new InMemoryTaxonomyRepository();
    emailService = new InMemoryEmailService();
    storageProvider = new InMemoryStorageProvider();

    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    cmsService = new CmsService(cmsRepo, auditRepo);
    navService = new NavigationService(navRepo, auditRepo);
    mediaService = new MediaService(mediaRepo, auditRepo, storageProvider);

    const testEnvConfig = loadConfig({
      NODE_ENV: 'test',
      APP_ENV: 'test',
      PORT: '4000',
      API_PREFIX: '/api/v1',
      CORS_ORIGIN: 'http://localhost:3000',
      ALLOW_DEV_TENANT_OVERRIDE: 'false',
      TRUST_PROXY: 'false',
    });

    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      cmsRepository: cmsRepo,
      navigationRepository: navRepo,
      mediaRepository: mediaRepo,
      taxonomyRepository: taxRepo,
      emailService,
      authService,
      userAdminService,
      cmsService,
      navigationService: navService,
      mediaService,
      envConfig: testEnvConfig,
    });

    // 1. Roles Setup
    const roleAdmin = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Institutional Administrator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.MEDIA_READ);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.MEDIA_WRITE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.MEDIA_DELETE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.TAXONOMY_READ);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.TAXONOMY_WRITE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.AUDIT_READ);

    const roleStaff = await authRepo.createRole({
      name: 'STAFF',
      displayName: 'Staff / Educator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleStaff.id, PERMISSIONS.MEDIA_READ);

    // 2. Users and Memberships
    const userAdminA = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Admin',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userAdminA.id, { emailVerifiedAt: new Date() });
    const memAdminA = await authRepo.createMembership({
      userId: userAdminA.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memAdminA.id, roleAdmin.id);

    const userStaffA = await authRepo.createUser({
      email: 'staff@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Staff',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userStaffA.id, { emailVerifiedAt: new Date() });
    const memStaffA = await authRepo.createMembership({
      userId: userStaffA.id,
      tenantId: tenantA.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memStaffA.id, roleStaff.id);

    const userAdminB = await authRepo.createUser({
      email: 'admin@greenwood.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Greenwood',
      lastName: 'Admin',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userAdminB.id, { emailVerifiedAt: new Date() });
    const memAdminB = await authRepo.createMembership({
      userId: userAdminB.id,
      tenantId: tenantB.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memAdminB.id, roleAdmin.id);

    // Sessions
    const sessionAdminA = await authService.signIn(
      { email: 'admin@oxford.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest' }
    );
    tokenAdminA = sessionAdminA.rawSessionToken;

    const sessionStaffA = await authService.signIn(
      { email: 'staff@oxford.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest' }
    );
    tokenStaffA = sessionStaffA.rawSessionToken;

    const sessionAdminB = await authService.signIn(
      { email: 'admin@greenwood.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest' }
    );
    tokenAdminB = sessionAdminB.rawSessionToken;
  });

  describe('1. Dual-Storage Separation & Public vs. Private Policy', () => {
    it('uploads and segregates public assets into public storage with proper caching headers', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Oxford Campus Quadrangle',
          altText: 'Students walking through historic sandstone quadrangle',
          category: 'IMAGE',
          mimeType: 'image/jpeg',
          fileBase64: validJpegBuffer.toString('base64'),
          isPublic: true,
          isDecorative: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.storagePolicy).toBe('PUBLIC');
      expect(res.body.data.storageKey).toContain('public/tenants/tenant-oxford-id/media/');

      const mediaId = res.body.data.id;

      // Public delivery via anonymous visitor
      const pubRes = await request(app)
        .get(`/api/v1/tenant/public/media/${mediaId}`)
        .set('Host', 'oxford.localhost');

      expect(pubRes.status).toBe(200);
      expect(pubRes.headers['content-type']).toBe('image/jpeg');
      expect(pubRes.headers['cache-control']).toContain('public');
      expect(pubRes.headers['cache-control']).toContain('max-age=86400');
    });

    it('uploads and segregates private documents into private storage policy', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Q3 Staff Salary Assessment',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileBase64: validPdfBuffer.toString('base64'),
          isPublic: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.storagePolicy).toBe('PRIVATE');
      expect(res.body.data.isPublic).toBe(false);
      expect(res.body.data.storageKey).toContain('private/tenants/tenant-oxford-id/documents/');
      expect(res.body.data.publicUrl).toBe('');
    });

    it('strictly returns 404 for anonymous requests attempting to access private assets', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Governing Board Minutes',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileBase64: validPdfBuffer.toString('base64'),
          isPublic: false,
        });

      const mediaId = uploadRes.body.data.id;

      // Anonymous attempt
      const res = await request(app)
        .get(`/api/v1/tenant/public/media/${mediaId}`)
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MEDIA_NOT_FOUND');
    });

    it('allows authorized institutional staff with MEDIA_READ to access private documents', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Institutional Strategic Plan',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileBase64: validPdfBuffer.toString('base64'),
          isPublic: false,
        });

      const mediaId = uploadRes.body.data.id;

      const secureRes = await request(app)
        .get(`/api/v1/tenant/cms/media/${mediaId}/file`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenStaffA}`);

      expect(secureRes.status).toBe(200);
      expect(secureRes.headers['content-type']).toBe('application/pdf');
      expect(secureRes.headers['cache-control']).toContain('private');
      expect(secureRes.headers['cache-control']).toContain('no-store');
    });

    it('denies cross-tenant private document retrieval even for tenant admins', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Oxford Confidential Budget',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileBase64: validPdfBuffer.toString('base64'),
          isPublic: false,
        });

      const mediaId = uploadRes.body.data.id;

      // Tenant B admin attempts retrieval
      const crossRes = await request(app)
        .get(`/api/v1/tenant/cms/media/${mediaId}/file`)
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminB}`);

      expect(crossRes.status).toBe(404);
      expect(crossRes.body.error.code).toBe('MEDIA_NOT_FOUND');
    });
  });

  describe('2. Upload Validation, Magic Bytes & File Safety', () => {
    it('rejects uploads with magic byte content mismatch (e.g. declared JPEG with corrupted content)', async () => {
      const fakeJpegBuffer = Buffer.from('THIS_IS_DEFINITELY_NOT_A_JPEG_FILE');

      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Fake Photo',
          altText: 'A fake photograph',
          category: 'IMAGE',
          mimeType: 'image/jpeg',
          fileBase64: fakeJpegBuffer.toString('base64'),
          isDecorative: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('CONTENT_SIGNATURE_MISMATCH');
    });

    it('rejects empty (0-byte) files', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Empty Document',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileBase64: emptyBuffer.toString('base64'),
          fileSizeBytes: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('EMPTY_FILE');
    });

    it('rejects files exceeding the 10MB maximum limit', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Gigantic Video',
          category: 'VIDEO',
          mimeType: 'video/mp4',
          fileSizeBytes: 10 * 1024 * 1024 + 1, // 10MB + 1 byte
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('FILE_TOO_LARGE');
    });

    it('sanitizes dangerous filenames and path traversal attempts', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe');
      expect(sanitizeFilename('my image file #1 (cool).PNG')).toBe('my_image_file__1__cool_.png');
    });

    it('enforces WCAG 2.2 AA alt-text rules for images and allows decorative exemption', async () => {
      // 1. Missing alt text on meaningful image rejected
      const failRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Chemistry Lab Session',
          altText: '   ',
          category: 'IMAGE',
          mimeType: 'image/png',
          fileBase64: validPngBuffer.toString('base64'),
          isDecorative: false,
        });

      expect(failRes.status).toBe(400);
      expect(failRes.body.error.message).toContain('Alternative text is required');

      // 2. Decorative image succeeds without alt text
      const successRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Decorative Vector Wave',
          category: 'IMAGE',
          mimeType: 'image/svg+xml',
          fileBase64: validSvgBuffer.toString('base64'),
          isDecorative: true,
        });

      expect(successRes.status).toBe(201);
      expect(successRes.body.data.isDecorative).toBe(true);
      expect(successRes.body.data.altText).toBeNull();
    });
  });

  describe('3. Consistency, Compensating Transactions & 2-Phase Replacement', () => {
    it('compensates and aborts cleanly when storage write fails', async () => {
      storageProvider.setSimulateWriteFailure(true);

      const res = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Failed Storage Test',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileBase64: validPdfBuffer.toString('base64'),
        });

      expect(res.status).toBe(500);

      // Verify no phantom database record was created
      const list = await mediaRepo.listMedia(tenantA.id, { page: 1, limit: 100 });
      expect(list.items.find((a) => a.title === 'Failed Storage Test')).toBeUndefined();

      storageProvider.setSimulateWriteFailure(false);
    });

    it('performs safe 2-phase replacement: updates storage and DB without losing old file prematurely', async () => {
      // 1. Initial upload
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Campus Map Initial Version',
          altText: 'Campus map showing building layout',
          category: 'IMAGE',
          mimeType: 'image/jpeg',
          fileBase64: validJpegBuffer.toString('base64'),
        });

      const mediaId = uploadRes.body.data.id;
      const initialKey = uploadRes.body.data.storageKey;

      // 2. Execute 2-phase replacement with new PNG buffer
      const replaceRes = await request(app)
        .post(`/api/v1/tenant/cms/media/${mediaId}/replace`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          fileBase64: validPngBuffer.toString('base64'),
          mimeType: 'image/png',
          fileName: 'campus-map-v2.png',
        });

      expect(replaceRes.status).toBe(200);
      expect(replaceRes.body.success).toBe(true);
      expect(replaceRes.body.data.storageKey).not.toBe(initialKey);
      expect(replaceRes.body.data.mimeType).toBe('image/png');

      // Verify audit trail logged replacement
      const logs = await auditRepo.findAuditLogs({
        tenantId: tenantA.id,
        page: 1,
        limit: 10,
        action: 'MEDIA_REPLACED',
      });
      expect(logs.items.length).toBeGreaterThan(0);
      expect(logs.items[0].entityId).toBe(mediaId);
    });

    it('safely purges underlying storage file when an asset is deleted', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Temporary Notice Graphic',
          category: 'IMAGE',
          mimeType: 'image/png',
          fileBase64: validPngBuffer.toString('base64'),
          isDecorative: true,
        });

      const mediaId = uploadRes.body.data.id;
      const storageKey = uploadRes.body.data.storageKey;

      expect(await storageProvider.exists(tenantA.id, storageKey, 'PUBLIC')).toBe(true);

      const deleteRes = await request(app)
        .delete(`/api/v1/tenant/cms/media/${mediaId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      expect(deleteRes.status).toBe(200);
      expect(await storageProvider.exists(tenantA.id, storageKey, 'PUBLIC')).toBe(false);
    });
  });

  describe('4. Short-Lived Signed Download URLs & Object-Storage Adapter', () => {
    it('generates short-lived signed download URL for authorized private documents', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Restricted Accreditation File',
          category: 'DOCUMENT',
          mimeType: 'application/pdf',
          fileBase64: validPdfBuffer.toString('base64'),
          isPublic: false,
        });

      const mediaId = uploadRes.body.data.id;

      const signedRes = await request(app)
        .post(`/api/v1/tenant/cms/media/${mediaId}/signed-url`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ expiresInSeconds: 900 });

      expect(signedRes.status).toBe(200);
      expect(signedRes.body.success).toBe(true);
      expect(signedRes.body.data.url).toContain('/api/v1/tenant/cms/media/download-signed');
      expect(signedRes.body.data.url).toContain('tenantId=tenant-oxford-id');
    });

    it('verifies S3-compatible storage provider adapter with deterministic mock double', async () => {
      const s3Provider = new S3CompatibleStorageProvider({
        publicBucket: 'oxford-public-assets',
        privateBucket: 'oxford-private-docs',
        region: 'eu-west-1',
        publicBaseUrl: 'https://cdn.oxford.example',
      });

      // Write public asset
      const pubWrite = await s3Provider.write({
        tenantId: tenantA.id,
        policy: 'PUBLIC',
        filename: 's3-test-crest.png',
        buffer: validPngBuffer,
        mimeType: 'image/png',
      });

      expect(pubWrite.storageKey).toBe(`tenants/${tenantA.id}/media/s3-test-crest.png`);
      expect(pubWrite.publicUrl).toBe(`https://cdn.oxford.example/tenants/${tenantA.id}/media/s3-test-crest.png`);

      // Read public asset
      const readPub = await s3Provider.read(tenantA.id, pubWrite.storageKey, 'PUBLIC');
      expect(readPub).not.toBeNull();
      expect(readPub!.buffer.length).toBe(validPngBuffer.length);

      // Write private document
      const privWrite = await s3Provider.write({
        tenantId: tenantA.id,
        policy: 'PRIVATE',
        filename: 's3-confidential.pdf',
        buffer: validPdfBuffer,
        mimeType: 'application/pdf',
      });

      expect(privWrite.publicUrl).toBe('');
      expect(await s3Provider.exists(tenantA.id, privWrite.storageKey, 'PRIVATE')).toBe(true);

      // Signed download URL
      const signedUrl = await s3Provider.getSignedDownloadUrl({
        tenantId: tenantA.id,
        storageKey: privWrite.storageKey,
        expiresInSeconds: 600,
      });
      expect(signedUrl).toContain('oxford-private-docs');
      expect(signedUrl).toContain('X-Amz-Expires=600');

      // Delete
      await s3Provider.delete(tenantA.id, privWrite.storageKey, 'PRIVATE');
      expect(await s3Provider.exists(tenantA.id, privWrite.storageKey, 'PRIVATE')).toBe(false);
    });

    it('verifies LocalStorageProvider signed HMAC token verification', async () => {
      const localProvider = new LocalStorageProvider(undefined, 'test_hmac_secret_32_characters_long_min');
      const url = await localProvider.getSignedDownloadUrl({
        tenantId: 'tenant-123',
        storageKey: 'private/tenants/tenant-123/documents/file.pdf',
        expiresInSeconds: 300,
        userId: 'user-456',
      });

      const parsedUrl = new URL(`http://localhost${url}`);
      const tenantId = parsedUrl.searchParams.get('tenantId')!;
      const storageKey = parsedUrl.searchParams.get('key')!;
      const expires = parseInt(parsedUrl.searchParams.get('expires')!, 10);
      const uid = parsedUrl.searchParams.get('uid')!;
      const sig = parsedUrl.searchParams.get('sig')!;

      // 1. Valid token passes
      expect(localProvider.verifySignedDownloadToken(tenantId, storageKey, expires, uid, sig)).toBe(true);

      // 2. Tampered tenant fails
      expect(localProvider.verifySignedDownloadToken('tenant-attacker', storageKey, expires, uid, sig)).toBe(false);

      // 3. Expired token fails
      expect(localProvider.verifySignedDownloadToken(tenantId, storageKey, expires - 400, uid, sig)).toBe(false);
    });
  });

  describe('5. Multi-Tenant Isolation & Content Taxonomy', () => {
    it('strictly prevents Tenant B admin from modifying or deleting Tenant A media', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Oxford High School Photo',
          altText: 'Students walking in courtyard',
          category: 'IMAGE',
          mimeType: 'image/jpeg',
          fileBase64: validJpegBuffer.toString('base64'),
          isPublic: true,
        });

      const mediaId = uploadRes.body.data.id;

      // Tenant B tries to delete Tenant A media
      const resDelete = await request(app)
        .delete(`/api/v1/tenant/cms/media/${mediaId}`)
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminB}`);

      expect(resDelete.status).toBe(404);
    });

    it('manages content taxonomy categories and prevents duplicate slugs per tenant', async () => {
      // 1. Create Category
      const resCat = await request(app)
        .post('/api/v1/tenant/cms/taxonomy/categories')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          name: 'Athletics & Sports',
          slug: 'athletics-sports',
          type: 'GENERAL',
          description: 'Institutional sports teams and events',
        });

      expect(resCat.status).toBe(201);
      expect(resCat.body.data.slug).toBe('athletics-sports');

      // 2. Reject duplicate slug within same tenant
      const resDup = await request(app)
        .post('/api/v1/tenant/cms/taxonomy/categories')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          name: 'Another Sports',
          slug: 'athletics-sports',
        });

      expect(resDup.status).toBe(409);
      expect(resDup.body.error.code).toBe('CATEGORY_SLUG_ALREADY_EXISTS');

      // 3. Allow same slug in Tenant B
      const resCatB = await request(app)
        .post('/api/v1/tenant/cms/taxonomy/categories')
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminB}`)
        .send({
          name: 'Greenwood Sports',
          slug: 'athletics-sports',
        });

      expect(resCatB.status).toBe(201);
    });

    it('records immutable audit events for media lifecycle operations', async () => {
      const uploadRes = await request(app)
        .post('/api/v1/tenant/cms/media')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Audited Logo',
          category: 'LOGO',
          mimeType: 'image/png',
          fileBase64: validPngBuffer.toString('base64'),
          isDecorative: true,
        });

      const mediaId = uploadRes.body.data.id;

      await request(app)
        .delete(`/api/v1/tenant/cms/media/${mediaId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      const logs = await auditRepo.findAuditLogs({
        tenantId: tenantA.id,
        page: 1,
        limit: 10,
        action: 'MEDIA_DELETED',
      });

      expect(logs.items.length).toBeGreaterThan(0);
      expect(logs.items[0].action).toBe('MEDIA_DELETED');
      expect(logs.items[0].entityId).toBe(mediaId);
    });
  });
});
