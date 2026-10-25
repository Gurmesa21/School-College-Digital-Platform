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
import { InMemoryFormRepository } from '../src/repositories/formRepository.js';
import { InMemoryEmailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { UserAdminService } from '../src/services/userAdminService.js';
import { CmsService } from '../src/services/cmsService.js';
import { NavigationService } from '../src/services/navigationService.js';
import { MediaService } from '../src/services/mediaService.js';
import { FormService } from '../src/services/formService.js';
import { PasswordService } from '../src/services/passwordService.js';
import { loadConfig } from '../src/config/env.js';
import { PERMISSIONS, ResolvedTenant } from '@school/shared';

describe('Dynamic Form Builder, Public Form Processing, and Admissions Workflows (Day 7)', () => {
  let tenantRepo: InMemoryTenantRepository;
  let authRepo: InMemoryAuthRepository;
  let auditRepo: InMemoryAuditRepository;
  let cmsRepo: InMemoryCmsRepository;
  let navRepo: InMemoryNavigationRepository;
  let mediaRepo: InMemoryMediaRepository;
  let taxRepo: InMemoryTaxonomyRepository;
  let formRepo: InMemoryFormRepository;
  let emailService: InMemoryEmailService;
  let authService: AuthService;
  let userAdminService: UserAdminService;
  let cmsService: CmsService;
  let navService: NavigationService;
  let mediaService: MediaService;
  let formService: FormService;
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
    formRepo = new InMemoryFormRepository();
    emailService = new InMemoryEmailService();

    authService = new AuthService(authRepo, emailService, 7, 60);
    userAdminService = new UserAdminService(authRepo, auditRepo, emailService, 7);
    cmsService = new CmsService(cmsRepo, auditRepo);
    navService = new NavigationService(navRepo, auditRepo);
    mediaService = new MediaService(mediaRepo, auditRepo);
    formService = new FormService(formRepo, auditRepo, emailService, tenantRepo);

    // 1. Roles Setup
    const roleAdmin = await authRepo.createRole({
      name: 'TENANT_ADMIN',
      displayName: 'Institutional Administrator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_FORMS_READ);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.CMS_FORMS_WRITE);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.ADMISSIONS_READ);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.ADMISSIONS_REVIEW);
    await authRepo.assignPermissionToRole(roleAdmin.id, PERMISSIONS.ADMISSIONS_MANAGE);

    const roleStaff = await authRepo.createRole({
      name: 'STAFF',
      displayName: 'Staff Educator',
      isSystem: true,
    });
    await authRepo.assignPermissionToRole(roleStaff.id, PERMISSIONS.CMS_FORMS_READ);

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

    // Create Express app
    app = createApp({
      repository: tenantRepo,
      authRepository: authRepo,
      auditRepository: auditRepo,
      cmsRepository: cmsRepo,
      navigationRepository: navRepo,
      mediaRepository: mediaRepo,
      taxonomyRepository: taxRepo,
      formRepository: formRepo,
      emailService,
      authService,
      userAdminService,
      cmsService,
      navigationService: navService,
      mediaService,
      formService,
      envConfig: loadConfig(),
    });

    // Obtain tokens
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

  describe('Administrative Form Definition CRUD', () => {
    it('creates a new dynamic form with validated fields and audit logging', async () => {
      const payload = {
        title: 'Admissions Inquiry 2026',
        slug: 'admissions-inquiry-2026',
        description: 'Submit an inquiry regarding open enrollments.',
        type: 'ADMISSIONS_INQUIRY',
        recipientEmails: ['admissions@oxford.school.example'],
        isPublished: true,
        successMessage: 'Thank you for your interest! We will contact you soon.',
        submitButtonText: 'Send Inquiry',
        fields: [
          {
            name: 'parentName',
            label: 'Parent Name',
            fieldType: 'TEXT',
            placeholder: 'Jane Doe',
            isRequired: true,
            orderIndex: 0,
          },
          {
            name: 'parentEmail',
            label: 'Parent Email',
            fieldType: 'EMAIL',
            placeholder: 'jane@example.com',
            isRequired: true,
            orderIndex: 1,
          },
          {
            name: 'gradeApplying',
            label: 'Grade Applying',
            fieldType: 'SELECT',
            isRequired: true,
            orderIndex: 2,
            options: [
              { label: 'Kindergarten', value: 'KG' },
              { label: 'Grade 1', value: 'G1' },
            ],
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('admissions-inquiry-2026');
      expect(res.body.data.fields.length).toBe(3);

      // Verify audit trail was recorded
      const audits = await auditRepo.findAuditLogs({ tenantId: tenantA.id, page: 1, limit: 10 });
      const formAudit = audits.items.find((a) => a.action === 'cms:forms:create');
      expect(formAudit).toBeDefined();
      expect(formAudit?.entityId).toBe(res.body.data.id);
    });

    it('rejects duplicate slug within same tenant with 409 conflict', async () => {
      const payload = {
        title: 'General Contact Form',
        slug: 'contact-us',
        type: 'CONTACT_US',
        recipientEmails: ['info@oxford.school.example'],
      };

      // First create
      const res1 = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send(payload);
      expect(res1.status).toBe(201);

      // Attempt duplicate slug on Oxford
      const res2 = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send(payload);
      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('SLUG_CONFLICT');

      // Tenant B can create the exact same slug without conflict (Tenant isolation)
      const resTenantB = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminB}`)
        .send(payload);
      expect(resTenantB.status).toBe(201);
    });

    it('enforces RBAC permissions: staff without CMS_FORMS_WRITE cannot create or update forms', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenStaffA}`)
        .send({
          title: 'Unauthorized Form',
          slug: 'unauthorized',
          type: 'FEEDBACK',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('updates form configuration and fields cleanly', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Initial Form',
          slug: 'initial-form',
          type: 'FEEDBACK',
          fields: [{ name: 'feedback', label: 'Feedback', fieldType: 'TEXTAREA', isRequired: true }],
        });

      const formId = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/v1/tenant/cms/forms/${formId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Updated Feedback Form',
          fields: [
            { name: 'rating', label: 'Rating (1-5)', fieldType: 'NUMBER', isRequired: true },
            { name: 'feedback', label: 'Comments', fieldType: 'TEXTAREA', isRequired: false },
          ],
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.title).toBe('Updated Feedback Form');
      expect(updateRes.body.data.fields.length).toBe(2);
      expect(updateRes.body.data.fields[0].name).toBe('rating');
    });

    it('deletes form successfully', async () => {
      const createRes = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({ title: 'Temporary Form', slug: 'temp-form', type: 'OTHER' });

      const formId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/tenant/cms/forms/${formId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      expect(deleteRes.status).toBe(200);

      // Verify not found
      const getRes = await request(app)
        .get(`/api/v1/tenant/cms/forms/${formId}`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('Public Form Retrieval and Submission Processing', () => {
    let formSlug = 'contact-us';

    beforeEach(async () => {
      await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Oxford Contact Form',
          slug: formSlug,
          type: 'CONTACT_US',
          recipientEmails: ['admissions@oxford.school.example'],
          isPublished: true,
          successMessage: 'Thank you! Message received.',
          fields: [
            { name: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true },
            { name: 'email', label: 'Email', fieldType: 'EMAIL', isRequired: true },
            { name: 'phone', label: 'Phone', fieldType: 'PHONE', isRequired: false },
            {
              name: 'department',
              label: 'Department',
              fieldType: 'SELECT',
              isRequired: true,
              options: [
                { label: 'General', value: 'general' },
                { label: 'Admissions', value: 'admissions' },
              ],
            },
            { name: 'message', label: 'Message', fieldType: 'TEXTAREA', isRequired: true },
          ],
        });
    });

    it('allows anonymous visitor to retrieve public form definition without credentials', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant/public/forms/${formSlug}`)
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Oxford Contact Form');
      expect(res.body.data.fields.length).toBe(5);
      // Internal fields like recipientEmails must NOT be exposed publicly
      expect(res.body.data.recipientEmails).toBeUndefined();
    });

    it('processes valid form submission, records submission, and dispatches notification emails', async () => {
      emailService.clear();

      const submissionPayload = {
        data: {
          fullName: 'Dawit Bekele',
          email: 'dawit.bekele@example.com',
          phone: '+251 91 123 4567',
          department: 'admissions',
          message: 'Can I visit the school campus tomorrow?',
        },
      };

      const res = await request(app)
        .post(`/api/v1/tenant/public/forms/${formSlug}/submit`)
        .set('Host', 'oxford.localhost')
        .send(submissionPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.message).toBe('Thank you! Message received.');

      // Check email dispatches
      const dispatched = emailService.getDispatchedEmails();
      expect(dispatched.length).toBe(2);

      // Notification sent to institutional recipient
      const adminNotification = dispatched.find((e) => e.type === 'FORM_SUBMISSION_NOTIFICATION');
      expect(adminNotification).toBeDefined();
      expect(adminNotification?.toEmail).toBe('admissions@oxford.school.example');
      expect(adminNotification?.formTitle).toBe('Oxford Contact Form');

      // Confirmation sent to submitter
      const submitterConfirmation = dispatched.find((e) => e.type === 'SUBMISSION_CONFIRMATION');
      expect(submitterConfirmation).toBeDefined();
      expect(submitterConfirmation?.toEmail).toBe('dawit.bekele@example.com');
    });

    it('blocks honeypot bot submission with 400 SPAM_DETECTED', async () => {
      const botPayload = {
        data: {
          fullName: 'Spam Bot',
          email: 'spammer@bot.net',
          department: 'general',
          message: 'Buy cheap watches now!',
        },
        _hp_company: 'Acme Spammers LLC', // Honeypot filled by bot
      };

      const res = await request(app)
        .post(`/api/v1/tenant/public/forms/${formSlug}/submit`)
        .set('Host', 'oxford.localhost')
        .send(botPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.details[0].field).toBe('_hp_company');
    });

    it('rejects submission with missing required fields', async () => {
      const incompletePayload = {
        data: {
          email: 'valid@example.com',
          // fullName missing
          // department missing
          // message missing
        },
      };

      const res = await request(app)
        .post(`/api/v1/tenant/public/forms/${formSlug}/submit`)
        .set('Host', 'oxford.localhost')
        .send(incompletePayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.details.some((d: any) => d.field === 'fullName')).toBe(true);
      expect(res.body.error.details.some((d: any) => d.field === 'message')).toBe(true);
    });

    it('rejects submission with invalid email format', async () => {
      const invalidEmailPayload = {
        data: {
          fullName: 'John Tester',
          email: 'not-an-email-address',
          department: 'general',
          message: 'Hello test message',
        },
      };

      const res = await request(app)
        .post(`/api/v1/tenant/public/forms/${formSlug}/submit`)
        .set('Host', 'oxford.localhost')
        .send(invalidEmailPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.details.some((d: any) => d.field === 'email')).toBe(true);
    });

    it('rejects submission with invalid select option', async () => {
      const invalidOptionPayload = {
        data: {
          fullName: 'John Tester',
          email: 'john@example.com',
          department: 'non_existent_department',
          message: 'Hello test message',
        },
      };

      const res = await request(app)
        .post(`/api/v1/tenant/public/forms/${formSlug}/submit`)
        .set('Host', 'oxford.localhost')
        .send(invalidOptionPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.details.some((d: any) => d.field === 'department')).toBe(true);
    });
  });

  describe('Administrative Submission Review and Lifecycle', () => {
    let submissionId: string;

    beforeEach(async () => {
      // Create Form
      const formRes = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          title: 'Admissions 2026',
          slug: 'admissions-2026',
          type: 'APPLICATION',
          isPublished: true,
          fields: [
            { name: 'studentName', label: 'Student Name', fieldType: 'TEXT', isRequired: true },
            { name: 'parentEmail', label: 'Parent Email', fieldType: 'EMAIL', isRequired: true },
          ],
        });

      // Submit Form
      const subRes = await request(app)
        .post('/api/v1/tenant/public/forms/admissions-2026/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            studentName: 'Tadesse Haile',
            parentEmail: 'haile@example.com',
          },
        });

      submissionId = subRes.body.data.submissionId;
    });

    it('allows admissions reviewers to list submissions with pagination and status filters', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/cms/forms/submissions/items?status=PENDING')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].id).toBe(submissionId);
    });

    it('transitions submission status (PENDING -> UNDER_REVIEW -> ACCEPTED) and records audit trail', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/tenant/cms/forms/submissions/${submissionId}/status`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminA}`)
        .send({
          status: 'UNDER_REVIEW',
          adminNotes: 'Candidate transcripts received. Interview scheduled for Monday.',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('UNDER_REVIEW');
      expect(updateRes.body.data.adminNotes).toContain('Interview scheduled');

      // Verify audit trail
      const audits = await auditRepo.findAuditLogs({ tenantId: tenantA.id, page: 1, limit: 10 });
      const statusAudit = audits.items.find(
        (a) => a.action === 'admissions:submission:status_update' && a.entityId === submissionId
      );
      expect(statusAudit).toBeDefined();
      expect(statusAudit?.metadata?.newStatus).toBe('UNDER_REVIEW');
    });

    it('prevents cross-tenant access to submissions (Tenant B cannot view Tenant A submissions)', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant/cms/forms/submissions/${submissionId}`)
        .set('Host', 'secondary.localhost') // Request under Tenant B domain
        .set('Cookie', `school_session=${tokenAdminB}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SUBMISSION_NOT_FOUND');
    });
  });
});
