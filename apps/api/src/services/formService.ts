import crypto from 'crypto';
import {
  FormDto,
  PublicFormDto,
  CreateFormDto,
  UpdateFormDto,
  FormSubmissionDto,
  FormSubmissionQueryDto,
  UpdateSubmissionStatusDto,
  PublicSubmitFormDto,
  PaginatedData,
  IEmailService,
  ITenantRepository,
} from '@school/shared';
import { IFormRepository } from '../repositories/formRepository.js';
import { IAuditRepository } from '../repositories/auditRepository.js';
import { AuditOutcome } from '@school/db';

export class FormValidationError extends Error {
  public code: string;
  public details: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    details: Array<{ field: string; message: string }>,
    code: string = 'VALIDATION_FAILED'
  ) {
    super(message);
    this.name = 'FormValidationError';
    this.code = code;
    this.details = details;
  }
}

export class FormService {
  constructor(
    private formRepository: IFormRepository,
    private auditRepository: IAuditRepository,
    private emailService: IEmailService,
    private tenantRepository?: ITenantRepository
  ) {}

  // ----------------------------------------------------
  // Admin Form Management
  // ----------------------------------------------------

  async listForms(tenantId: string): Promise<FormDto[]> {
    return this.formRepository.listForms(tenantId);
  }

  async getFormById(tenantId: string, formId: string): Promise<FormDto | null> {
    return this.formRepository.getFormById(tenantId, formId);
  }

