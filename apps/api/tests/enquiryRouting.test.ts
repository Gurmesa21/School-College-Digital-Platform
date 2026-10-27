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

describe('Day 13 Suite — Enquiry Forms & Validated Routing (FR-CON-001, FR-CON-002)', () => {
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
  let tokenAdminGreenwood: string;
  let tokenStaffOxford: string;

  beforeEach(async () => {
    defaultPasswordHash = await PasswordService.hashPassword(defaultPassword);

    tenantRepo = new InMemoryTenantRepository([
      { tenant: tenantOxford, domains: ['oxford.localhost'] },
      { tenant: tenantGreenwood, domains: ['secondary.localhost'] },
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

    // Roles
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

    // Users
    const userAdminO = await authRepo.createUser({
      email: 'admin@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Admin',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userAdminO.id, { emailVerifiedAt: new Date() });
    const memAdminO = await authRepo.createMembership({
      userId: userAdminO.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memAdminO.id, roleAdmin.id);

    const userAdminG = await authRepo.createUser({
      email: 'admin@greenwood.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Greenwood',
      lastName: 'Admin',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userAdminG.id, { emailVerifiedAt: new Date() });
    const memAdminG = await authRepo.createMembership({
      userId: userAdminG.id,
      tenantId: tenantGreenwood.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memAdminG.id, roleAdmin.id);

    const userStaffO = await authRepo.createUser({
      email: 'staff@oxford.edu',
      passwordHash: defaultPasswordHash,
      status: 'ACTIVE',
      firstName: 'Oxford',
      lastName: 'Staff',
      isSuperAdmin: false,
    });
    await authRepo.updateUser(userStaffO.id, { emailVerifiedAt: new Date() });
    const memStaffO = await authRepo.createMembership({
      userId: userStaffO.id,
      tenantId: tenantOxford.id,
      status: 'ACTIVE',
    });
    await authRepo.assignRoleToMembership(memStaffO.id, roleStaff.id);

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

    const sessionAdminO = await authService.signIn(
      { email: 'admin@oxford.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest' }
    );
    tokenAdminOxford = sessionAdminO.rawSessionToken;

    const sessionAdminG = await authService.signIn(
      { email: 'admin@greenwood.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest' }
    );
    tokenAdminGreenwood = sessionAdminG.rawSessionToken;

    const sessionStaffO = await authService.signIn(
      { email: 'staff@oxford.edu', password: defaultPassword },
      { ipAddress: '127.0.0.1', userAgent: 'Vitest' }
    );
    tokenStaffOxford = sessionStaffO.rawSessionToken;
  });

  describe('1. Form Builder with Department Routing Configuration (FR-CON-002, FR-AUTH-003)', () => {
    it('creates an enquiry form with departmental routing rules and emits audit log', async () => {
      const payload = {
        title: 'Department Contact & Admissions Enquiry',
        slug: 'contact-and-enquiries',
        description: 'Direct your enquiry to the appropriate department.',
        type: 'CONTACT_US',
        recipientEmails: ['general-desk@oxford.school.example'],
        routingRules: [
          {
            category: 'ADMISSIONS',
            label: 'Admissions Office',
            recipientEmails: ['admissions@oxford.school.example'],
            isDefault: false,
          },
          {
            category: 'FINANCE',
            label: 'Bursar & Finance Office',
            recipientEmails: ['finance@oxford.school.example'],
            isDefault: false,
          },
          {
            category: 'GENERAL',
            label: 'General Administration',
            recipientEmails: ['admin@oxford.school.example'],
            isDefault: true,
          },
        ],
        isPublished: true,
        successMessage: 'Enquiry routed and received. We will respond promptly.',
        submitButtonText: 'Submit Department Enquiry',
        fields: [
          {
            name: 'fullName',
            label: 'Full Name',
            fieldType: 'TEXT',
            isRequired: true,
            orderIndex: 0,
          },
          {
            name: 'email',
            label: 'Contact Email',
            fieldType: 'EMAIL',
            isRequired: true,
            orderIndex: 1,
          },
          {
            name: 'phone',
            label: 'Telephone Number',
            fieldType: 'PHONE',
            isRequired: false,
            orderIndex: 2,
          },
          {
            name: 'department',
            label: 'Target Department',
            fieldType: 'SELECT',
            isRequired: true,
            orderIndex: 3,
            options: [
              { label: 'Admissions Office', value: 'ADMISSIONS' },
              { label: 'Bursar & Finance', value: 'FINANCE' },
              { label: 'General Enquiries', value: 'GENERAL' },
            ],
          },
          {
            name: 'message',
            label: 'Enquiry Details',
            fieldType: 'TEXTAREA',
            isRequired: true,
            orderIndex: 4,
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('contact-and-enquiries');
      expect(res.body.data.routingRules).toHaveLength(3);
      expect(res.body.data.routingRules[0].category).toBe('ADMISSIONS');
      expect(res.body.data.routingRules[0].recipientEmails).toEqual(['admissions@oxford.school.example']);

      // Check audit log
      const auditResult = await auditRepo.findAuditLogs({ tenantId: tenantOxford.id, page: 1, limit: 50 });
      const formCreateAudit = auditResult.items.find(
        (e) => e.action === 'cms:forms:create' && e.entityId === res.body.data.id
      );
      expect(formCreateAudit).toBeDefined();
      expect(formCreateAudit?.tenantId).toBe(tenantOxford.id);
    });

    it('denies staff without CMS_FORMS_WRITE from creating or modifying routing rules', async () => {
      const payload = {
        title: 'Unauthorized Form',
        slug: 'unauthorized-form',
        type: 'GENERAL_ENQUIRY',
        isPublished: true,
        recipientEmails: ['test@oxford.school.example'],
        fields: [{ name: 'name', label: 'Name', fieldType: 'TEXT', isRequired: true, orderIndex: 0 }],
      };

      const res = await request(app)
        .post('/api/v1/tenant/cms/forms')
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenStaffOxford}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Public Form Endpoint & Privacy Safeguards (FR-CON-001, FR-CON-002)', () => {
    beforeEach(async () => {
      // Seed the form
      await formRepo.createForm(tenantOxford.id, {
        title: 'Public Contact Form',
        slug: 'public-contact',
        description: 'Send us a note.',
        type: 'CONTACT_US',
        recipientEmails: ['private-mailbox@oxford.school.example'],
        routingRules: [
          {
            category: 'ADMISSIONS',
            label: 'Admissions Office',
            recipientEmails: ['admissions-private@oxford.school.example'],
            isDefault: false,
          },
          {
            category: 'GENERAL',
            label: 'General Enquiries',
            recipientEmails: ['general-private@oxford.school.example'],
            isDefault: true,
          },
        ],
        isPublished: true,
        successMessage: 'Enquiry confirmed.',
        submitButtonText: 'Send',
        fields: [
          { name: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true, orderIndex: 0 },
          { name: 'email', label: 'Email', fieldType: 'EMAIL', isRequired: true, orderIndex: 1 },
          { name: 'department', label: 'Department', fieldType: 'SELECT', isRequired: true, orderIndex: 2 },
          { name: 'message', label: 'Message', fieldType: 'TEXTAREA', isRequired: true, orderIndex: 3 },
        ],
      });
    });

    it('returns the public form schema WITHOUT exposing private recipient email addresses', async () => {
      const res = await request(app)
        .get('/api/v1/tenant/public/forms/public-contact')
        .set('Host', 'oxford.localhost');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('public-contact');
      expect(res.body.data.fields).toHaveLength(4);

      // CRITICAL PRIVACY SAFEGUARD: Recipient emails must never leak in public JSON
      expect(res.body.data.recipientEmails).toBeUndefined();
      expect(res.body.data.routingRules).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('private-mailbox@oxford.school.example');
      expect(JSON.stringify(res.body)).not.toContain('admissions-private@oxford.school.example');
    });
  });

  describe('3. Validated Department Routing Execution (FR-CON-001, FR-CON-002)', () => {
    let formId: string;

    beforeEach(async () => {
      const form = await formRepo.createForm(tenantOxford.id, {
        title: 'Admissions & Inquiries',
        slug: 'enquiry-router',
        description: 'Submit an enquiry.',
        type: 'ADMISSIONS_INQUIRY',
        recipientEmails: ['default-inbox@oxford.school.example'],
        routingRules: [
          {
            category: 'ADMISSIONS',
            label: 'Admissions Office',
            recipientEmails: ['admissions-desk@oxford.school.example'],
            isDefault: false,
          },
          {
            category: 'FINANCE',
            label: 'Finance Office',
            recipientEmails: ['finance-desk@oxford.school.example'],
            isDefault: false,
          },
          {
            category: 'GENERAL',
            label: 'General Inquiries',
            recipientEmails: ['general-desk@oxford.school.example'],
            isDefault: true,
          },
        ],
        isPublished: true,
        successMessage: 'Your enquiry was routed and received.',
        submitButtonText: 'Send Enquiry',
        fields: [
          { name: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true, orderIndex: 0 },
          { name: 'email', label: 'Email', fieldType: 'EMAIL', isRequired: true, orderIndex: 1 },
          { name: 'phone', label: 'Phone', fieldType: 'PHONE', isRequired: false, orderIndex: 2 },
          { name: 'department', label: 'Department', fieldType: 'SELECT', isRequired: true, orderIndex: 3 },
          { name: 'message', label: 'Message', fieldType: 'TEXTAREA', isRequired: true, orderIndex: 4 },
        ],
      });
      formId = form.id;
    });

    it('routes ADMISSIONS category to admissions-desk and sends confirmation to submitter', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/forms/enquiry-router/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            fullName: 'Jane Prospective Parent',
            email: 'jane.parent@example.com',
            phone: '+44 20 7946 0912',
            department: 'ADMISSIONS',
            message: 'Interested in Grade 9 enrollment for 2027.',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.referenceNumber).toBeDefined();
      expect(typeof res.body.data.referenceNumber).toBe('string');
      expect(res.body.data.referenceNumber.length).toBeGreaterThan(5);

      // Verify DB persistence
      const submissions = await formRepo.listSubmissions(tenantOxford.id, { formId });
      expect(submissions.items).toHaveLength(1);
      const saved = submissions.items[0];
      expect(saved.submitterName).toBe('Jane Prospective Parent');
      expect(saved.submitterEmail).toBe('jane.parent@example.com');
      expect(saved.submitterPhone).toBe('+44 20 7946 0912');
      expect(saved.category).toBe('ADMISSIONS');
      expect(saved.routedTo).toEqual(['admissions-desk@oxford.school.example']);
      expect(saved.deliveryStatus).toBe('SIMULATED');
      expect(saved.deliveryAttempts).toBe(1);

      // Verify email notifications
      const sentNotifications = emailService.getSentSubmissions();
      expect(sentNotifications).toHaveLength(1);
      expect(sentNotifications[0].recipients).toEqual(['admissions-desk@oxford.school.example']);
      expect(sentNotifications[0].category).toBe('ADMISSIONS');

      // Verify submitter confirmation
      const sentConfirmations = emailService.getSentConfirmations();
      expect(sentConfirmations).toHaveLength(1);
      expect(sentConfirmations[0].submitterEmail).toBe('jane.parent@example.com');
      expect(sentConfirmations[0].submitterName).toBe('Jane Prospective Parent');
    });

    it('routes FINANCE category enquiry to finance-desk specifically', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/forms/enquiry-router/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            fullName: 'David Bursar Inquiry',
            email: 'david@example.com',
            department: 'FINANCE',
            message: 'Inquiring about annual tuition fee schedule.',
          },
        });

      expect(res.status).toBe(201);
      const submissions = await formRepo.listSubmissions(tenantOxford.id, { formId });
      const saved = submissions.items.find((s) => s.submitterEmail === 'david@example.com');
      expect(saved).toBeDefined();
      expect(saved?.category).toBe('FINANCE');
      expect(saved?.routedTo).toEqual(['finance-desk@oxford.school.example']);

      const sentNotifications = emailService.getSentSubmissions();
      const financeNotification = sentNotifications.find((n) => n.submitterEmail === 'david@example.com');
      expect(financeNotification?.recipients).toEqual(['finance-desk@oxford.school.example']);
    });

    it('falls back to default rule when an unmapped category is chosen', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/forms/enquiry-router/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            fullName: 'Unknown Category Person',
            email: 'unknown@example.com',
            department: 'SPORTS_CLUB',
            message: 'Inquiring about weekend tennis court rentals.',
          },
        });

      expect(res.status).toBe(201);
      const submissions = await formRepo.listSubmissions(tenantOxford.id, { formId });
      const saved = submissions.items.find((s) => s.submitterEmail === 'unknown@example.com');
      expect(saved?.category).toBe('SPORTS_CLUB');
      // Routed to default routing rule ('GENERAL' rule marked as isDefault: true)
      expect(saved?.routedTo).toEqual(['general-desk@oxford.school.example']);
    });

    it('prevents public payload from injecting arbitrary recipient addresses', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/forms/enquiry-router/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            fullName: 'Malicious Attacker',
            email: 'attacker@example.com',
            department: 'ADMISSIONS',
            message: 'Spam attack payload',
            recipientEmails: ['hacked@external-attacker.com'],
            to: ['victim@external.com'],
            routeTo: 'external@target.com',
          },
        });

      expect(res.status).toBe(201);
      const sentNotifications = emailService.getSentSubmissions();
      const attackerNotification = sentNotifications.find((n) => n.submitterEmail === 'attacker@example.com');
      // Must ONLY route to configured admissions desk, completely ignoring injected fields
      expect(attackerNotification?.recipients).toEqual(['admissions-desk@oxford.school.example']);
      expect(JSON.stringify(sentNotifications)).not.toContain('hacked@external-attacker.com');
    });
  });

  describe('4. Server-Side Validation & Anti-Spam Controls (FR-CON-001)', () => {
    let formId: string;

    beforeEach(async () => {
      const form = await formRepo.createForm(tenantOxford.id, {
        title: 'Validation Test Form',
        slug: 'validation-test',
        type: 'CONTACT_US',
        recipientEmails: ['desk@oxford.school.example'],
        isPublished: true,
        fields: [
          { name: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true, orderIndex: 0 },
          { name: 'email', label: 'Email', fieldType: 'EMAIL', isRequired: true, orderIndex: 1 },
          { name: 'phone', label: 'Phone', fieldType: 'PHONE', isRequired: true, orderIndex: 2 },
          { name: 'message', label: 'Message', fieldType: 'TEXTAREA', isRequired: true, orderIndex: 3 },
        ],
      });
      formId = form.id;
    });

    it('rejects submission with invalid phone number format', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/forms/validation-test/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            fullName: 'Valid Name',
            email: 'valid@example.com',
            phone: 'INVALID_LETTERS_PHONE_123',
            message: 'Hello world',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details).toBeDefined();
      expect(res.body.error.details.some((d: any) => d.field === 'phone')).toBe(true);

      // Verify no submission saved
      const submissions = await formRepo.listSubmissions(tenantOxford.id, { formId });
      expect(submissions.items).toHaveLength(0);
    });

    it('rejects submission with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/forms/validation-test/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            fullName: 'Valid Name',
            email: 'not-an-email',
            phone: '+44 123456789',
            message: 'Hello world',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects submission exceeding maximum field length (255 chars for text)', async () => {
      const overlyLongName = 'A'.repeat(256);
      const res = await request(app)
        .post('/api/v1/tenant/public/forms/validation-test/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            fullName: overlyLongName,
            email: 'valid@example.com',
            phone: '+44 123456789',
            message: 'Hello world',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('blocks honeypot bot submissions without creating database records', async () => {
      const res = await request(app)
        .post('/api/v1/tenant/public/forms/validation-test/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            fullName: 'Spam Bot',
            email: 'bot@spam.com',
            phone: '+1 800 555 0199',
            message: 'Buy cheap watches now!',
          },
          _hp_company: 'Spam Corporation Automated Bot Trap', // Honeypot trap triggered
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');

      // Verify no record saved
      const submissions = await formRepo.listSubmissions(tenantOxford.id, { formId });
      expect(submissions.items).toHaveLength(0);
      expect(emailService.getSentSubmissions()).toHaveLength(0);
    });
  });

  describe('5. Idempotency & Safe Request Replays (FR-CON-001, Reliability)', () => {
    let formId: string;

    beforeEach(async () => {
      const form = await formRepo.createForm(tenantOxford.id, {
        title: 'Idempotency Form',
        slug: 'idempotency-test',
        type: 'GENERAL_ENQUIRY',
        recipientEmails: ['office@oxford.school.example'],
        isPublished: true,
        fields: [
          { name: 'name', label: 'Name', fieldType: 'TEXT', isRequired: true, orderIndex: 0 },
          { name: 'email', label: 'Email', fieldType: 'EMAIL', isRequired: true, orderIndex: 1 },
          { name: 'message', label: 'Message', fieldType: 'TEXTAREA', isRequired: true, orderIndex: 2 },
        ],
      });
      formId = form.id;
    });

    it('replays existing submission safely when duplicate x-idempotency-key is supplied', async () => {
      const clientKey = 'idmp-unique-uuid-12345678';

      // First submit
      const res1 = await request(app)
        .post('/api/v1/tenant/public/forms/idempotency-test/submit')
        .set('Host', 'oxford.localhost')
        .set('x-idempotency-key', clientKey)
        .send({
          data: {
            name: 'Original Submitter',
            email: 'original@example.com',
            message: 'Original message text',
          },
        });

      expect(res1.status).toBe(201);
      const ref1 = res1.body.data.referenceNumber;
      expect(ref1).toBeDefined();

      // Ensure 1 submission and 1 email
      let submissions = await formRepo.listSubmissions(tenantOxford.id, { formId });
      expect(submissions.items).toHaveLength(1);
      expect(emailService.getSentSubmissions()).toHaveLength(1);

      // Replay identical submit with same idempotency key
      const res2 = await request(app)
        .post('/api/v1/tenant/public/forms/idempotency-test/submit')
        .set('Host', 'oxford.localhost')
        .set('x-idempotency-key', clientKey)
        .send({
          data: {
            name: 'Original Submitter',
            email: 'original@example.com',
            message: 'Original message text',
          },
        });

      // Should return success with the exact same reference number
      expect([200, 201]).toContain(res2.status);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data.referenceNumber).toBe(ref1);

      // Verify NO duplicate record was created in the database
      submissions = await formRepo.listSubmissions(tenantOxford.id, { formId });
      expect(submissions.items).toHaveLength(1);

      // Verify NO duplicate notification email was sent
      expect(emailService.getSentSubmissions()).toHaveLength(1);
    });
  });

  describe('6. Reliability & Provider Failure Handling (BR-012, FR-CON-001)', () => {
    let formId: string;

    beforeEach(async () => {
      const form = await formRepo.createForm(tenantOxford.id, {
        title: 'Provider Failure Test Form',
        slug: 'provider-failure-test',
        type: 'CONTACT_US',
        recipientEmails: ['desk@oxford.school.example'],
        isPublished: true,
        fields: [
          { name: 'name', label: 'Name', fieldType: 'TEXT', isRequired: true, orderIndex: 0 },
          { name: 'email', label: 'Email', fieldType: 'EMAIL', isRequired: true, orderIndex: 1 },
          { name: 'message', label: 'Message', fieldType: 'TEXTAREA', isRequired: true, orderIndex: 2 },
        ],
      });
      formId = form.id;
    });

    it('persists submission record authoritatively even if external email provider throws', async () => {
      // Simulate external email provider failure
      emailService.failNextNotification = true;

      const res = await request(app)
        .post('/api/v1/tenant/public/forms/provider-failure-test/submit')
        .set('Host', 'oxford.localhost')
        .send({
          data: {
            name: 'Reliability Test Submitter',
            email: 'reliable@example.com',
            message: 'Testing email provider disconnection resilience.',
          },
        });

      // User still receives confirmation because DB persistence succeeded
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.referenceNumber).toBeDefined();

      // Verify submission is safely persisted in the database with status FAILED
      const submissions = await formRepo.listSubmissions(tenantOxford.id, { formId });
      expect(submissions.items).toHaveLength(1);
      const saved = submissions.items[0];
      expect(saved.deliveryStatus).toBe('FAILED');
      expect(saved.deliveryAttempts).toBe(1);
      expect(saved.deliveryError).toBe('Simulated external SMTP provider timeout error');
      expect(saved.lastDeliveryAttemptAt).toBeDefined();
    });

    it('allows administrators to retry failed notification dispatch', async () => {
      // Create a submission that failed delivery
      const submission = await formRepo.createSubmission(
        tenantOxford.id,
        formId,
        { name: 'Retry Candidate', email: 'retry@example.com', message: 'Please retry me' },
        {
          submitterEmail: 'retry@example.com',
          submitterName: 'Retry Candidate',
          category: 'GENERAL',
          routedTo: ['desk@oxford.school.example'],
          deliveryStatus: 'FAILED',
        }
      );

      // Provider is healthy now
      emailService.failNextNotification = false;

      const res = await request(app)
        .post(`/api/v1/tenant/cms/forms/submissions/${submission.id}/retry-notification`)
        .set('Host', 'oxford.localhost')
        .set('Cookie', `school_session=${tokenAdminOxford}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deliveryStatus).toBe('SIMULATED');
      expect(res.body.data.deliveryAttempts).toBe(1);
      expect(res.body.data.deliveryError).toBeNull();

      // Check notification was actually dispatched
      const sent = emailService.getSentSubmissions();
      expect(sent.some((s) => s.submitterEmail === 'retry@example.com')).toBe(true);

      // Verify audit trail recorded retry action
      const auditResult = await auditRepo.findAuditLogs({ tenantId: tenantOxford.id, page: 1, limit: 50 });
      const retryAudit = auditResult.items.find(
        (e) => e.action === 'enquiry:notification:retry' && e.entityId === submission.id
      );
      expect(retryAudit).toBeDefined();
      expect(retryAudit?.tenantId).toBe(tenantOxford.id);
    });
  });

  describe('7. Multi-Tenant Routing & Access Isolation (FR-AUTH-003, FR-TEN-001)', () => {
    let formOxfordId: string;
    let formGreenwoodId: string;
    let subOxfordId: string;

    beforeEach(async () => {
      const formO = await formRepo.createForm(tenantOxford.id, {
        title: 'Oxford General',
        slug: 'oxford-general',
        type: 'GENERAL_ENQUIRY',
        recipientEmails: ['admissions@oxford.school.example'],
        isPublished: true,
        fields: [{ name: 'msg', label: 'Message', fieldType: 'TEXT', isRequired: true, orderIndex: 0 }],
      });
      formOxfordId = formO.id;

      const subO = await formRepo.createSubmission(
        tenantOxford.id,
        formOxfordId,
        { msg: 'Confidential Oxford submission' },
        {
          submitterEmail: 'oxford-parent@example.com',
        }
      );
      subOxfordId = subO.id;

      const formG = await formRepo.createForm(tenantGreenwood.id, {
        title: 'Greenwood General',
        slug: 'greenwood-general',
        type: 'GENERAL_ENQUIRY',
        recipientEmails: ['admin@greenwood.school.example'],
        isPublished: true,
        fields: [{ name: 'msg', label: 'Message', fieldType: 'TEXT', isRequired: true, orderIndex: 0 }],
      });
      formGreenwoodId = formG.id;
    });

    it('prevents Tenant Greenwood admin from accessing Oxford submissions', async () => {
      const res = await request(app)
        .get(`/api/v1/tenant/cms/forms/submissions/items?formId=${formOxfordId}`)
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminGreenwood}`);

      expect(res.status).toBe(200);
      // Items returned must be empty because Tenant Greenwood has 0 submissions for formOxfordId
      expect(res.body.data.items).toHaveLength(0);
    });

    it('prevents Tenant Greenwood admin from retrying Oxford submission notification', async () => {
      const res = await request(app)
        .post(`/api/v1/tenant/cms/forms/submissions/${subOxfordId}/retry-notification`)
        .set('Host', 'secondary.localhost')
        .set('Cookie', `school_session=${tokenAdminGreenwood}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('fails safely when form routing destination cannot be resolved (ROUTING_CONFIG_ERROR)', async () => {
      // Create a form with empty recipient emails and empty routing rules in a tenant with no contact email
      const brokenTenant: ResolvedTenant = {
        id: 'broken-tenant-id',
        slug: 'broken',
        name: 'Broken Tenant',
        institutionType: 'PRIMARY_SECONDARY',
        status: 'ACTIVE',
        timezone: 'UTC',
        defaultLocale: 'en',
        contactEmail: '', // No tenant fallback email
        matchedHostname: 'broken.localhost',
        resolutionMethod: 'DOMAIN_MAPPING',
      };
      tenantRepo = new InMemoryTenantRepository([
        { tenant: brokenTenant, domains: ['broken.localhost'] },
      ]);
      formService = new FormService(formRepo, auditRepo, emailService, tenantRepo);
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

      await formRepo.createForm(brokenTenant.id, {
        title: 'Broken Routing Form',
        slug: 'broken-form',
        type: 'CONTACT_US',
        recipientEmails: [], // No form recipient emails
        routingRules: [], // No routing rules
        isPublished: true,
        fields: [{ name: 'msg', label: 'Message', fieldType: 'TEXT', isRequired: true, orderIndex: 0 }],
      });

      const res = await request(app)
        .post('/api/v1/tenant/public/forms/broken-form/submit')
        .set('Host', 'broken.localhost')
        .send({ data: { msg: 'Test message' } });

      // Safe failure without silently discarding or crashing
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTING_CONFIG_ERROR');
    });
  });
});
