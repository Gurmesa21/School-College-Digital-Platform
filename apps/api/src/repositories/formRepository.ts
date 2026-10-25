import { prisma, FormType, FormFieldType, SubmissionStatus } from '@school/db';
import {
  FormDto,
  PublicFormDto,
  FormFieldDto,
  CreateFormDto,
  UpdateFormDto,
  FormSubmissionDto,
  FormSubmissionQueryDto,
  UpdateSubmissionStatusDto,
  PaginatedData,
} from '@school/shared';

export interface IFormRepository {
  listForms(tenantId: string): Promise<FormDto[]>;
  getFormById(tenantId: string, formId: string): Promise<FormDto | null>;
  getFormBySlug(tenantId: string, slug: string): Promise<FormDto | null>;
  getPublicFormBySlug(tenantId: string, slug: string): Promise<PublicFormDto | null>;
  createForm(tenantId: string, data: CreateFormDto): Promise<FormDto>;
  updateForm(tenantId: string, formId: string, data: UpdateFormDto): Promise<FormDto>;
  deleteForm(tenantId: string, formId: string): Promise<void>;
  listSubmissions(tenantId: string, query: FormSubmissionQueryDto): Promise<PaginatedData<FormSubmissionDto>>;
  getSubmissionById(tenantId: string, submissionId: string): Promise<FormSubmissionDto | null>;
  createSubmission(
    tenantId: string,
    formId: string,
    data: Record<string, unknown>,
    meta: {
      submitterEmail?: string;
      submitterName?: string;
      submitterPhone?: string;
      ipAddressHash?: string;
      userAgent?: string;
    }
  ): Promise<FormSubmissionDto>;
  updateSubmissionStatus(
    tenantId: string,
    submissionId: string,
    reviewerId: string,
    data: UpdateSubmissionStatusDto
  ): Promise<FormSubmissionDto>;
}

export class PrismaFormRepository implements IFormRepository {
  private mapFormField(f: any): FormFieldDto {
    return {
      id: f.id,
      formId: f.formId,
      name: f.name,
      label: f.label,
      fieldType: f.fieldType as any,
      placeholder: f.placeholder,
      helpText: f.helpText,
      defaultValue: f.defaultValue,
      isRequired: f.isRequired,
      validationRules: f.validationRules as any,
      options: f.options as any,
      orderIndex: f.orderIndex,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    };
  }

  private mapForm(form: any, submissionsCount = 0): FormDto {
    return {
      id: form.id,
      tenantId: form.tenantId,
      title: form.title,
      slug: form.slug,
      description: form.description,
      type: form.type as any,
      recipientEmails: form.recipientEmails || [],
      isPublished: form.isPublished,
      successMessage: form.successMessage,
      submitButtonText: form.submitButtonText,
      fields: (form.fields || []).map((f: any) => this.mapFormField(f)),
      submissionsCount,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    };
  }

  private mapSubmission(sub: any): FormSubmissionDto {
    return {
      id: sub.id,
      tenantId: sub.tenantId,
      formId: sub.formId,
      formTitle: sub.form?.title,
      formType: sub.form?.type as any,
      data: (sub.data as Record<string, unknown>) || {},
      status: sub.status as any,
      submitterEmail: sub.submitterEmail,
      submitterName: sub.submitterName,
      submitterPhone: sub.submitterPhone,
      adminNotes: sub.adminNotes,
      reviewedById: sub.reviewedById,
      reviewedAt: sub.reviewedAt ? sub.reviewedAt.toISOString() : null,
      reviewerName: sub.reviewedBy
        ? `${sub.reviewedBy.firstName || ''} ${sub.reviewedBy.lastName || ''}`.trim() || sub.reviewedBy.email
        : null,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    };
  }

  async listForms(tenantId: string): Promise<FormDto[]> {
    const forms = await prisma.form.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    return forms.map((f) => this.mapForm(f, f._count.submissions));
  }