  async createForm(
    tenantId: string,
    actor: { id: string; email: string },
    data: CreateFormDto
  ): Promise<FormDto> {
    // Check slug uniqueness within tenant
    const existing = await this.formRepository.getFormBySlug(tenantId, data.slug);
    if (existing) {
      throw new Error(`A form with slug "${data.slug}" already exists for this institution.`);
    }

    const created = await this.formRepository.createForm(tenantId, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'cms:forms:create',
      entityType: 'form',
      entityId: created.id,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        slug: created.slug,
        title: created.title,
        type: created.type,
        routingRulesCount: (created.routingRules || []).length,
      },
    });

    return created;
  }

  async updateForm(
    tenantId: string,
    actor: { id: string; email: string },
    formId: string,
    data: UpdateFormDto
  ): Promise<FormDto> {
    const existing = await this.formRepository.getFormById(tenantId, formId);
    if (!existing) {
      throw new Error('Form not found.');
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await this.formRepository.getFormBySlug(tenantId, data.slug);
      if (slugExists && slugExists.id !== formId) {
        throw new Error(`A form with slug "${data.slug}" already exists for this institution.`);
      }
    }

    const updated = await this.formRepository.updateForm(tenantId, formId, data);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'cms:forms:update',
      entityType: 'form',
      entityId: updated.id,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        slug: updated.slug,
        title: updated.title,
        routingRulesCount: (updated.routingRules || []).length,
      },
    });

    return updated;
  }

  async deleteForm(
    tenantId: string,
    actor: { id: string; email: string },
    formId: string
  ): Promise<void> {
    const existing = await this.formRepository.getFormById(tenantId, formId);
    if (!existing) {
      throw new Error('Form not found.');
    }

    await this.formRepository.deleteForm(tenantId, formId);

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'cms:forms:delete',
      entityType: 'form',
      entityId: formId,
      outcome: AuditOutcome.SUCCESS,
      metadata: { slug: existing.slug, title: existing.title },
    });
  }

  // ----------------------------------------------------
  // Public Form Retrieval & Submission
  // ----------------------------------------------------

  async getPublicFormBySlug(tenantId: string, slug: string): Promise<PublicFormDto | null> {
    return this.formRepository.getPublicFormBySlug(tenantId, slug);
  }

  async submitPublicForm(
    tenantId: string,
    slug: string,
    payload: PublicSubmitFormDto,
    clientMeta: { ip?: string; userAgent?: string; tenantName?: string; contactEmail?: string }
  ): Promise<{
    submissionId: string;
    status: string;
    category?: string;
    deliveryStatus?: string;
    referenceNumber: string;
    message: string;
    idempotentReplay?: boolean;
  }> {
    // 1. Anti-abuse Honeypot check
    if (payload._hp_company && payload._hp_company.length > 0) {
      throw new FormValidationError(
        'Spam submission detected and blocked',
        [{ field: '_hp_company', message: 'Invalid submission' }]
      );
    }

    // 2. Fetch full form configuration
    const form = await this.formRepository.getFormBySlug(tenantId, slug);
    if (!form || !form.isPublished) {
      throw new Error('Form not found or is currently closed to submissions.');
    }

    // 3. Idempotency Check: if idempotency key provided, check for existing submission
    if (payload.idempotencyKey) {
      const existingSub = await this.formRepository.findSubmissionByIdempotencyKey(
        tenantId,
        form.id,
        payload.idempotencyKey
      );
      if (existingSub) {
        return {
          submissionId: existingSub.id,
          status: existingSub.status,
          category: existingSub.category || undefined,
          deliveryStatus: existingSub.deliveryStatus,
          referenceNumber: existingSub.id,
          message: form.successMessage || 'Thank you! Your submission has been received.',
          idempotentReplay: true,
        };
      }
    }

    // 4. Dynamic Field Validation
    const errors: Array<{ field: string; message: string }> = [];
    const submittedData = payload.data || {};
    const sanitizedData: Record<string, unknown> = {};

    for (const field of form.fields) {
      const rawVal = submittedData[field.name];
      const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;

      const isMissing =
        val === undefined ||
        val === null ||
        (typeof val === 'string' && val === '') ||
        (Array.isArray(val) && val.length === 0);

      if (field.isRequired && isMissing) {
        errors.push({
          field: field.name,
          message: `${field.label} is required.`,
        });
        continue;
      }

      if (!isMissing) {
        if (field.fieldType === 'EMAIL') {
          if (typeof val !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            errors.push({
              field: field.name,
              message: `Please enter a valid email address for ${field.label}.`,
            });
          }
        } else if (field.fieldType === 'PHONE') {
          if (typeof val !== 'string' || !/^\+?[0-9\s\-().]{7,25}$/.test(val)) {
            errors.push({
              field: field.name,
              message: `Please enter a valid phone number for ${field.label}.`,
            });
          }
        } else if (field.fieldType === 'NUMBER') {
          const num = Number(val);
          if (isNaN(num)) {
            errors.push({
              field: field.name,
              message: `${field.label} must be a number.`,
            });
          }
        } else if (field.fieldType === 'SELECT' || field.fieldType === 'RADIO') {
          if (field.options && field.options.length > 0) {
            const allowedValues = field.options.map((opt) => opt.value);
            if (!allowedValues.includes(String(val))) {
              errors.push({
                field: field.name,
                message: `Selected value for ${field.label} is invalid.`,
              });
            }
          }
        } else if (field.fieldType === 'DATE') {
          const d = new Date(String(val));
          if (isNaN(d.getTime())) {
            errors.push({
              field: field.name,
              message: `Please enter a valid date for ${field.label}.`,
            });
          }
        } else if (field.fieldType === 'TEXT') {
          if (typeof val === 'string' && val.length > 255) {
            errors.push({
              field: field.name,
              message: `${field.label} cannot exceed 255 characters.`,
            });
          }
        } else if (field.fieldType === 'TEXTAREA') {
          if (typeof val === 'string' && val.length > 5000) {
            errors.push({
              field: field.name,
              message: `${field.label} cannot exceed 5000 characters.`,
            });
          }
        }

        sanitizedData[field.name] = val;
      }
    }

    if (errors.length > 0) {
      throw new FormValidationError('Validation failed for one or more fields.', errors);
    }

    // 5. Extract primary submitter identity metadata
    let submitterEmail: string | undefined;
    let submitterName: string | undefined;
    let submitterPhone: string | undefined;
    let selectedCategory: string | undefined;

    for (const field of form.fields) {
      const val = sanitizedData[field.name];
      if (typeof val === 'string' && val.length > 0) {
        const lowerName = field.name.toLowerCase();
        if (!submitterEmail && (lowerName.includes('email') || field.fieldType === 'EMAIL')) {
          submitterEmail = val;
        }
        if (
          !submitterName &&
          (lowerName === 'name' ||
            lowerName === 'fullname' ||
            lowerName.includes('fullname') ||
            lowerName.includes('studentname') ||
            lowerName.includes('parentname'))
        ) {
          submitterName = val;
        }
        if (
          !submitterPhone &&
          (lowerName.includes('phone') || lowerName.includes('mobile') || field.fieldType === 'PHONE')
        ) {
          submitterPhone = val;
        }
        if (
          !selectedCategory &&
          (lowerName === 'department' || lowerName === 'category' || lowerName === 'enquirycategory')
        ) {
          selectedCategory = val;
        }
      }
    }

    // 6. Validated Department / Category Routing (FR-CON-001 & FR-CON-002)
    const routingRules = form.routingRules || [];
    let routedRecipients: string[] = [];

    if (selectedCategory && routingRules.length > 0) {
      const matchingRule = routingRules.find(
        (r) => r.category.toLowerCase() === selectedCategory!.toLowerCase()
      );
      if (matchingRule && matchingRule.recipientEmails.length > 0) {
        routedRecipients = [...matchingRule.recipientEmails];
      }
    }

    // Default routing rule fallback
    if (routedRecipients.length === 0 && routingRules.length > 0) {
      const defaultRule = routingRules.find((r) => r.isDefault);
      if (defaultRule && defaultRule.recipientEmails.length > 0) {
        routedRecipients = [...defaultRule.recipientEmails];
      }
    }

    // Form recipientEmails fallback
    if (routedRecipients.length === 0 && form.recipientEmails.length > 0) {
      routedRecipients = [...form.recipientEmails];
    }

    // Tenant contactEmail fallback
    if (routedRecipients.length === 0 && clientMeta.contactEmail) {
      routedRecipients = [clientMeta.contactEmail];
    }

    // Fail safely if no valid destination is configured anywhere
    if (routedRecipients.length === 0) {
      throw new Error(
        `Routing configuration error: No valid institutional recipient configured for form "${form.title}".`
      );
    }

    // Deduplicate recipient emails
    routedRecipients = Array.from(new Set(routedRecipients.map((e) => e.trim().toLowerCase())));

    // 7. Privacy-preserving IP hashing (SHA-256)
    const ipAddressHash = clientMeta.ip
      ? crypto.createHash('sha256').update(clientMeta.ip).digest('hex')
      : undefined;

    // 8. Persist authoritative submission record to database first (BR-012)
    const submission = await this.formRepository.createSubmission(tenantId, form.id, sanitizedData, {
      category: selectedCategory,
      routedTo: routedRecipients,
      deliveryStatus: 'PENDING',
      idempotencyKey: payload.idempotencyKey,
      submitterEmail,
      submitterName,
      submitterPhone,
      ipAddressHash,
      userAgent: clientMeta.userAgent,
    });

    // 9. Email Notification Workflow with delivery tracking (BR-012)
    const institutionName = clientMeta.tenantName || 'Our Institution';
    let deliveryStatus: 'DELIVERED' | 'FAILED' | 'SIMULATED' = 'DELIVERED';
    let deliveryError: string | null = null;

    try {
      await this.emailService.sendFormSubmissionNotification(routedRecipients, {
        formTitle: form.title,
        formType: form.type,
        category: selectedCategory,
        submitterName,
        submitterEmail,
        submitterPhone,
        submittedAt: submission.createdAt,
        data: sanitizedData,
        tenantName: institutionName,
        routedTo: routedRecipients,
        submissionId: submission.id,
      });

      const isSim = (this.emailService as any).isSimulated ?? false;
      deliveryStatus = isSim ? 'SIMULATED' : 'DELIVERED';
    } catch (err: any) {
      deliveryStatus = 'FAILED';
      deliveryError = err?.message || 'External notification delivery failure';
      console.error('[FormService] Recipient notification failed (submission preserved):', deliveryError);
    }

    // Update delivery status on the authoritative record
    await this.formRepository.updateSubmissionDelivery(tenantId, submission.id, deliveryStatus as any, {
      deliveryError,
      incrementAttempts: true,
      routedTo: routedRecipients,
    });

    // Submitter Confirmation Notification
    if (submitterEmail) {
      try {
        await this.emailService.sendSubmissionConfirmation(submitterEmail, {
          submitterName,
          formTitle: form.title,
          tenantName: institutionName,
          category: selectedCategory,
          referenceNumber: submission.id,
          confirmationMessage: form.successMessage || 'We have received your enquiry.',
        });
      } catch (err: any) {
        console.error('[FormService] Submitter confirmation email failed:', err?.message);
      }
    }

    // Privacy-aware audit log
    await this.auditRepository.createAuditLog({
      tenantId,
      actorType: 'SYSTEM',
      action: 'enquiry:submission:received',
      entityType: 'form_submission',
      entityId: submission.id,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        formSlug: form.slug,
        category: selectedCategory || 'general',
        deliveryStatus,
        routedCount: routedRecipients.length,
      },
    });

    return {
      submissionId: submission.id,
      status: submission.status,
      category: selectedCategory,
      deliveryStatus,
      referenceNumber: submission.id,
      message:
        form.successMessage ||
        'Thank you! Your submission has been received and will be reviewed shortly.',
    };
  }

  // ----------------------------------------------------
  // Submission Review, Status Updates & Notification Retry
  // ----------------------------------------------------

  async listSubmissions(
    tenantId: string,
    query: FormSubmissionQueryDto
  ): Promise<PaginatedData<FormSubmissionDto>> {
    return this.formRepository.listSubmissions(tenantId, query);
  }

  async getSubmissionById(tenantId: string, submissionId: string): Promise<FormSubmissionDto | null> {
    return this.formRepository.getSubmissionById(tenantId, submissionId);
  }

  async updateSubmissionStatus(
    tenantId: string,
    actor: { id: string; email: string },
    submissionId: string,
    data: UpdateSubmissionStatusDto
  ): Promise<FormSubmissionDto> {
    const existing = await this.formRepository.getSubmissionById(tenantId, submissionId);
    if (!existing) {
      throw new Error('Form submission not found.');
    }

    const updated = await this.formRepository.updateSubmissionStatus(
      tenantId,
      submissionId,
      actor.id,
      data
    );

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'admissions:submission:status_update',
      entityType: 'form_submission',
      entityId: submissionId,
      outcome: AuditOutcome.SUCCESS,
      metadata: {
        formId: existing.formId,
        formTitle: existing.formTitle,
        previousStatus: existing.status,
        newStatus: data.status,
        adminNotesUpdated: !!data.adminNotes,
      },
    });

    return updated;
  }

  async retrySubmissionNotification(
    tenantId: string,
    actor: { id: string; email: string },
    submissionId: string
  ): Promise<FormSubmissionDto> {
    const submission = await this.formRepository.getSubmissionById(tenantId, submissionId);
    if (!submission) {
      throw new Error('Form submission not found.');
    }

    const form = await this.formRepository.getFormById(tenantId, submission.formId);
    const institutionName = form?.title || 'Our Institution';
    const routedRecipients =
      submission.routedTo && submission.routedTo.length > 0
        ? submission.routedTo
        : form?.recipientEmails || [];

    if (routedRecipients.length === 0) {
      throw new Error('No routed recipients configured for this submission.');
    }

    let deliveryStatus: 'DELIVERED' | 'FAILED' | 'SIMULATED' = 'DELIVERED';
    let deliveryError: string | null = null;

    try {
      await this.emailService.sendFormSubmissionNotification(routedRecipients, {
        formTitle: submission.formTitle || form?.title || 'Enquiry',
        formType: submission.formType || form?.type || 'GENERAL_ENQUIRY',
        category: submission.category || undefined,
        submitterName: submission.submitterName || undefined,
        submitterEmail: submission.submitterEmail || undefined,
        submitterPhone: submission.submitterPhone || undefined,
        submittedAt: submission.createdAt,
        data: submission.data,
        tenantName: institutionName,
        routedTo: routedRecipients,
        submissionId: submission.id,
      });

      const isSim = (this.emailService as any).isSimulated ?? false;
      deliveryStatus = isSim ? 'SIMULATED' : 'DELIVERED';
    } catch (err: any) {
      deliveryStatus = 'FAILED';
      deliveryError = err?.message || 'External notification delivery retry failed';
    }

    const updated = await this.formRepository.updateSubmissionDelivery(
      tenantId,
      submission.id,
      deliveryStatus as any,
      {
        deliveryError,
        incrementAttempts: true,
        routedTo: routedRecipients,
      }
    );

    await this.auditRepository.createAuditLog({
      tenantId,
      actorId: actor.id,
      actorEmail: actor.email,
      actorType: 'USER',
      action: 'enquiry:notification:retry',
      entityType: 'form_submission',
      entityId: submission.id,
      outcome: deliveryStatus === 'FAILED' ? AuditOutcome.FAILED : AuditOutcome.SUCCESS,
      metadata: {
        previousStatus: submission.deliveryStatus,
        newStatus: deliveryStatus,
        attempts: updated.deliveryAttempts,
        error: deliveryError,
      },
    });

    if (deliveryStatus === 'FAILED') {
      throw new Error(`Notification retry failed: ${deliveryError}`);
    }

    return updated;
  }
}
