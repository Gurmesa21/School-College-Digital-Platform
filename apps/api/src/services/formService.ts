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
  public code = 'VALIDATION_FAILED';
  public details: Array<{ field: string; message: string }>;

  constructor(message: string, details: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'FormValidationError';
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
      metadata: { slug: created.slug, title: created.title, type: created.type },
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
      metadata: { slug: updated.slug, title: updated.title },
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
  ): Promise<{ submissionId: string; status: string; message: string }> {
    // 1. Anti-abuse Honeypot check
    if (payload._hp_company && payload._hp_company.length > 0) {
      throw new FormValidationError('Spam submission detected and blocked', [
        { field: '_hp_company', message: 'Invalid submission' },
      ]);
    }

    // 2. Fetch full form configuration
    const form = await this.formRepository.getFormBySlug(tenantId, slug);
    if (!form || !form.isPublished) {
      throw new Error('Form not found or is currently closed to submissions.');
    }

    // 3. Dynamic Field Validation
    const errors: Array<{ field: string; message: string }> = [];
    const submittedData = payload.data || {};

    for (const field of form.fields) {
      const val = submittedData[field.name];
      const isMissing =
        val === undefined ||
        val === null ||
        (typeof val === 'string' && val.trim() === '') ||
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
          if (typeof val !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
            errors.push({
              field: field.name,
              message: `Please enter a valid email address for ${field.label}.`,
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
        }
      }
    }

    if (errors.length > 0) {
      throw new FormValidationError('Validation failed for one or more fields.', errors);
    }

    // 4. Extract primary submitter identity metadata for quick administrative indexing
    let submitterEmail: string | undefined;
    let submitterName: string | undefined;
    let submitterPhone: string | undefined;

    for (const field of form.fields) {
      const val = submittedData[field.name];
      if (typeof val === 'string' && val.trim().length > 0) {
        const lowerName = field.name.toLowerCase();
        if (!submitterEmail && (lowerName.includes('email') || field.fieldType === 'EMAIL')) {
          submitterEmail = val.trim();
        }
        if (
          !submitterName &&
          (lowerName === 'name' ||
            lowerName === 'fullname' ||
            lowerName.includes('fullname') ||
            lowerName.includes('studentname') ||
            lowerName.includes('parentname'))
        ) {
          submitterName = val.trim();
        }
        if (
          !submitterPhone &&
          (lowerName.includes('phone') || lowerName.includes('mobile') || field.fieldType === 'PHONE'))
        {
          submitterPhone = val.trim();
        }
      }
    }

    // 5. Privacy-preserving IP hashing (SHA-256)
    const ipAddressHash = clientMeta.ip
      ? crypto.createHash('sha256').update(clientMeta.ip).digest('hex')
      : undefined;

    // 6. Persist submission
    const submission = await this.formRepository.createSubmission(tenantId, form.id, submittedData, {
      submitterEmail,
      submitterName,
      submitterPhone,
      ipAddressHash,
      userAgent: clientMeta.userAgent,
    });

    // 7. Email Notification Workflow
    const institutionName = clientMeta.tenantName || 'Our Institution';
    const recipientEmails =
      form.recipientEmails.length > 0
        ? form.recipientEmails
        : clientMeta.contactEmail
        ? [clientMeta.contactEmail]
        : [];

    // Notify institution administrators / recipients
    if (recipientEmails.length > 0) {
      try {
        await this.emailService.sendFormSubmissionNotification(recipientEmails, {
          formTitle: form.title,
          formType: form.type,
          submitterName,
          submitterEmail,
          submittedAt: submission.createdAt,
          data: submittedData,
          tenantName: institutionName,
        });
      } catch (err) {
        console.error('[FormService] Failed to send recipient notification email:', err);
      }
    }

    // Send confirmation to submitter if an email address was provided
    if (submitterEmail) {
      try {
        await this.emailService.sendSubmissionConfirmation(submitterEmail, {
          submitterName,
          formTitle: form.title,
          tenantName: institutionName,
          confirmationMessage: form.successMessage || 'We have received your enquiry.',
        });
      } catch (err) {
        console.error('[FormService] Failed to send submitter confirmation email:', err);
      }
    }

    return {
      submissionId: submission.id,
      status: submission.status,
      message:
        form.successMessage ||
        'Thank you! Your submission has been received and will be reviewed shortly.',
    };
  }

  // ----------------------------------------------------
  // Submission Review & Status Updates (Admissions / Admin)
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
}