  async getFormById(tenantId: string, formId: string): Promise<FormDto | null> {
    const form = await prisma.form.findFirst({
      where: { id: formId, tenantId },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form) return null;
    return this.mapForm(form, form._count.submissions);
  }

  async getFormBySlug(tenantId: string, slug: string): Promise<FormDto | null> {
    const form = await prisma.form.findFirst({
      where: { slug, tenantId },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form) return null;
    return this.mapForm(form, form._count.submissions);
  }

  async getPublicFormBySlug(tenantId: string, slug: string): Promise<PublicFormDto | null> {
    const form = await prisma.form.findFirst({
      where: { slug, tenantId, isPublished: true },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!form) return null;

    return {
      id: form.id,
      title: form.title,
      slug: form.slug,
      description: form.description,
      type: form.type as any,
      isPublished: form.isPublished,
      successMessage: form.successMessage,
      submitButtonText: form.submitButtonText,
      fields: form.fields.map((f) => this.mapFormField(f)),
    };
  }

  async createForm(tenantId: string, data: CreateFormDto): Promise<FormDto> {
    const created = await prisma.form.create({
      data: {
        tenantId,
        title: data.title,
        slug: data.slug,
        description: data.description,
        type: data.type as FormType,
        recipientEmails: data.recipientEmails,
        isPublished: data.isPublished,
        successMessage: data.successMessage,
        submitButtonText: data.submitButtonText,
        fields: data.fields && data.fields.length > 0
          ? {
              create: data.fields.map((f, idx) => ({
                name: f.name,
                label: f.label,
                fieldType: f.fieldType as FormFieldType,
                placeholder: f.placeholder,
                helpText: f.helpText,
                defaultValue: f.defaultValue,
                isRequired: f.isRequired,
                validationRules: f.validationRules as any,
                options: f.options as any,
                orderIndex: f.orderIndex ?? idx,
              })),
            }
          : undefined,
      },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return this.mapForm(created, 0);
  }

  async updateForm(tenantId: string, formId: string, data: UpdateFormDto): Promise<FormDto> {
    // If fields are provided, replace them atomically
    const form = await prisma.$transaction(async (tx) => {
      if (data.fields !== undefined) {
        await tx.formField.deleteMany({
          where: { formId },
        });

        if (data.fields.length > 0) {
          await tx.formField.createMany({
            data: data.fields.map((f, idx) => ({
              formId,
              name: f.name,
              label: f.label,
              fieldType: f.fieldType as FormFieldType,
              placeholder: f.placeholder,
              helpText: f.helpText,
              defaultValue: f.defaultValue,
              isRequired: f.isRequired,
              validationRules: f.validationRules as any,
              options: f.options as any,
              orderIndex: f.orderIndex ?? idx,
            })),
          });
        }
      }

      return tx.form.update({
        where: { id: formId },
        data: {
          title: data.title,
          slug: data.slug,
          description: data.description,
          type: data.type ? (data.type as FormType) : undefined,
          recipientEmails: data.recipientEmails,
          isPublished: data.isPublished,
          successMessage: data.successMessage,
          submitButtonText: data.submitButtonText,
        },
        include: {
          fields: {
            orderBy: { orderIndex: 'asc' },
          },
          _count: {
            select: { submissions: true },
          },
        },
      });
    });

    return this.mapForm(form, form._count.submissions);
  }

  async deleteForm(tenantId: string, formId: string): Promise<void> {
    await prisma.form.delete({
      where: { id: formId, tenantId },
    });
  }

  async listSubmissions(tenantId: string, query: FormSubmissionQueryDto): Promise<PaginatedData<FormSubmissionDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (query.status) {
      where.status = query.status as SubmissionStatus;
    }
    if (query.formId) {
      where.formId = query.formId;
    }
    if (query.search) {
      where.OR = [
        { submitterName: { contains: query.search, mode: 'insensitive' } },
        { submitterEmail: { contains: query.search, mode: 'insensitive' } },
        { submitterPhone: { contains: query.search, mode: 'insensitive' } },
        { adminNotes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.formSubmission.count({ where }),
      prisma.formSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          form: {
            select: { title: true, type: true },
          },
          reviewedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    return {
      items: records.map((r) => this.mapSubmission(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSubmissionById(tenantId: string, submissionId: string): Promise<FormSubmissionDto | null> {
    const record = await prisma.formSubmission.findFirst({
      where: { id: submissionId, tenantId },
      include: {
        form: {
          select: { title: true, type: true },
        },
        reviewedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!record) return null;
    return this.mapSubmission(record);
  }

  async createSubmission(
    tenantId: string,
    formId: string,
    data: Record<string, unknown>,
    meta: {
      submitterEmail?: string;
      submitterName?: string;
      submitterPhone?: string;
      ipAddressHash?: string;
      userAgent?: string;
    }
  ): Promise<FormSubmissionDto> {
    const created = await prisma.formSubmission.create({
      data: {
        tenantId,
        formId,
        data: data as any,
        status: SubmissionStatus.PENDING,
        submitterEmail: meta.submitterEmail,
        submitterName: meta.submitterName,
        submitterPhone: meta.submitterPhone,
        ipAddressHash: meta.ipAddressHash,
        userAgent: meta.userAgent,
      },
      include: {
        form: {
          select: { title: true, type: true },
        },
      },
    });

    return this.mapSubmission(created);
  }

  async updateSubmissionStatus(
    tenantId: string,
    submissionId: string,
    reviewerId: string,
    data: UpdateSubmissionStatusDto
  ): Promise<FormSubmissionDto> {
    const updated = await prisma.formSubmission.update({
      where: { id: submissionId, tenantId },
      data: {
        status: data.status as SubmissionStatus,
        adminNotes: data.adminNotes !== undefined ? data.adminNotes : undefined,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        form: {
          select: { title: true, type: true },
        },
        reviewedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    return this.mapSubmission(updated);
  }
}

export class InMemoryFormRepository implements IFormRepository {
  private forms: FormDto[] = [];
  private submissions: FormSubmissionDto[] = [];

  async listForms(tenantId: string): Promise<FormDto[]> {
    return this.forms
      .filter((f) => f.tenantId === tenantId)
      .map((f) => ({
        ...f,
        submissionsCount: this.submissions.filter((s) => s.formId === f.id && s.tenantId === tenantId).length,
      }));
  }

  async getFormById(tenantId: string, formId: string): Promise<FormDto | null> {
    const f = this.forms.find((item) => item.id === formId && item.tenantId === tenantId);
    if (!f) return null;
    return {
      ...f,
      submissionsCount: this.submissions.filter((s) => s.formId === f.id && s.tenantId === tenantId).length,
    };
  }

  async getFormBySlug(tenantId: string, slug: string): Promise<FormDto | null> {
    const f = this.forms.find((item) => item.slug === slug && item.tenantId === tenantId);
    if (!f) return null;
    return {
      ...f,
      submissionsCount: this.submissions.filter((s) => s.formId === f.id && s.tenantId === tenantId).length,
    };
  }

  async getPublicFormBySlug(tenantId: string, slug: string): Promise<PublicFormDto | null> {
    const f = this.forms.find((item) => item.slug === slug && item.tenantId === tenantId && item.isPublished);
    if (!f) return null;
    return {
      id: f.id,
      title: f.title,
      slug: f.slug,
      description: f.description,
      type: f.type,
      isPublished: f.isPublished,
      successMessage: f.successMessage,
      submitButtonText: f.submitButtonText,
      fields: f.fields,
    };
  }

  async createForm(tenantId: string, data: CreateFormDto): Promise<FormDto> {
    const formId = `form-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const fields: FormFieldDto[] = (data.fields || []).map((f, idx) => ({
      id: `field-${Date.now()}-${idx}`,
      formId,
      name: f.name,
      label: f.label,
      fieldType: f.fieldType,
      placeholder: f.placeholder || null,
      helpText: f.helpText || null,
      defaultValue: f.defaultValue || null,
      isRequired: f.isRequired ?? false,
      validationRules: f.validationRules || null,
      options: f.options || null,
      orderIndex: f.orderIndex ?? idx,
      createdAt: now,
      updatedAt: now,
    }));

    const newForm: FormDto = {
      id: formId,
      tenantId,
      title: data.title,
      slug: data.slug,
      description: data.description || null,
      type: data.type,
      recipientEmails: data.recipientEmails,
      isPublished: data.isPublished,
      successMessage: data.successMessage || null,
      submitButtonText: data.submitButtonText,
      fields,
      submissionsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.forms.push(newForm);
    return newForm;
  }

  async updateForm(tenantId: string, formId: string, data: UpdateFormDto): Promise<FormDto> {
    const idx = this.forms.findIndex((f) => f.id === formId && f.tenantId === tenantId);
    if (idx === -1) {
      throw new Error('Form not found');
    }

    const current = this.forms[idx];
    const now = new Date().toISOString();

    let fields = current.fields;
    if (data.fields !== undefined) {
      fields = data.fields.map((f, fIdx) => ({
        id: `field-${Date.now()}-${fIdx}`,
        formId,
        name: f.name,
        label: f.label,
        fieldType: f.fieldType,
        placeholder: f.placeholder || null,
        helpText: f.helpText || null,
        defaultValue: f.defaultValue || null,
        isRequired: f.isRequired ?? false,
        validationRules: f.validationRules || null,
        options: f.options || null,
        orderIndex: f.orderIndex ?? fIdx,
        createdAt: now,
        updatedAt: now,
      }));
    }

    const updated: FormDto = {
      ...current,
      title: data.title ?? current.title,
      slug: data.slug ?? current.slug,
      description: data.description !== undefined ? data.description : current.description,
      type: data.type ?? current.type,
      recipientEmails: data.recipientEmails ?? current.recipientEmails,
      isPublished: data.isPublished !== undefined ? data.isPublished : current.isPublished,
      successMessage: data.successMessage !== undefined ? data.successMessage : current.successMessage,
      submitButtonText: data.submitButtonText ?? current.submitButtonText,
      fields,
      updatedAt: now,
    };

    this.forms[idx] = updated;
    return {
      ...updated,
      submissionsCount: this.submissions.filter((s) => s.formId === formId && s.tenantId === tenantId).length,
    };
  }

  async deleteForm(tenantId: string, formId: string): Promise<void> {
    this.forms = this.forms.filter((f) => !(f.id === formId && f.tenantId === tenantId));
    this.submissions = this.submissions.filter((s) => !(s.formId === formId && s.tenantId === tenantId));
  }

  async listSubmissions(
    tenantId: string,
    query: FormSubmissionQueryDto
  ): Promise<PaginatedData<FormSubmissionDto>> {
    let items = this.submissions.filter((s) => s.tenantId === tenantId);

    if (query.status) {
      items = items.filter((s) => s.status === query.status);
    }
    if (query.formId) {
      items = items.filter((s) => s.formId === query.formId);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      items = items.filter(
        (s) =>
          (s.submitterName && s.submitterName.toLowerCase().includes(q)) ||
          (s.submitterEmail && s.submitterEmail.toLowerCase().includes(q)) ||
          (s.submitterPhone && s.submitterPhone.toLowerCase().includes(q)) ||
          (s.adminNotes && s.adminNotes.toLowerCase().includes(q))
      );
    }

    // Sort descending by createdAt
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;
    const paginated = items.slice(skip, skip + limit);

    return {
      items: paginated,
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit) || 1,
    };
  }

  async getSubmissionById(tenantId: string, submissionId: string): Promise<FormSubmissionDto | null> {
    const s = this.submissions.find((item) => item.id === submissionId && item.tenantId === tenantId);
    return s || null;
  }

  async createSubmission(
    tenantId: string,
    formId: string,
    data: Record<string, unknown>,
    meta: {
      submitterEmail?: string;
      submitterName?: string;
      submitterPhone?: string;
      ipAddressHash?: string;
      userAgent?: string;
    }
  ): Promise<FormSubmissionDto> {
    const form = this.forms.find((f) => f.id === formId);
    const now = new Date().toISOString();

    const newSub: FormSubmissionDto = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      formId,
      formTitle: form?.title,
      formType: form?.type,
      data,
      status: 'PENDING',
      submitterEmail: meta.submitterEmail || null,
      submitterName: meta.submitterName || null,
      submitterPhone: meta.submitterPhone || null,
      adminNotes: null,
      reviewedById: null,
      reviewedAt: null,
      reviewerName: null,
      createdAt: now,
      updatedAt: now,
    };

    this.submissions.push(newSub);
    return newSub;
  }

  async updateSubmissionStatus(
    tenantId: string,
    submissionId: string,
    reviewerId: string,
    data: UpdateSubmissionStatusDto
  ): Promise<FormSubmissionDto> {
    const idx = this.submissions.findIndex((s) => s.id === submissionId && s.tenantId === tenantId);
    if (idx === -1) {
      throw new Error('Form submission not found');
    }

    const current = this.submissions[idx];
    const now = new Date().toISOString();

    const updated: FormSubmissionDto = {
      ...current,
      status: data.status,
      adminNotes: data.adminNotes !== undefined ? data.adminNotes : current.adminNotes,
      reviewedById: reviewerId,
      reviewedAt: now,
      updatedAt: now,
    };

    this.submissions[idx] = updated;
    return updated;
  }
}

