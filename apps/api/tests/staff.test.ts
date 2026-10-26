import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { InMemoryTenantRepository } from '../src/repositories/tenantRepository.js';
import { InMemoryAuthRepository } from '../src/repositories/authRepository.js';
import { InMemoryAuditRepository } from '../src/repositories/auditRepository.js';
import { InMemoryAcademicRepository } from '../src/repositories/academicRepository.js';
import { InMemoryMediaRepository } from '../src/repositories/mediaRepository.js';
import { InMemoryStaffRepository } from '../src/repositories/staffRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { AcademicService } from '../src/services/academicService.js';
import { StaffService } from '../src/services/staffService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Day 10 Staff Directory & Profiles Suite (FR-ACAD-003, FR-ACAD-004, FR-MEDIA-001, FR-CMS-003, FR-CMS-006)', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let academicRepo: InMemoryAcademicRepository;
  let mediaRepo: InMemoryMediaRepository;
  let staffRepo: InMemoryStaffRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let academicService: AcademicService;
  let staffService: StaffService;
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

  let oxfordDeptId: string;
  let greenwoodDeptId: string;
  let oxfordMediaId: string;
  let greenwoodMediaId: string;

  beforeAll(async () => {
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
    mediaRepo = new InMemoryMediaRepository();
    staffRepo = new InMemoryStaffRepository([], mediaRepo, academicRepo);
    emailService = new InMemoryEmailService();

    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    academicService = new AcademicService(academicRepo, auditRepo);
    staffService = new StaffService(staffRepo, auditRepo, academicRepo, mediaRepo);

    // Create Oxford department and media asset
    const oxfordDept = await academicRepo.createDepartment(tenantOxford.id, {
      name: 'Faculty of Science',
      slug: 'faculty-of-science',
      code: 'SCI',
    });
    oxfordDeptId = oxfordDept.id;

    const oxfordMedia = await mediaRepo.createMedia(tenantOxford.id, 'uploader-1', {
      title: 'Dr. Eleanor Vance Photo',
      altText: 'Portrait photo of Dr. Vance in the physics laboratory',
      category: 'IMAGE',
      mimeType: 'image/jpeg',
      fileSizeBytes: 120000,
      storageKey: 'oxford/vance.jpg',
      publicUrl: '/media/vance.jpg',
      isPublic: true,
    });
    oxfordMediaId = oxfordMedia.id;

    // Create Greenwood department and media asset (for cross-tenant validation)
    const greenwoodDept = await academicRepo.createDepartment(tenantGreenwood.id, {
      name: 'Humanities Division',
      slug: 'humanities-division',
      code: 'HUM',
    });
    greenwoodDeptId = greenwoodDept.id;

    const greenwoodMedia = await mediaRepo.createMedia(tenantGreenwood.id, 'uploader-2', {
      title: 'Greenwood Staff Photo',
      altText: 'Photo of Greenwood staff',
      category: 'IMAGE',
      mimeType: 'image/jpeg',
      fileSizeBytes: 95000,
      storageKey: 'greenwood/staff.jpg',
      publicUrl: '/media/gw-staff.jpg',
      isPublic: true,
    });
    greenwoodMediaId = greenwoodMedia.id;

    // Create Roles and Users
    // 1. Oxford Admin (STAFF_READ, STAFF_WRITE, STAFF_PUBLISH)
    const adminUserOxford = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Oxford',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const membershipAdminA = await authRepo.createMembership({
      userId: adminUserOxford.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    const roleAdminOxford = await authRepo.createRole({
      tenantId: tenantOxford.id,
      name: 'TENANT_ADMIN',
      displayName: 'Tenant Admin',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleAdminOxford.id, PERMISSIONS.STAFF_READ);
    await authRepo.assignPermissionToRole(roleAdminOxford.id, PERMISSIONS.STAFF_WRITE);
    await authRepo.assignPermissionToRole(roleAdminOxford.id, PERMISSIONS.STAFF_PUBLISH);
    await authRepo.assignRoleToMembership(membershipAdminA.id, roleAdminOxford.id);

    // 2. Oxford Viewer (STAFF_READ only)
    const viewerUserOxford = await authRepo.createUser({
      email: 'viewer@oxford.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Oxford',
      lastName: 'Viewer',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const membershipViewerA = await authRepo.createMembership({
      userId: viewerUserOxford.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    const roleViewerOxford = await authRepo.createRole({
      tenantId: tenantOxford.id,
      name: 'STAFF_VIEWER',
      displayName: 'Staff Viewer',
      isSystem: false,
    });
    await authRepo.assignPermissionToRole(roleViewerOxford.id, PERMISSIONS.STAFF_READ);
    await authRepo.assignRoleToMembership(membershipViewerA.id, roleViewerOxford.id);

    // 3. Oxford Publisher (STAFF_READ, STAFF_PUBLISH only, no WRITE)
    const publisherUserOxford = await authRepo.createUser({
      email: 'publisher@oxford.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Oxford',
      lastName: 'Publisher',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const membershipPublisherA = await authRepo.createMembership({
      userId: publisherUserOxford.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    const rolePublisherOxford = await authRepo.createRole({
      tenantId: tenantOxford.id,
      name: 'STAFF_PUBLISHER',
      displayName: 'Staff Publisher',
      isSystem: false,
    });
    await authRepo.assignPermissionToRole(rolePublisherOxford.id, PERMISSIONS.STAFF_READ);
    await authRepo.assignPermissionToRole(rolePublisherOxford.id, PERMISSIONS.STAFF_PUBLISH);
    await authRepo.assignRoleToMembership(membershipPublisherA.id, rolePublisherOxford.id);

    // 4. Greenwood Admin (Tenant B)
    const adminUserGreenwood = await authRepo.createUser({
      email: 'admin@greenwood.edu',
      passwordHash: defaultPasswordHash,
      firstName: 'Greenwood',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    });
    const membershipAdminB = await authRepo.createMembership({
      userId: adminUserGreenwood.id,
      tenantId: tenantGreenwood.id,
      status: 'ACTIVE',
    });
    const roleAdminGreenwood = await authRepo.createRole({
      tenantId: tenantGreenwood.id,
      name: 'TENANT_ADMIN',
      displayName: 'Tenant Admin',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleAdminGreenwood.id, PERMISSIONS.STAFF_READ);
    await authRepo.assignPermissionToRole(roleAdminGreenwood.id, PERMISSIONS.STAFF_WRITE);
    await authRepo.assignPermissionToRole(roleAdminGreenwood.id, PERMISSIONS.STAFF_PUBLISH);
    await authRepo.assignRoleToMembership(membershipAdminB.id, roleAdminGreenwood.id);

    // Create App instance
    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      academicRepository: academicRepo,
      mediaRepository: mediaRepo,
      staffRepository: staffRepo,
      emailService,
      authService,
      userAdminService,
      academicService,
      staffService,
      envConfig: loadConfig(),
    });

    // Generate tokens directly via authService
    const s1 = await authService.signIn({ email: 'admin@oxford.edu', password: defaultPassword });
    tokenAdminOxford = s1.rawSessionToken;

    const s2 = await authService.signIn({ email: 'viewer@oxford.edu', password: defaultPassword });
    tokenViewerOxford = s2.rawSessionToken;

    const s3 = await authService.signIn({ email: 'publisher@oxford.edu', password: defaultPassword });
    tokenPublisherOxford = s3.rawSessionToken;

    const s4 = await authService.signIn({ email: 'admin@greenwood.edu', password: defaultPassword });
    tokenAdminGreenwood = s4.rawSessionToken;
  });

  // ==========================================================================
  // SECTION 1: Administrative Staff Profile CRUD & Validation
  // ==========================================================================
  describe('Administrative Staff Profile Operations', () => {
    it('creates a draft staff profile with all standard fields (FR-ACAD-003)', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Dr. Eleanor Vance',
          slug: 'dr-eleanor-vance',
          roleTitle: 'Dean & Head of Physics',
          biography: 'Specialist in quantum mechanics and STEM curriculum innovation.',
          departmentId: oxfordDeptId,
          profileMediaId: oxfordMediaId,
          subjects: ['Quantum Physics', 'Thermodynamics'],
          qualifications: 'Ph.D. Cambridge University',
          officeLocation: 'Science Building, Room 304',
          consultationHours: 'Mon/Wed 2-4 PM',
          publicEmail: 'e.vance@oxford.school.example',
          publicPhone: '+44 1865 270001',
          displayEmail: true,
          displayPhone: false,
          websiteUrl: 'https://eleanorvance.oxford.school.example',
          internalNotes: 'Senior department faculty lead.',
          status: 'DRAFT',
          isActive: true,
          isFeatured: true,
          orderIndex: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Dr. Eleanor Vance');
      expect(res.body.data.slug).toBe('dr-eleanor-vance');
      expect(res.body.data.roleTitle).toBe('Dean & Head of Physics');
      expect(res.body.data.subjects).toEqual(['Quantum Physics', 'Thermodynamics']);
      expect(res.body.data.displayPhone).toBe(false);
      expect(res.body.data.internalNotes).toBe('Senior department faculty lead.');
    });

    it('rejects invalid payloads with malformed slugs or missing required fields', async () => {
      // Missing fullName and invalid slug format
      const res = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'A', // Too short (min 2)
          slug: 'INVALID SLUG WITH SPACES!',
          roleTitle: '', // Empty
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('enforces tenant-scoped slug uniqueness and returns 409 on duplicate slug', async () => {
      // First create
      await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Marcus Sterling',
          slug: 'marcus-sterling',
          roleTitle: 'Lecturer in Mathematics',
        });

      // Attempt duplicate slug in same tenant
      const res = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Marcus Sterling Duplicate',
          slug: 'marcus-sterling',
          roleTitle: 'Assistant Lecturer',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SLUG_CONFLICT');
    });

    it('allows identical slugs across different tenants (Tenant isolation)', async () => {
      // Create in Oxford
      const resA = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'David Miller',
          slug: 'david-miller',
          roleTitle: 'Instructor',
        });
      expect(resA.status).toBe(201);

      // Create with same slug in Greenwood
      const resB = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'secondary.localhost')
        .set('Authorization', `Bearer ${tokenAdminGreenwood}`)
        .send({
          fullName: 'David Miller',
          slug: 'david-miller',
          roleTitle: 'Lead Teacher',
        });
      expect(resB.status).toBe(201);
    });

    it('rejects cross-tenant department associations (FR-TEN-001)', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Helena Rostova',
          slug: 'helena-rostova',
          roleTitle: 'Associate Lecturer',
          departmentId: greenwoodDeptId, // Cross-tenant reference!
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RELATION');
      expect(res.body.error.message).toContain('INVALID_DEPARTMENT');
    });

    it('rejects cross-tenant media asset associations (FR-MEDIA-002, FR-TEN-001)', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Helena Rostova',
          slug: 'helena-rostova',
          roleTitle: 'Associate Lecturer',
          profileMediaId: greenwoodMediaId, // Cross-tenant reference!
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RELATION');
      expect(res.body.error.message).toContain('INVALID_MEDIA');
    });

    it('updates staff profiles and records immutable audit log', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Initial Name',
          slug: 'initial-name',
          roleTitle: 'Junior Instructor',
        });
      const staffId = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/v1/tenant/cms/staff/${staffId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Promoted Name',
          roleTitle: 'Senior Instructor',
          isFeatured: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.fullName).toBe('Promoted Name');
      expect(updateRes.body.data.roleTitle).toBe('Senior Instructor');
      expect(updateRes.body.data.isFeatured).toBe(true);

      // Verify audit trail
      const updateLog = auditRepo.logs.find(
        (l) => l.action === 'staff:profile:update' && l.entityId === staffId
      );
      expect(updateLog).toBeDefined();
    });

    it('deletes staff profiles with proper permission', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'To Be Deleted',
          slug: 'to-be-deleted',
          roleTitle: 'Temporary Staff',
        });
      const staffId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/tenant/cms/staff/${staffId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.deleted).toBe(true);

      const getRes = await request(app)
        .get(`/api/v1/tenant/cms/staff/${staffId}`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ==========================================================================
  // SECTION 2: RBAC & Permission Verification
  // ==========================================================================
  describe('RBAC & Permission Boundaries', () => {
    it('prohibits unauthorized users without STAFF_WRITE from mutating staff profiles', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenViewerOxford}`) // Viewer only has STAFF_READ
        .send({
          fullName: 'Unauthorized Profile',
          slug: 'unauthorized-profile',
          roleTitle: 'Staff Member',
        });

      expect(res.status).toBe(403);
    });

    it('prohibits direct publishing without STAFF_PUBLISH permission', async () => {
      // Temporarily create user with WRITE but not PUBLISH
      const writerUser = await authRepo.createUser({
        email: 'writer@oxford.edu',
        passwordHash: defaultPasswordHash,
        status: 'ACTIVE',
      });
      const membership = await authRepo.createMembership({
        userId: writerUser.id,
        tenantId: tenantOxford.id,
        status: 'ACTIVE',
      });
      const writerRole = await authRepo.createRole({
        tenantId: tenantOxford.id,
        name: 'STAFF_WRITER',
        displayName: 'Staff Writer',
        isSystem: false,
      });
      await authRepo.assignPermissionToRole(writerRole.id, PERMISSIONS.STAFF_READ);
      await authRepo.assignPermissionToRole(writerRole.id, PERMISSIONS.STAFF_WRITE);
      await authRepo.assignRoleToMembership(membership.id, writerRole.id);

      const sWriter = await authService.signIn({ email: 'writer@oxford.edu', password: defaultPassword });
      const tokenWriter = sWriter.rawSessionToken;

      const res = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenWriter}`)
        .send({
          fullName: 'Unpublished Direct',
          slug: 'unpublished-direct',
          roleTitle: 'Staff Member',
          status: 'PUBLISHED', // Writer lacks STAFF_PUBLISH!
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_PUBLISH');
    });

    it('allows status changes via PATCH /status with STAFF_PUBLISH permission', async () => {
      // Create draft first as admin
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Draft To Publish',
          slug: 'draft-to-publish',
          roleTitle: 'Educator',
          status: 'DRAFT',
        });
      const staffId = createRes.body.data.id;

      // Publish using publisher token (which has STAFF_PUBLISH)
      const patchRes = await request(app)
        .patch(`/api/v1/tenant/cms/staff/${staffId}/status`)
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenPublisherOxford}`)
        .send({ status: 'PUBLISHED' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.status).toBe('PUBLISHED');
    });
  });

  // ==========================================================================
  // SECTION 3: Public Staff Directory, Filtering & Privacy Allowlisting
  // ==========================================================================
  describe('Public Staff Directory & Privacy Allowlisting (FR-ACAD-003, FR-ACAD-004)', () => {
    beforeEach(async () => {
      // Seed published staff member with approved email, redacted phone, internal notes
      await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Dr. Eleanor Vance',
          slug: 'dr-eleanor-vance',
          roleTitle: 'Dean & Head of Physics',
          biography: 'Specialist in quantum mechanics and optics.',
          departmentId: oxfordDeptId,
          profileMediaId: oxfordMediaId,
          subjects: ['Quantum Physics', 'Thermodynamics'],
          qualifications: 'Ph.D. Cambridge',
          publicEmail: 'e.vance@oxford.school.example',
          publicPhone: '+44 1865 270001',
          displayEmail: true,  // APPROVED FOR PUBLIC
          displayPhone: false, // NOT APPROVED - MUST BE REDACTED TO NULL
          websiteUrl: 'https://vance.oxford.school.example',
          internalNotes: 'CONFIDENTIAL SALARY LEVEL GRADE 7',
          status: 'PUBLISHED',
          isActive: true,
          isFeatured: true,
          orderIndex: 1,
        });

      // Seed draft staff member (MUST NOT BE RETURNED PUBLICLY)
      await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Secret Draft Staff',
          slug: 'secret-draft-staff',
          roleTitle: 'Draft Lecturer',
          status: 'DRAFT',
          isActive: true,
        });

      // Seed inactive staff member (MUST NOT BE RETURNED PUBLICLY)
      await request(app)
        .post('/api/v1/tenant/cms/staff')
        .set('Host', 'oxford.localhost')
        .set('Authorization', `Bearer ${tokenAdminOxford}`)
        .send({
          fullName: 'Inactive Staff Member',
          slug: 'inactive-staff-member',
          roleTitle: 'Former Lecturer',
          status: 'PUBLISHED',
          isActive: false, // INACTIVE
        });
    });

    it('returns only published and active staff in public directory list', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/staff')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].slug).toBe('dr-eleanor-vance');
    });

    it('strictly applies privacy allowlist redaction to public responses', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/staff/dr-eleanor-vance')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      const data = res.body.data;

      // 1. Approved email is exposed
      expect(data.publicEmail).toBe('e.vance@oxford.school.example');

      // 2. Unapproved phone is redacted to null
      expect(data.publicPhone).toBeNull();

      // 3. Internal confidential notes are omitted entirely
      expect(data.internalNotes).toBeUndefined();

      // 4. User account id is omitted
      expect(data.userId).toBeUndefined();

      // 5. Media with altText is present
      expect(data.profileMedia).toBeDefined();
      expect(data.profileMedia.altText).toBe('Portrait photo of Dr. Vance in the physics laboratory');
    });

    it('fails closed (HTTP 404) when attempting to access draft profiles directly by slug (FR-CMS-006)', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/staff/secret-draft-staff')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('STAFF_NOT_FOUND');
    });

    it('fails closed (HTTP 404) when attempting to access inactive profiles directly by slug', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/staff/inactive-staff-member')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('STAFF_NOT_FOUND');
    });

    it('fails closed (HTTP 404) when querying non-existent staff slug', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/staff/non-existent-faculty')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('STAFF_NOT_FOUND');
    });

    it('filters public staff by subject, roleTitle, and department (FR-ACAD-004)', async () => {
      // Match by subject
      const subjectRes = await request(app)
        .get('/api/v1/tenant/public/staff?subject=Quantum Physics')
        .set('Host', 'oxford.localhost');
      expect(subjectRes.status).toBe(200);
      expect(subjectRes.body.data.items.length).toBe(1);

      // Non-matching subject
      const noSubjectRes = await request(app)
        .get('/api/v1/tenant/public/staff?subject=Astrophysics')
        .set('Host', 'oxford.localhost');
      expect(noSubjectRes.status).toBe(200);
      expect(noSubjectRes.body.data.items.length).toBe(0);

      // Match by department
      const deptRes = await request(app)
        .get(`/api/v1/tenant/public/staff?departmentId=${oxfordDeptId}`)
        .set('Host', 'oxford.localhost');
      expect(deptRes.status).toBe(200);
      expect(deptRes.body.data.items.length).toBe(1);

      // Match by roleTitle
      const roleRes = await request(app)
        .get('/api/v1/tenant/public/staff?roleTitle=Physics')
        .set('Host', 'oxford.localhost');
      expect(roleRes.status).toBe(200);
      expect(roleRes.body.data.items.length).toBe(1);
    });

    it('enforces tenant isolation: public staff in Oxford are not exposed in Greenwood', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/staff/dr-eleanor-vance')
        .set('Host', 'secondary.localhost'); // Query Greenwood host

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('STAFF_NOT_FOUND');
    });
  });
});
