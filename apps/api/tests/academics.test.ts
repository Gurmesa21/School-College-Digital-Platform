import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryAcademicRepository } from '../src/repositories/academicRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { AcademicService } from '../src/services/academicService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Day 9 Academic Catalogue & Flexible Structures Suite (FR-ACAD-001, FR-ACAD-002, FR-CMS-002)', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let academicRepo: InMemoryAcademicRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let academicService: AcademicService;
  let app: ReturnType<typeof createApp>;

  const defaultPassword = 'SecurePassword123!';
  let defaultPasswordHash: string;

  const tenantOxford: ResolvedTenant = {
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

  const tenantGreenwood: ResolvedTenant = {
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

  let tokenAdminOxford: string;
  let tokenViewerOxford: string;
  let tokenPublisherOxford: string;
  let tokenAdminGreenwood: string;

  beforeAll(async () => {
    // Hash password once to ensure fast test execution
    defaultPasswordHash = await PasswordService.hashPassword(defaultPassword);
  });

  beforeEach(async () => {
    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantOxford, domains: ['oxford.localhost'] },
      { tenant: tenantGreenwood, domains: ['secondary.localhost'] },
    ]);

    authRepo = new InMemoryAuthRepository();
    auditRepo = new InMemoryAuditRepository();
    academicRepo = new InMemoryAcademicRepository();
    emailService = new InMemoryEmailService();

    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    academicService = new AcademicService(academicRepo, auditRepo);

    const testEnvConfig = loadConfig({
      NODE_ENV: 'test',
      APP_ENV: 'test',
      PORT: '4000',
      API_PREFIX: '/api/v1',
      CORS_ORIGIN: 'http://localhost:3000',
      ALLOW_DEV_TENANT_OVERRIDE: 'false',
      TRUST_PROXY: 'true',
    });

    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      academicRepository: academicRepo,
      authService,
      userAdminService,
      academicService,
      envConfig: testEnvConfig,
    });

    // 1. Oxford Admin (Full access: read, write, publish)
    const adminUserA = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Admin',
    });
    await authRepo.updateUser(adminUserA.id, { emailVerifiedAt: new Date() });
    const memAdminA = await authRepo.createMembership({
      userId: adminUserA.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    const adminRoleA = await authRepo.createRole({
      name: 'OXFORD_ADMIN',
      displayName: 'Oxford Admin Role',
      tenantId: tenantOxford.id,
    });
    await authRepo.assignPermissionToRole(adminRoleA.id, PERMISSIONS.ACADEMICS_READ);
    await authRepo.assignPermissionToRole(adminRoleA.id, PERMISSIONS.ACADEMICS_WRITE);
    await authRepo.assignPermissionToRole(adminRoleA.id, PERMISSIONS.ACADEMICS_PUBLISH);
    await authRepo.assignRoleToMembership(memAdminA.id, adminRoleA.id);

    // 2. Oxford Viewer (Read only)
    const viewerUserA = await authRepo.createUser({
      email: 'viewer@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Viewer',
    });
    await authRepo.updateUser(viewerUserA.id, { emailVerifiedAt: new Date() });
    const memViewerA = await authRepo.createMembership({
      userId: viewerUserA.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    const viewerRoleA = await authRepo.createRole({
      name: 'OXFORD_VIEWER',
      displayName: 'Oxford Viewer Role',
      tenantId: tenantOxford.id,
    });
    await authRepo.assignPermissionToRole(viewerRoleA.id, PERMISSIONS.ACADEMICS_READ);
    await authRepo.assignRoleToMembership(memViewerA.id, viewerRoleA.id);

    // 3. Oxford Publisher (Read and Publish, no write)
    const publisherUserA = await authRepo.createUser({
      email: 'publisher@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
    });
    await authRepo.updateUser(publisherUserA.id, { emailVerifiedAt: new Date() });
    const memPublisherA = await authRepo.createMembership({
      userId: publisherUserA.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    const publisherRoleA = await authRepo.createRole({
      name: 'OXFORD_PUBLISHER',
      displayName: 'Oxford Publisher Role',
      tenantId: tenantOxford.id,
    });
    await authRepo.assignPermissionToRole(publisherRoleA.id, PERMISSIONS.ACADEMICS_READ);
    await authRepo.assignPermissionToRole(publisherRoleA.id, PERMISSIONS.ACADEMICS_PUBLISH);
    await authRepo.assignRoleToMembership(memPublisherA.id, publisherRoleA.id);

    // 4. Greenwood Admin (Tenant B isolation)
    const adminUserB = await authRepo.createUser({
      email: 'admin@greenwood.school.example',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
    });
    await authRepo.updateUser(adminUserB.id, { emailVerifiedAt: new Date() });
    const memAdminB = await authRepo.createMembership({
      userId: adminUserB.id,
      tenantId: tenantGreenwood.id,
      status: 'ACTIVE',
    });
    const adminRoleB = await authRepo.createRole({
      name: 'GREENWOOD_ADMIN',
      displayName: 'Greenwood Admin Role',
      tenantId: tenantGreenwood.id,
    });
    await authRepo.assignPermissionToRole(adminRoleB.id, PERMISSIONS.ACADEMICS_READ);
    await authRepo.assignPermissionToRole(adminRoleB.id, PERMISSIONS.ACADEMICS_WRITE);
    await authRepo.assignPermissionToRole(adminRoleB.id, PERMISSIONS.ACADEMICS_PUBLISH);
    await authRepo.assignRoleToMembership(memAdminB.id, adminRoleB.id);

    // Generate tokens
    const s1 = await authService.signIn({ email: 'admin@oxford.edu', password: defaultPassword });
    tokenAdminOxford = s1.rawSessionToken;

    const s2 = await authService.signIn({ email: 'viewer@oxford.edu', password: defaultPassword });
    tokenViewerOxford = s2.rawSessionToken;

    const s3 = await authService.signIn({ email: 'publisher@oxford.edu', password: defaultPassword });
    tokenPublisherOxford = s3.rawSessionToken;

    const s4 = await authService.signIn({ email: 'admin@greenwood.school.example', password: defaultPassword });
    tokenAdminGreenwood = s4.rawSessionToken;
  });

  describe('1. Academic Levels Management', () => {
    it('creates a new academic level with audit logging', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/academics/levels')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({
          name: 'Primary School (Grades 1-5)',
          slug: 'primary-grades-1-5',
          levelType: 'PRIMARY',
          description: 'Elementary years curriculum focused on foundational literacy and numeracy.',
          orderIndex: 1,
          minAge: 6,
          maxAge: 11,
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Primary School (Grades 1-5)');
      expect(res.body.data.slug).toBe('primary-grades-1-5');

      const audit = auditRepo.logs.find((l) => l.action === 'academics:level:create');
      expect(audit).toBeDefined();
      expect(audit?.tenantId).toBe(tenantOxford.id);
    });

    it('rejects duplicate level slug within the same tenant (409 Conflict)', async () => {
      await request(app)
        .post('/api/v1/tenant/cms/academics/levels')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({
          name: 'High School',
          slug: 'high-school',
        });

      const res = await request(app)
        .post('/api/v1/tenant/cms/academics/levels')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({
          name: 'High School Duplicate',
          slug: 'high-school',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SLUG_ALREADY_EXISTS');
    });

    it('allows identical level slug across different tenants', async () => {
      const resA = await request(app)
        .post('/api/v1/tenant/cms/academics/levels')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({ name: 'Secondary School', slug: 'secondary-school' });
      expect(resA.status).toBe(201);

      const resB = await request(app)
        .post('/api/v1/tenant/cms/academics/levels')
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminGreenwood}`)
        .send({ name: 'Secondary School', slug: 'secondary-school' });
      expect(resB.status).toBe(201);
    });

    it('updates an existing academic level', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/academics/levels')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({ name: 'Middle Years', slug: 'middle-years' });

      const levelId = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/v1/tenant/cms/academics/levels/${levelId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({ name: 'Middle School (Grades 6-8)', orderIndex: 3 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Middle School (Grades 6-8)');
      expect(updateRes.body.data.orderIndex).toBe(3);
    });

    it('deletes an academic level', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/academics/levels')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({ name: 'Temporary Level', slug: 'temp-level' });

      const levelId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/tenant/cms/academics/levels/${levelId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`);

      expect(deleteRes.status).toBe(200);

      const listRes = await request(app)
        .get('/api/v1/tenant/cms/academics/levels')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`);

      expect(listRes.body.data.some((l: any) => l.id === levelId)).toBe(false);
    });
  });

  describe('2. Academic Departments & Hierarchies', () => {
    it('creates parent faculty and child department relationships', async () => {
      // 1. Create Parent Faculty
      const facultyRes = await request(app)
        .post('/api/v1/tenant/cms/academics/departments')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({
          name: 'Faculty of Science & Engineering',
          slug: 'faculty-science-engineering',
          code: 'FSE',
          description: 'Upper collegiate faculty oversee STEM divisions.',
        });

      expect(facultyRes.status).toBe(201);
      const facultyId = facultyRes.body.data.id;

      // 2. Create Child Department
      const deptRes = await request(app)
        .post('/api/v1/tenant/cms/academics/departments')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({
          name: 'Department of Computer Science',
          slug: 'dept-computer-science',
          code: 'CS',
          parentId: facultyId,
        });

      expect(deptRes.status).toBe(201);
      expect(deptRes.body.data.parentId).toBe(facultyId);
    });

    it('prevents a department from being set as its own parent', async () => {
      const deptRes = await request(app)
        .post('/api/v1/tenant/cms/academics/departments')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({ name: 'Arts Dept', slug: 'arts-dept' });

      const deptId = deptRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/v1/tenant/cms/academics/departments/${deptId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({ parentId: deptId });

      expect(updateRes.status).toBe(400);
      expect(updateRes.body.error.code).toBe('INVALID_RELATION');
    });
  });

  describe('3. Programme Records & Server Validation (FR-ACAD-002)', () => {
    let testLevelId: string;
    let testDeptId: string;

    beforeEach(async () => {
      const lvl = await academicRepo.createLevel(tenantOxford.id, {
        name: 'Secondary',
        slug: 'secondary-test',
      });
      testLevelId = lvl.id;

      const dept = await academicRepo.createDepartment(tenantOxford.id, {
        name: 'Science Dept',
        slug: 'science-test',
      });
      testDeptId = dept.id;
    });

    it('creates a complete programme draft with required metadata', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/academics/programmes')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({
          title: 'International Baccalaureate Diploma',
          slug: 'ib-diploma',
          summary: 'Two-year rigorous pre-university educational programme.',
          description: 'Comprehensive IB DP curriculum preparing students for global university success.',
          programmeType: 'Diploma',
          levelId: testLevelId,
          departmentId: testDeptId,
          duration: '2 Years',
          entryRequirements: 'Minimum 5 GCSE/IGCSE passes at grade C or higher.',
          qualificationsAwarded: 'International Baccalaureate Diploma',
          curriculum: 'International Baccalaureate Organization (IBO)',
          tuitionFee: 5000,
          tuitionCurrency: 'USD',
          tuitionPeriod: 'Per Year',
          tuitionDescription: 'Includes IB exam registration and laboratory fees.',
          displayTuition: true,
          status: 'DRAFT',
          isFeatured: true,
          orderIndex: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('International Baccalaureate Diploma');
      expect(res.body.data.slug).toBe('ib-diploma');
      expect(res.body.data.status).toBe('DRAFT');
    });

    it('rejects malformed programme slug (uppercase, spaces)', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/academics/programmes')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({
          title: 'Bad Slug Programme',
          slug: 'Bad Slug Format!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('prevents cross-tenant foreign key injection (levelId from Tenant B rejected)', async () => {
      const levelB = await academicRepo.createLevel(tenantGreenwood.id, {
        name: 'Greenwood Level',
        slug: 'greenwood-level',
      });

      const res = await request(app)
        .post('/api/v1/tenant/cms/academics/programmes')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send({
          title: 'Cross Tenant Attempt',
          slug: 'cross-tenant-attempt',
          levelId: levelB.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RELATION');
    });
  });

  describe('4. RBAC, Authorization, and Publication Controls (FR-CMS-003, FR-CMS-006)', () => {
    it('denies unauthenticated requests with 401', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/cms/academics/programmes')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(401);
    });

    it('denies staff without ACADEMICS_WRITE from creating programmes (403)', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/academics/programmes')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenViewerOxford}`)
        .send({
          title: 'Unauthorized Programme',
          slug: 'unauthorized-programme',
        });

      expect(res.status).toBe(403);
    });

    it('denies staff without ACADEMICS_PUBLISH from creating a programme directly as PUBLISHED (403)', async () => {
      // Create user with ACADEMICS_WRITE but no ACADEMICS_PUBLISH
      const writerUser = await authRepo.createUser({
        email: 'writer@oxford.edu',
        passwordHash: defaultPasswordHash,
        status: 'ACTIVE',
      });
      await authRepo.updateUser(writerUser.id, { emailVerifiedAt: new Date() });
      const memWriter = await authRepo.createMembership({
        userId: writerUser.id,
        tenantId: tenantOxford.id,
        status: 'ACTIVE',
      });
      const writerRole = await authRepo.createRole({
        name: 'WRITER_ONLY',
        displayName: 'Writer Only',
        tenantId: tenantOxford.id,
      });
      await authRepo.assignPermissionToRole(writerRole.id, PERMISSIONS.ACADEMICS_READ);
      await authRepo.assignPermissionToRole(writerRole.id, PERMISSIONS.ACADEMICS_WRITE);
      await authRepo.assignRoleToMembership(memWriter.id, writerRole.id);

      const writerSignIn = await authService.signIn({ email: 'writer@oxford.edu', password: defaultPassword });
      const writerToken = writerSignIn.rawSessionToken;

      const res = await request(app)
        .post('/api/v1/tenant/cms/academics/programmes')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${writerToken}`)
        .send({
          title: 'Premature Publish Attempt',
          slug: 'premature-publish',
          status: 'PUBLISHED',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_PUBLISH');
    });

    it('allows authorized user with ACADEMICS_PUBLISH to transition programme status', async () => {
      const prog = await academicRepo.createProgramme(tenantOxford.id, 'admin', {
        title: 'Draft Programme',
        slug: 'draft-to-publish',
        status: 'DRAFT',
      });

      const res = await request(app)
        .patch(`/api/v1/tenant/cms/academics/programmes/${prog.id}/status`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenPublisherOxford}`)
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.publishedAt).toBeDefined();
    });
  });

  describe('5. Public Academic Catalogue Discovery & Tuition Privacy Rules (FR-ACAD-001, FR-ACAD-002)', () => {
    beforeEach(async () => {
      // 1. Published Programme with approved tuition display
      await academicRepo.createProgramme(tenantOxford.id, 'admin', {
        title: 'Cambridge IGCSE Programme',
        slug: 'cambridge-igcse',
        summary: 'Rigorous two-year upper secondary curriculum.',
        description: 'Comprehensive science and humanities syllabus.',
        duration: '2 Years',
        tuitionFee: 3200,
        tuitionCurrency: 'USD',
        tuitionPeriod: 'Per Year',
        tuitionDescription: 'Includes lab and books.',
        displayTuition: true, // Approved
        status: 'PUBLISHED',
        isActive: true,
      });

      // 2. Published Programme with HIDDEN tuition (tuition not approved for public display)
      await academicRepo.createProgramme(tenantOxford.id, 'admin', {
        title: 'A-Levels Scholarship Track',
        slug: 'a-levels-scholarship',
        summary: 'Advanced Sixth Form preparation.',
        description: 'Deep subject specialization.',
        duration: '2 Years',
        tuitionFee: 4800,
        tuitionCurrency: 'USD',
        tuitionPeriod: 'Per Year',
        tuitionDescription: 'Needs-based aid applies.',
        displayTuition: false, // NOT approved
        status: 'PUBLISHED',
        isActive: true,
      });

      // 3. Draft Programme (must be completely hidden from public endpoints)
      await academicRepo.createProgramme(tenantOxford.id, 'admin', {
        title: 'Draft Robotics Track',
        slug: 'draft-robotics',
        summary: 'Internal review syllabus.',
        status: 'DRAFT',
        isActive: true,
      });
    });

    it('returns only active published programmes in public catalogue listing', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/academics/programmes')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(2);

      const slugs = res.body.data.items.map((p: any) => p.slug);
      expect(slugs).toContain('cambridge-igcse');
      expect(slugs).toContain('a-levels-scholarship');
      expect(slugs).not.toContain('draft-robotics');
    });

    it('strictly redacts tuition fields when displayTuition is false (Tuition Privacy Rule)', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/academics/programmes/a-levels-scholarship')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('a-levels-scholarship');
      expect(res.body.data.displayTuition).toBe(false);
      expect(res.body.data.tuitionFee).toBeNull();
      expect(res.body.data.tuitionCurrency).toBeNull();
      expect(res.body.data.tuitionPeriod).toBeNull();
      expect(res.body.data.tuitionDescription).toBeNull();
    });

    it('discloses tuition fields when displayTuition is true', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/academics/programmes/cambridge-igcse')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      expect(res.body.data.displayTuition).toBe(true);
      expect(res.body.data.tuitionFee).toBe(3200);
      expect(res.body.data.tuitionCurrency).toBe('USD');
      expect(res.body.data.tuitionPeriod).toBe('Per Year');
      expect(res.body.data.tuitionDescription).toBe('Includes lab and books.');
    });

    it('fails closed (404) when anonymous visitor attempts to access draft programme', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/academics/programmes/draft-robotics')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PROGRAMME_NOT_FOUND');
    });

    it('filters public programmes by search query', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/academics/programmes?search=Cambridge')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].slug).toBe('cambridge-igcse');
    });
  });

  describe('6. Strict Multi-Tenant Isolation (SEC-TEN-001)', () => {
    it('prevents Tenant A admin from inspecting or editing Tenant B programmes', async () => {
      const progB = await academicRepo.createProgramme(tenantGreenwood.id, 'adminB', {
        title: 'Greenwood Agricultural Technology',
        slug: 'greenwood-agriculture',
        status: 'PUBLISHED',
      });

      // Tenant A admin tries to retrieve Greenwood programme via Oxford host
      const res = await request(app)
        .get(`/api/v1/tenant/cms/academics/programmes/${progB.id}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`);

      expect(res.status).toBe(404);

      // Tenant A admin tries to delete Greenwood programme via Oxford host
      const deleteRes = await request(app)
        .delete(`/api/v1/tenant/cms/academics/programmes/${progB.id}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`);

      expect(deleteRes.status).toBe(404);
    });

    it('prevents anonymous visitors on Tenant A from resolving Tenant B programmes', async () => {
      await academicRepo.createProgramme(tenantGreenwood.id, 'adminB', {
        title: 'Greenwood Pure Mathematics',
        slug: 'pure-mathematics',
        status: 'PUBLISHED',
        isActive: true,
      });

      const res = await request(app)
        .get('/api/v1/tenant/public/academics/programmes/pure-mathematics')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(404);
    });
  });

  describe('7. Flexible Academic Structures: Kindergarten & TVET (FR-ACAD-001)', () => {
    it('supports Kindergarten structure with age levels and activity groups (no college faculties)', async () => {
      const kgLevel = await academicRepo.createLevel(tenantOxford.id, {
        name: 'Pre-K Foundation (Ages 3-4)',
        slug: 'pre-k-foundation',
        levelType: 'EARLY_CHILDHOOD',
        minAge: 3,
        maxAge: 4,
      });

      const kgProg = await academicRepo.createProgramme(tenantOxford.id, 'admin', {
        title: 'Early Explorers Play & Phonics',
        slug: 'early-explorers-play',
        programmeType: 'Activity Group',
        levelId: kgLevel.id,
        duration: '1 Academic Year',
        entryRequirements: 'Age 3 by September 1st',
        status: 'PUBLISHED',
        isActive: true,
      });

      expect(kgProg.levelId).toBe(kgLevel.id);
      expect(kgProg.departmentId).toBeNull(); // No college department required!
    });

    it('supports TVET vocational certificate structure with competency hours & criteria', async () => {
      const tvetLevel = await academicRepo.createLevel(tenantOxford.id, {
        name: 'National Vocational Certificate IV',
        slug: 'vocational-cert-iv',
        levelType: 'TVET',
      });

      const tvetProg = await academicRepo.createProgramme(tenantOxford.id, 'admin', {
        title: 'Industrial Electrical Installation',
        slug: 'electrical-installation',
        programmeType: 'Technical Certification',
        levelId: tvetLevel.id,
        duration: '1,200 Practical Workshop Hours',
        entryRequirements: 'High School diploma or technical entrance exam',
        qualificationsAwarded: 'National Certificate Level IV Technician',
        status: 'PUBLISHED',
        isActive: true,
      });

      expect(tvetProg.duration).toBe('1,200 Practical Workshop Hours');
      expect(tvetProg.qualificationsAwarded).toBe('National Certificate Level IV Technician');
    });
  });
});
