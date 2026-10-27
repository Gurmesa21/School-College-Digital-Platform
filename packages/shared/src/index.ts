import { z } from 'zod';

/**
 * Standard API Success Response Envelope
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

/**
 * Standard API Error Response Envelope
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
    timestamp: string;
  };
}

/**
 * Paginated Data Envelope
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Health Check Response Interface
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
}

/**
 * Tenant Operational Status Enum
 */
export const TenantStatusEnum = z.enum(['ACTIVE', 'SUSPENDED', 'PENDING']);
export type TenantStatus = z.infer<typeof TenantStatusEnum>;

/**
 * Tenant Institution Type Enum (SRS Section 11.3)
 */
export const InstitutionTypeEnum = z.enum([
  'KINDERGARTEN',
  'PRIMARY_SECONDARY',
  'COLLEGE',
  'TVET_TRAINING_CENTRE',
]);
export type InstitutionType = z.infer<typeof InstitutionTypeEnum>;

/**
 * User Account Status Enum
 */
export const UserStatusEnum = z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']);
export type UserStatus = z.infer<typeof UserStatusEnum>;

/**
 * Tenant Membership Status Enum
 */
export const MembershipStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
export type MembershipStatus = z.infer<typeof MembershipStatusEnum>;

/**
 * Invitation Status Enum
 */
export const InvitationStatusEnum = z.enum(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']);
export type InvitationStatus = z.infer<typeof InvitationStatusEnum>;

/**
 * Audit Outcome Enum
 */
export const AuditOutcomeEnum = z.enum(['SUCCESS', 'DENIED', 'FAILED']);
export type AuditOutcome = z.infer<typeof AuditOutcomeEnum>;

/**
 * Standard Platform & Tenant Permissions (SRS Section 4.1 & 6)
 */
export const PERMISSIONS = {
  // Platform operations (Super Administrator only)
  PLATFORM_ACCESS: 'platform:access',
  PLATFORM_TENANTS_MANAGE: 'platform:tenants:manage',

  // Tenant profile and institutional settings
  TENANT_PROFILE_READ: 'tenant:profile:read',
  TENANT_PROFILE_UPDATE: 'tenant:profile:update',
  TENANT_BRANDING_UPDATE: 'tenant:branding:update',

  // Users and Access
  USERS_READ: 'users:read',
  USERS_INVITE: 'users:invite',
  USERS_MANAGE: 'users:manage',
  ROLES_READ: 'roles:read',
  ROLES_ASSIGN: 'roles:assign',

  // CMS & Content
  CMS_PAGES_READ: 'cms:pages:read',
  CMS_PAGES_WRITE: 'cms:pages:write',
  CMS_PAGES_PUBLISH: 'cms:pages:publish',

  // Navigation & Media (Day 6)
  CMS_NAVIGATION_READ: 'cms:navigation:read',
  CMS_NAVIGATION_WRITE: 'cms:navigation:write',
  MEDIA_READ: 'media:read',
  MEDIA_WRITE: 'media:write',
  MEDIA_DELETE: 'media:delete',
  TAXONOMY_READ: 'taxonomy:read',
  TAXONOMY_WRITE: 'taxonomy:write',

  // Admissions & Forms (Day 7)
  CMS_FORMS_READ: 'cms:forms:read',
  CMS_FORMS_WRITE: 'cms:forms:write',
  ADMISSIONS_READ: 'admissions:read',
  ADMISSIONS_REVIEW: 'admissions:review',
  ADMISSIONS_MANAGE: 'admissions:manage',

  // Academic Catalogue & Structures (Day 9)
  ACADEMICS_READ: 'academics:read',
  ACADEMICS_WRITE: 'academics:write',
  ACADEMICS_PUBLISH: 'academics:publish',

  // Staff Directory & Profiles (Day 10)
  STAFF_READ: 'staff:read',
  STAFF_WRITE: 'staff:write',
  STAFF_PUBLISH: 'staff:publish',

  // News, Notices & Events (Day 12)
  NEWS_READ: 'news:read',
  NEWS_WRITE: 'news:write',
  NEWS_PUBLISH: 'news:publish',
  ANNOUNCEMENTS_READ: 'announcements:read',
  ANNOUNCEMENTS_WRITE: 'announcements:write',
  ANNOUNCEMENTS_PUBLISH: 'announcements:publish',
  EVENTS_READ: 'events:read',
  EVENTS_WRITE: 'events:write',
  EVENTS_PUBLISH: 'events:publish',

  // Analytics
  ANALYTICS_VIEW: 'analytics:view',

  // Audit
  AUDIT_READ: 'audit:read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Sanitized user identity model (excludes password hashes)
 */
export interface AuthUser {
  id: string;
  email: string;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  emailVerifiedAt: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authenticated session representation
 */
export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Tenant-scoped membership representation
 */
export interface AuthMembership {
  id: string;
  userId: string;
  tenantId: string;
  status: MembershipStatus;
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
    permissions: PermissionCode[];
  }>;
}

/**
 * Tenant Member representation for admin user management
 */
export interface TenantMemberDto {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: MembershipStatus;
  joinedAt: string;
  updatedAt: string;
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
  }>;
}

/**
 * Tenant Invitation representation for admin user management
 */
export interface TenantInvitationDto {
  id: string;
  email: string;
  status: InvitationStatus;
  roleIds: string[];
  roleNames?: string[];
  expiresAt: string;
  sentAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  inviterEmail?: string;
}

/**
 * Audit Log representation
 */
export interface AuditLogDto {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string | null;
  outcome: AuditOutcome;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Validation schema for Health Check response
 */
export const HealthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded']),
  service: z.string(),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  environment: z.string(),
});

/**
 * Resolved Tenant Context (attached to request after verification)
 */
export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
  institutionType: InstitutionType;
  status: TenantStatus;
  timezone: string;
  defaultLocale: string;
  contactEmail: string | null;
  matchedHostname: string;
  resolutionMethod: 'DOMAIN_MAPPING' | 'DEVELOPMENT_OVERRIDE';
}

/**
 * Abstract Tenant Repository Interface for domain lookup
 */
export interface ITenantRepository {
  findByHostname(hostname: string): Promise<ResolvedTenant | null>;
  findBySlug(slug: string): Promise<ResolvedTenant | null>;
}

/**
 * Deterministically normalizes a raw hostname string
 */
export function normalizeHostname(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') {
    return '';
  }

  let cleaned = rawInput.trim();

  // Strip protocol if mistakenly passed
  if (cleaned.includes('://')) {
    cleaned = cleaned.split('://')[1] || '';
  }

  // Strip path or query if present
  cleaned = cleaned.split('/')[0] || '';
  cleaned = cleaned.split('?')[0] || '';

  // Handle IPv6 enclosed in brackets: e.g. [::1]:3000 -> ::1
  if (cleaned.startsWith('[')) {
    const closingBracket = cleaned.indexOf(']');
    if (closingBracket !== -1) {
      cleaned = cleaned.substring(1, closingBracket);
    }
  } else {
    // Strip standard port suffix: e.g. "domain.com:3000" -> "domain.com"
    const colonIndex = cleaned.indexOf(':');
    if (colonIndex !== -1) {
      cleaned = cleaned.substring(0, colonIndex);
    }
  }

  // Strip trailing dot if present (FQDN)
  while (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned.toLowerCase().trim();
}

/**
 * Deterministically normalizes an email address
 */
export function normalizeEmail(rawEmail: string): string {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return '';
  }
  return rawEmail.trim().toLowerCase();
}

/**
 * DTO Schemas for Authentication & Session Endpoints
 */
export const SignInSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});
export type SignInDto = z.infer<typeof SignInSchema>;

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address format'),
});
export type PasswordResetRequestDto = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(16, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});
export type PasswordResetConfirmDto = z.infer<typeof PasswordResetConfirmSchema>;

export const EmailVerificationSchema = z.object({
  token: z.string().min(16, 'Verification token is required'),
});
export type EmailVerificationDto = z.infer<typeof EmailVerificationSchema>;

/**
 * DTO Schemas for User Administration & Invitations (Day 4)
 */
export const CreateInvitationSchema = z.object({
  email: z.string().email('Invalid email address format'),
  roleIds: z.array(z.string().min(1)).min(1, 'At least one role must be specified'),
});
export type CreateInvitationDto = z.infer<typeof CreateInvitationSchema>;

export const AcceptInvitationSchema = z.object({
  token: z.string().min(16, 'Invitation token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});
export type AcceptInvitationDto = z.infer<typeof AcceptInvitationSchema>;

export const UpdateMembershipRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)).min(1, 'At least one role must be assigned'),
});
export type UpdateMembershipRolesDto = z.infer<typeof UpdateMembershipRolesSchema>;

export const UpdateMembershipStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  reason: z.string().max(500).optional(),
});
export type UpdateMembershipStatusDto = z.infer<typeof UpdateMembershipStatusSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
});
export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorId: z.string().optional(),
  outcome: z.enum(['SUCCESS', 'DENIED', 'FAILED']).optional(),
});
export type AuditLogQueryDto = z.infer<typeof AuditLogQuerySchema>;

/**
 * Email Delivery Service Interface
 */
export interface FormSubmissionEmailNotification {
  formTitle: string;
  formType: string;
  category?: string;
  submitterName?: string;
  submitterEmail?: string;
  submitterPhone?: string;
  submittedAt: string;
  data: Record<string, unknown>;
  tenantName: string;
  routedTo: string[];
  submissionId?: string;
}

export interface FormSubmissionConfirmationNotification {
  submitterName?: string;
  formTitle: string;
  tenantName: string;
  category?: string;
  referenceNumber?: string;
  confirmationMessage?: string;
}

export interface IEmailService {
  sendPasswordResetEmail(toEmail: string, resetToken: string, tenantName?: string): Promise<void>;
  sendEmailVerificationEmail(toEmail: string, verificationToken: string, tenantName?: string): Promise<void>;
  sendInvitationEmail(
    toEmail: string,
    invitationToken: string,
    tenantName: string,
    inviterName?: string
  ): Promise<void>;
  sendFormSubmissionNotification(
    recipientEmails: string[],
    notification: FormSubmissionEmailNotification
  ): Promise<void>;
  sendSubmissionConfirmation(
    toEmail: string,
    notification: FormSubmissionConfirmationNotification
  ): Promise<void>;
}

/**
 * CMS Page Publication Status Enum (SRS Section 8.2)
 */
export const PageStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type PageStatus = z.infer<typeof PageStatusEnum>;

/**
 * Allowlisted Page Section Types (SRS Section 8.1 & 8.3, Day 8 Reusable CMS Sections & Layouts)
 */
export const SectionTypeEnum = z.enum([
  'HERO',
  'TEXT_CONTENT',
  'IMAGE_MEDIA',
  'FEATURE_GRID',
  'ACCORDION',
  'CTA_BANNER',
  'STATS_COUNTER',
  'TESTIMONIALS',
]);
export type SectionType = z.infer<typeof SectionTypeEnum>;

/**
 * Validated Section Configurations (Prevents arbitrary unsafe executable markup)
 */
export const HeroSectionConfigSchema = z.object({
  headline: z.string().min(1, 'Headline is required').max(200),
  subheadline: z.string().max(500).optional().default(''),
  ctaText: z.string().max(100).optional().default(''),
  ctaLink: z.string().max(200).optional().default(''),
  bgImageUrl: z.string().max(1000).optional().default(''),
});
export type HeroSectionConfig = z.infer<typeof HeroSectionConfigSchema>;

export const TextContentSectionConfigSchema = z.object({
  body: z.string().min(1, 'Content body is required').max(50000),
  alignment: z.enum(['left', 'center', 'right']).optional().default('left'),
});
export type TextContentSectionConfig = z.infer<typeof TextContentSectionConfigSchema>;

export const ImageMediaSectionConfigSchema = z.object({
  imageUrl: z.string().min(1, 'Image URL is required').max(1000),
  altText: z.string().min(1, 'Alt text is required for accessibility (WCAG 2.2 AA)').max(300),
  caption: z.string().max(500).optional().default(''),
});
export type ImageMediaSectionConfig = z.infer<typeof ImageMediaSectionConfigSchema>;

export const FeatureItemSchema = z.object({
  title: z.string().min(1, 'Feature title is required').max(150),
  description: z.string().min(1, 'Feature description is required').max(500),
  icon: z.string().max(50).optional().default('check'),
});
export type FeatureItem = z.infer<typeof FeatureItemSchema>;

export const FeatureGridSectionConfigSchema = z.object({
  title: z.string().max(200).optional().default(''),
  items: z.array(FeatureItemSchema).min(1, 'At least one feature item is required').max(12),
});
export type FeatureGridSectionConfig = z.infer<typeof FeatureGridSectionConfigSchema>;

export const AccordionItemSchema = z.object({
  title: z.string().min(1, 'Accordion item question/title is required').max(200),
  content: z.string().min(1, 'Accordion item content is required').max(5000),
});
export type AccordionItem = z.infer<typeof AccordionItemSchema>;

export const AccordionSectionConfigSchema = z.object({
  title: z.string().max(200).optional().default(''),
  description: z.string().max(500).optional().default(''),
  items: z.array(AccordionItemSchema).min(1, 'At least one accordion item is required').max(25),
});
export type AccordionSectionConfig = z.infer<typeof AccordionSectionConfigSchema>;

export const CtaBannerSectionConfigSchema = z.object({
  headline: z.string().min(1, 'CTA headline is required').max(200),
  subheadline: z.string().max(500).optional().default(''),
  buttonText: z.string().max(100).optional().default(''),
  buttonUrl: z.string().max(500).optional().default(''),
  primaryButtonText: z.string().max(100).optional().default(''),
  primaryButtonUrl: z.string().max(500).optional().default(''),
  secondaryButtonText: z.string().max(100).optional().default(''),
  secondaryButtonUrl: z.string().max(500).optional().default(''),
  theme: z.string().optional().default('PRIMARY'),
  alignment: z.string().optional().default('center'),
});
export type CtaBannerSectionConfig = z.infer<typeof CtaBannerSectionConfigSchema>;

export const StatItemSchema = z.object({
  value: z.string().min(1, 'Stat metric value is required').max(50),
  label: z.string().min(1, 'Stat metric label is required').max(150),
  suffix: z.string().max(20).optional().default(''),
  description: z.string().max(300).optional().default(''),
});
export type StatItem = z.infer<typeof StatItemSchema>;

export const StatsCounterSectionConfigSchema = z.object({
  title: z.string().max(200).optional().default(''),
  subtitle: z.string().max(200).optional().default(''),
  items: z.array(StatItemSchema).min(1, 'At least one metric is required').max(8),
});
export type StatsCounterSectionConfig = z.infer<typeof StatsCounterSectionConfigSchema>;

export const TestimonialItemSchema = z
  .object({
    quote: z.string().min(1, 'Testimonial quote is required').max(1000),
    authorName: z.string().max(100).optional(),
    author: z.string().max(100).optional(),
    authorRole: z.string().max(150).optional().default(''),
    role: z.string().max(150).optional(),
    organization: z.string().max(150).optional(),
    avatarUrl: z.string().max(1000).optional().default(''),
  })
  .refine((data) => Boolean(data.authorName || data.author), {
    message: 'Author name is required',
  });
export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

export const TestimonialsSectionConfigSchema = z.object({
  title: z.string().max(200).optional().default(''),
  subtitle: z.string().max(200).optional().default(''),
  items: z.array(TestimonialItemSchema).min(1, 'At least one testimonial is required').max(6),
});
export type TestimonialsSectionConfig = z.infer<typeof TestimonialsSectionConfigSchema>;

/**
 * Generic Section Input Schema for API requests
 */
export const SectionInputSchema = z.object({
  id: z.string().optional(),
  sectionType: SectionTypeEnum,
  sortOrder: z.number().int().nonnegative().default(0),
  isVisible: z.boolean().default(true),
  config: z.record(z.unknown()),
  reusableSectionId: z.string().optional().nullable(),
});
export type SectionInputDto = z.infer<typeof SectionInputSchema>;

/**
 * Validates a section config against its specific allowlisted schema
 */
export function validateSectionConfig(sectionType: SectionType, rawConfig: unknown): Record<string, unknown> {
  switch (sectionType) {
    case 'HERO':
      return HeroSectionConfigSchema.parse(rawConfig);
    case 'TEXT_CONTENT':
      return TextContentSectionConfigSchema.parse(rawConfig);
    case 'IMAGE_MEDIA':
      return ImageMediaSectionConfigSchema.parse(rawConfig);
    case 'FEATURE_GRID':
      return FeatureGridSectionConfigSchema.parse(rawConfig);
    case 'ACCORDION':
      return AccordionSectionConfigSchema.parse(rawConfig);
    case 'CTA_BANNER':
      return CtaBannerSectionConfigSchema.parse(rawConfig);
    case 'STATS_COUNTER':
      return StatsCounterSectionConfigSchema.parse(rawConfig);
    case 'TESTIMONIALS':
      return TestimonialsSectionConfigSchema.parse(rawConfig);
    default:
      throw new Error(`Unsupported section type: ${sectionType}`);
  }
}

/**
 * CMS Page DTOs and Request Schemas
 */
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Reusable Sections DTOs and Request Schemas (Day 8)
 */
export const CreateReusableSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(150),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(slugRegex, 'Slug must consist of lowercase alphanumeric characters separated by hyphens (e.g. "campus-tour-cta")'),
  description: z.string().max(500).optional().nullable(),
  sectionType: SectionTypeEnum,
  category: z.string().max(50).optional().nullable(),
  isGlobal: z.boolean().default(false),
  config: z.record(z.unknown()),
});
export type CreateReusableSectionDto = z.infer<typeof CreateReusableSectionSchema>;

export const UpdateReusableSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required').max(150).optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(slugRegex, 'Slug must consist of lowercase alphanumeric characters separated by hyphens (e.g. "campus-tour-cta")')
    .optional(),
  description: z.string().max(500).optional().nullable(),
  sectionType: SectionTypeEnum.optional(),
  category: z.string().max(50).optional().nullable(),
  isGlobal: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});
export type UpdateReusableSectionDto = z.infer<typeof UpdateReusableSectionSchema>;

export const ReusableSectionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  sectionType: SectionTypeEnum.optional(),
  category: z.string().max(50).optional(),
});
export type ReusableSectionQueryDto = z.infer<typeof ReusableSectionQuerySchema>;

export interface ReusableSectionDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  sectionType: SectionType;
  category?: string | null;
  isGlobal: boolean;
  config: Record<string, unknown>;
  authorId?: string | null;
  lastEditorId?: string | null;
  createdAt: string;
  updatedAt: string;
  placementCount?: number;
}

export interface ReusableSectionPlacementDto {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  pageStatus: string;
  sectionId: string;
  sortOrder: number;
  isVisible: boolean;
}

export const CreatePageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(100).regex(slugRegex, 'Slug must consist of lowercase alphanumeric characters separated by hyphens (e.g. "about-us")'),
  summary: z.string().max(500).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  canonicalUrl: z.string().max(500).optional().nullable(),
  scheduledPublishAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  sections: z.array(SectionInputSchema).default([]),
});
export type CreatePageDto = z.infer<typeof CreatePageSchema>;

export const UpdatePageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  slug: z.string().min(1, 'Slug is required').max(100).regex(slugRegex, 'Slug must consist of lowercase alphanumeric characters separated by hyphens (e.g. "about-us")').optional(),
  summary: z.string().max(500).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  canonicalUrl: z.string().max(500).optional().nullable(),
  scheduledPublishAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  version: z.number().int().positive('Version is required for optimistic concurrency').optional(),
  sections: z.array(SectionInputSchema).optional(),
});
export type UpdatePageDto = z.infer<typeof UpdatePageSchema>;

export const PublishPageSchema = z.object({
  scheduledPublishAt: z.string().datetime().optional().nullable(),
});
export type PublishPageDto = z.infer<typeof PublishPageSchema>;

export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: PageStatusEnum.optional(),
  search: z.string().max(100).optional(),
});
export type PageQueryDto = z.infer<typeof PageQuerySchema>;

export interface PageSectionDto {
  id: string;
  pageId?: string;
  sectionType: SectionType;
  sortOrder: number;
  isVisible: boolean;
  config: Record<string, unknown>;
  reusableSectionId?: string | null;
  reusableSection?: {
    id: string;
    name: string;
    slug: string;
    sectionType: SectionType;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PageDto {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  summary: string | null;
  status: PageStatus;
  authorId: string | null;
  lastEditorId: string | null;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  archivedAt: string | null;
  expiresAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  sectionsCount?: number;
}

export interface PageDetailDto extends PageDto {
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  sections: PageSectionDto[];
  author?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  lastEditor?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface PublicPageDto {
  title: string;
  slug: string;
  summary: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  publishedAt: string;
  sections: Array<{
    id: string;
    sectionType: SectionType;
    sortOrder: number;
    reusableSectionId?: string | null;
    config: Record<string, unknown>;
  }>;
}

/**
 * ==========================================
 * DAY 6: NAVIGATION MENUS & ITEMS
 * ==========================================
 */

export const NavigationLocationEnum = z.enum(['HEADER', 'FOOTER', 'QUICK_LINKS']);
export type NavigationLocation = z.infer<typeof NavigationLocationEnum>;

export const CreateMenuItemSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  url: z.string().min(1, 'URL or route path is required').max(500),
  target: z.enum(['_self', '_blank']).default('_self').optional(),
  order: z.number().int().min(0).default(0).optional(),
  isVisible: z.boolean().default(true).optional(),
  pageId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});
export type CreateMenuItemDto = z.infer<typeof CreateMenuItemSchema>;

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();
export type UpdateMenuItemDto = z.infer<typeof UpdateMenuItemSchema>;

export const ReorderMenuItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number().int().min(0),
      parentId: z.string().optional().nullable(),
    })
  ),
});
export type ReorderMenuItemsDto = z.infer<typeof ReorderMenuItemsSchema>;

export interface NavigationMenuItemDto {
  id: string;
  menuId: string;
  parentId: string | null;
  label: string;
  url: string;
  target: string;
  order: number;
  isVisible: boolean;
  pageId: string | null;
  children?: NavigationMenuItemDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NavigationMenuDto {
  id: string;
  tenantId: string;
  location: NavigationLocation;
  title: string;
  isPublished: boolean;
  items: NavigationMenuItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicNavigationDto {
  location: NavigationLocation;
  title: string;
  items: Array<{
    id: string;
    label: string;
    url: string;
    target: string;
    order: number;
    children?: Array<{
      id: string;
      label: string;
      url: string;
      target: string;
      order: number;
    }>;
  }>;
}

/**
 * ==========================================
 * DAY 6: MEDIA LIBRARY & ASSETS
 * ==========================================
 */

export const MediaCategoryEnum = z.enum(['IMAGE', 'DOCUMENT', 'VIDEO', 'LOGO', 'BANNER']);
export type MediaCategory = z.infer<typeof MediaCategoryEnum>;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'video/webm',
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const StoragePolicyEnum = z.enum(['PUBLIC', 'PRIVATE']);
export type StoragePolicy = z.infer<typeof StoragePolicyEnum>;

export const CreateMediaSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    altText: z.string().max(300).optional().nullable(),
    caption: z.string().max(500).optional().nullable(),
    category: MediaCategoryEnum.default('IMAGE'),
    mimeType: z.string().refine((val) => ALLOWED_MIME_TYPES.includes(val as any), {
      message: 'Unsupported MIME type',
    }),
    fileSizeBytes: z
      .number()
      .int()
      .positive('EMPTY_FILE: File size must be greater than 0 bytes')
      .max(MAX_FILE_SIZE_BYTES, 'FILE_TOO_LARGE: File exceeds 10MB limit'),
    storageKey: z.string().min(1),
    publicUrl: z.string().default(''),
    isPublic: z.boolean().default(true),
    isDecorative: z.boolean().default(false),
    storagePolicy: StoragePolicyEnum.default('PUBLIC').optional(),
    storageProvider: z.string().default('local').optional(),
    categoryId: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      // WCAG 2.2 AA & FR-MEDIA-002: If it is an image and not decorative, alt text is required
      if (['IMAGE', 'LOGO', 'BANNER'].includes(data.category) && !data.isDecorative) {
        return !!data.altText && data.altText.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Alternative text is required for non-decorative images (WCAG 2.2 AA / FR-MEDIA-002)',
      path: ['altText'],
    }
  );
export type CreateMediaDto = z.infer<typeof CreateMediaSchema>;

export const UpdateMediaSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    altText: z.string().max(300).optional().nullable(),
    caption: z.string().max(500).optional().nullable(),
    category: MediaCategoryEnum.optional(),
    mimeType: z.string().optional(),
    fileSizeBytes: z.number().int().optional(),
    storageKey: z.string().optional(),
    publicUrl: z.string().optional(),
    isPublic: z.boolean().optional(),
    isDecorative: z.boolean().optional(),
    storagePolicy: StoragePolicyEnum.optional(),
    storageProvider: z.string().optional(),
    categoryId: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.isDecorative === false && data.altText !== undefined) {
        return !!data.altText && data.altText.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Alternative text is required for non-decorative images',
      path: ['altText'],
    }
  );
export type UpdateMediaDto = z.infer<typeof UpdateMediaSchema>;

export const MediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: MediaCategoryEnum.optional(),
  isPublic: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  storagePolicy: StoragePolicyEnum.optional(),
  categoryId: z.string().optional(),
  search: z.string().max(100).optional(),
});
export type MediaQueryDto = z.infer<typeof MediaQuerySchema>;

export interface MediaAssetDto {
  id: string;
  tenantId: string;
  uploaderId: string | null;
  title: string;
  altText: string | null;
  caption: string | null;
  category: MediaCategory;
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  publicUrl: string;
  isPublic: boolean;
  isDecorative: boolean;
  storagePolicy: 'PUBLIC' | 'PRIVATE';
  storageProvider: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  uploader?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  categoryInfo?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * ==========================================
 * DAY 6: CONTENT TAXONOMY & CATEGORIES
 * ==========================================
 */

export const CategoryTypeEnum = z.enum(['MEDIA', 'PAGE', 'GENERAL']);
export type CategoryType = z.infer<typeof CategoryTypeEnum>;

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100).regex(slugRegex, 'Slug must consist of lowercase alphanumeric characters and hyphens'),
  type: CategoryTypeEnum.default('GENERAL'),
  description: z.string().max(500).optional().nullable(),
});
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;

export interface CategoryDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  type: CategoryType;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  mediaAssetsCount?: number;
}

/**
 * ==========================================
 * DAY 7: DYNAMIC FORMS & ADMISSIONS SUBMISSIONS
 * ==========================================
 */

export const FormTypeEnum = z.enum([
  'GENERAL_ENQUIRY',
  'ADMISSIONS_INQUIRY',
  'CONTACT_US',
  'APPLICATION',
  'FEEDBACK',
  'OTHER',
]);
export type FormType = z.infer<typeof FormTypeEnum>;

export const FormFieldTypeEnum = z.enum([
  'TEXT',
  'TEXTAREA',
  'EMAIL',
  'PHONE',
  'NUMBER',
  'SELECT',
  'RADIO',
  'CHECKBOX',
  'DATE',
]);
export type FormFieldType = z.infer<typeof FormFieldTypeEnum>;

export const SubmissionStatusEnum = z.enum([
  'PENDING',
  'UNDER_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'ARCHIVED',
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusEnum>;

export const FormFieldOptionSchema = z.object({
  label: z.string().min(1, 'Option label is required').max(100),
  value: z.string().min(1, 'Option value is required').max(100),
});
export type FormFieldOption = z.infer<typeof FormFieldOptionSchema>;

export const FormFieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  customError: z.string().optional(),
});
export type FormFieldValidation = z.infer<typeof FormFieldValidationSchema>;

export const FormFieldInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Field name is required')
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Field name must be alphanumeric with underscores or hyphens'),
  label: z.string().min(1, 'Field label is required').max(120),
  fieldType: FormFieldTypeEnum.default('TEXT'),
  placeholder: z.string().max(200).optional().nullable(),
  helpText: z.string().max(300).optional().nullable(),
  defaultValue: z.string().max(200).optional().nullable(),
  isRequired: z.boolean().default(false),
  validationRules: FormFieldValidationSchema.optional().nullable(),
  options: z.array(FormFieldOptionSchema).optional().nullable(),
  orderIndex: z.number().int().min(0).default(0),
});
export type FormFieldInputDto = z.infer<typeof FormFieldInputSchema>;

export interface FormFieldDto {
  id: string;
  formId: string;
  name: string;
  label: string;
  fieldType: FormFieldType;
  placeholder: string | null;
  helpText: string | null;
  defaultValue: string | null;
  isRequired: boolean;
  validationRules: FormFieldValidation | null;
  options: FormFieldOption[] | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export const FormRoutingRuleSchema = z.object({
  category: z.string().min(1, 'Category key is required').max(50),
  label: z.string().max(100).optional(),
  recipientEmails: z.array(z.string().email('Valid recipient email required')).min(1, 'At least one recipient email required'),
  isDefault: z.boolean().optional().default(false),
});
export type FormRoutingRule = z.infer<typeof FormRoutingRuleSchema>;

export const SubmissionDeliveryStatusEnum = z.enum([
  'PENDING',
  'DELIVERED',
  'FAILED',
  'SIMULATED',
  'SKIPPED',
]);
export type SubmissionDeliveryStatus = z.infer<typeof SubmissionDeliveryStatusEnum>;

export const CreateFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(slugRegex, 'Slug must consist of lowercase alphanumeric characters and hyphens'),
  description: z.string().max(1000).optional().nullable(),
  type: FormTypeEnum.default('GENERAL_ENQUIRY'),
  recipientEmails: z.array(z.string().email('Valid recipient email required')).default([]),
  routingRules: z.array(FormRoutingRuleSchema).optional().nullable(),
  isPublished: z.boolean().default(true),
  successMessage: z.string().max(500).optional().nullable(),
  submitButtonText: z.string().max(50).default('Submit'),
  fields: z.array(FormFieldInputSchema).optional(),
});
export type CreateFormDto = z.infer<typeof CreateFormSchema>;

export const UpdateFormSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  slug: z.string().min(1).max(100).regex(slugRegex).optional(),
  description: z.string().max(1000).optional().nullable(),
  type: FormTypeEnum.optional(),
  recipientEmails: z.array(z.string().email()).optional(),
  routingRules: z.array(FormRoutingRuleSchema).optional().nullable(),
  isPublished: z.boolean().optional(),
  successMessage: z.string().max(500).optional().nullable(),
  submitButtonText: z.string().max(50).optional(),
  fields: z.array(FormFieldInputSchema).optional(),
});
export type UpdateFormDto = z.infer<typeof UpdateFormSchema>;

export interface FormDto {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string | null;
  type: FormType;
  recipientEmails: string[];
  routingRules?: FormRoutingRule[] | null;
  isPublished: boolean;
  successMessage: string | null;
  submitButtonText: string;
  fields: FormFieldDto[];
  submissionsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFormDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: FormType;
  isPublished: boolean;
  successMessage: string | null;
  submitButtonText: string;
  fields: FormFieldDto[];
}

export const PublicSubmitFormSchema = z.object({
  data: z.record(z.unknown()),
  _hp_company: z.string().optional(),
  idempotencyKey: z.string().max(128).optional(),
});
export type PublicSubmitFormDto = z.infer<typeof PublicSubmitFormSchema>;

export const UpdateSubmissionStatusSchema = z.object({
  status: SubmissionStatusEnum,
  adminNotes: z.string().max(2000).optional().nullable(),
});
export type UpdateSubmissionStatusDto = z.infer<typeof UpdateSubmissionStatusSchema>;

export const FormSubmissionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: SubmissionStatusEnum.optional(),
  formId: z.string().optional(),
  category: z.string().optional(),
  deliveryStatus: SubmissionDeliveryStatusEnum.optional(),
  search: z.string().max(100).optional(),
});
export type FormSubmissionQueryDto = z.infer<typeof FormSubmissionQuerySchema>;

export interface FormSubmissionDto {
  id: string;
  tenantId: string;
  formId: string;
  formTitle?: string;
  formType?: FormType;
  data: Record<string, unknown>;
  category?: string | null;
  routedTo: string[];
  deliveryStatus: SubmissionDeliveryStatus;
  deliveryAttempts: number;
  lastDeliveryAttemptAt: string | null;
  deliveryError: string | null;
  idempotencyKey: string | null;
  status: SubmissionStatus;
  submitterEmail: string | null;
  submitterName: string | null;
  submitterPhone: string | null;
  adminNotes: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewerName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * --------------------------------------------------------------------------
 * Academic Catalogue & Structures (Day 9)
 * FR-ACAD-001, FR-ACAD-002, FR-CMS-002
 * --------------------------------------------------------------------------
 */

export interface AcademicLevelDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  levelType?: string | null;
  description?: string | null;
  orderIndex: number;
  minAge?: number | null;
  maxAge?: number | null;
  ageRange?: string | null;
  isActive: boolean;
  programmesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const CreateAcademicLevelSchema = z.object({
  name: z.string().min(2, 'Level name must be at least 2 characters').max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  levelType: z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  orderIndex: z.number().int().optional().default(0),
  minAge: z.number().int().min(0).max(120).optional().nullable(),
  maxAge: z.number().int().min(0).max(120).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});
export type CreateAcademicLevelDto = z.infer<typeof CreateAcademicLevelSchema>;

export const UpdateAcademicLevelSchema = CreateAcademicLevelSchema.partial();
export type UpdateAcademicLevelDto = z.infer<typeof UpdateAcademicLevelSchema>;

export interface AcademicDepartmentDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  code?: string | null;
  departmentType?: string | null;
  description?: string | null;
  parentId?: string | null;
  orderIndex: number;
  isActive: boolean;
  parent?: { id: string; name: string; slug: string } | null;
  children?: Array<{ id: string; name: string; slug: string }>;
  programmesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const CreateAcademicDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(150),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  code: z.string().max(30).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  parentId: z.string().optional().nullable(),
  orderIndex: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});
export type CreateAcademicDepartmentDto = z.infer<typeof CreateAcademicDepartmentSchema>;

export const UpdateAcademicDepartmentSchema = CreateAcademicDepartmentSchema.partial();
export type UpdateAcademicDepartmentDto = z.infer<typeof UpdateAcademicDepartmentSchema>;

export interface CourseDto {
  id: string;
  tenantId: string;
  code?: string | null;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  credits?: number | null;
  hours?: number | null;
  levelId?: string | null;
  departmentId?: string | null;
  syllabus?: string | null;
  isElective?: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  orderIndex: number;
  level?: { id: string; name: string; slug: string } | null;
  department?: { id: string; name: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const CreateCourseSchema = z.object({
  code: z.string().max(30).optional().nullable(),
  title: z.string().min(2, 'Course title must be at least 2 characters').max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  summary: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  credits: z.number().min(0).max(100).optional().nullable(),
  hours: z.number().int().min(0).max(2000).optional().nullable(),
  levelId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  syllabus: z.string().max(10000).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('DRAFT'),
  orderIndex: z.number().int().optional().default(0),
});
export type CreateCourseDto = z.infer<typeof CreateCourseSchema>;

export const UpdateCourseSchema = CreateCourseSchema.partial();
export type UpdateCourseDto = z.infer<typeof UpdateCourseSchema>;

export interface ProgrammeCourseDto {
  programmeId: string;
  courseId: string;
  isRequired: boolean;
  term?: string | null;
  orderIndex: number;
  course: CourseDto;
}

export interface ProgrammeDto {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  programmeType?: string | null;
  levelId?: string | null;
  departmentId?: string | null;
  duration?: string | null;
  entryRequirements?: string | null;
  qualificationsAwarded?: string | null;
  curriculum?: string | null;
  tuitionFee?: number | null;
  tuitionCurrency?: string | null;
  tuitionPeriod?: string | null;
  tuitionDescription?: string | null;
  displayTuition: boolean;
  heroMediaId?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isActive: boolean;
  isFeatured: boolean;
  orderIndex: number;
  publishedAt?: string | null;
  archivedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  authorId?: string | null;
  lastEditorId?: string | null;
  level?: AcademicLevelDto | null;
  department?: AcademicDepartmentDto | null;
  heroMedia?: {
    id: string;
    title: string;
    publicUrl: string;
    altText?: string | null;
    caption?: string | null;
  } | null;
  courses?: ProgrammeCourseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicProgrammeDto {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  programmeType?: string | null;
  duration?: string | null;
  entryRequirements?: string | null;
  qualificationsAwarded?: string | null;
  curriculum?: string | null;
  displayTuition: boolean;
  tuitionFee?: number | null;
  tuitionCurrency?: string | null;
  tuitionPeriod?: string | null;
  tuitionDescription?: string | null;
  isFeatured: boolean;
  level?: {
    id: string;
    name: string;
    slug: string;
    levelType?: string | null;
  } | null;
  department?: {
    id: string;
    name: string;
    slug: string;
    code?: string | null;
  } | null;
  heroMedia?: {
    id: string;
    title: string;
    publicUrl: string;
    altText?: string | null;
    caption?: string | null;
  } | null;
  courses?: Array<{
    courseId: string;
    isRequired: boolean;
    term?: string | null;
    title: string;
    code?: string | null;
    credits?: number | null;
    summary?: string | null;
  }>;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
}

export const CreateProgrammeSchema = z.object({
  title: z.string().min(2, 'Programme title must be at least 2 characters').max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  summary: z.string().max(500).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  programmeType: z.string().max(50).optional().nullable(),
  levelId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  entryRequirements: z.string().max(5000).optional().nullable(),
  qualificationsAwarded: z.string().max(200).optional().nullable(),
  curriculum: z.string().max(200).optional().nullable(),
  tuitionFee: z.number().min(0).optional().nullable(),
  tuitionCurrency: z.string().max(10).optional().default('USD'),
  tuitionPeriod: z.string().max(50).optional().nullable(),
  tuitionDescription: z.string().max(1000).optional().nullable(),
  displayTuition: z.boolean().optional().default(false),
  heroMediaId: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('DRAFT'),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  orderIndex: z.number().int().optional().default(0),
  seoTitle: z.string().max(120).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  canonicalUrl: z.string().max(500).optional().nullable(),
});
export type CreateProgrammeDto = z.infer<typeof CreateProgrammeSchema>;

export const UpdateProgrammeSchema = CreateProgrammeSchema.partial();
export type UpdateProgrammeDto = z.infer<typeof UpdateProgrammeSchema>;

export const ProgrammeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  levelId: z.string().optional(),
  departmentId: z.string().optional(),
  programmeType: z.string().optional(),
  search: z.string().max(100).optional(),
  isFeatured: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
});
export type ProgrammeQueryDto = z.infer<typeof ProgrammeQuerySchema>;

export const AssignCoursesToProgrammeSchema = z.object({
  courseIds: z.array(z.string()).min(1),
  isRequired: z.boolean().optional().default(true),
  term: z.string().max(50).optional().nullable(),
});
export type AssignCoursesToProgrammeDto = z.infer<typeof AssignCoursesToProgrammeSchema>;

/**
 * ==========================================
 * DAY 10: STAFF DIRECTORY & PROFILES
 * ==========================================
 */

export interface StaffProfileDto {
  id: string;
  tenantId: string;
  fullName: string;
  slug: string;
  roleTitle: string;
  biography?: string | null;
  departmentId?: string | null;
  profileMediaId?: string | null;
  subjects: string[];
  qualifications?: string | null;
  officeLocation?: string | null;
  consultationHours?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  displayEmail: boolean;
  displayPhone: boolean;
  websiteUrl?: string | null;
  internalNotes?: string | null;
  userId?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isActive: boolean;
  isFeatured: boolean;
  orderIndex: number;
  publishedAt?: string | null;
  archivedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  authorId?: string | null;
  lastEditorId?: string | null;
  department?: AcademicDepartmentDto | null;
  profileMedia?: {
    id: string;
    title: string;
    publicUrl: string;
    altText?: string | null;
    caption?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicStaffProfileDto {
  id: string;
  fullName: string;
  slug: string;
  roleTitle: string;
  biography?: string | null;
  subjects: string[];
  qualifications?: string | null;
  officeLocation?: string | null;
  consultationHours?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  websiteUrl?: string | null;
  isFeatured: boolean;
  orderIndex: number;
  department?: {
    id: string;
    name: string;
    slug: string;
    code?: string | null;
  } | null;
  profileMedia?: {
    id: string;
    title: string;
    publicUrl: string;
    altText?: string | null;
    caption?: string | null;
  } | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
}

export const CreateStaffProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  roleTitle: z.string().min(2, 'Role or professional title must be at least 2 characters').max(200),
  biography: z.string().max(10000).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  profileMediaId: z.string().optional().nullable(),
  subjects: z.array(z.string().max(100)).optional().default([]),
  qualifications: z.string().max(1000).optional().nullable(),
  officeLocation: z.string().max(200).optional().nullable(),
  consultationHours: z.string().max(200).optional().nullable(),
  publicEmail: z.string().email('Invalid public email').max(200).optional().nullable().or(z.literal('')),
  publicPhone: z.string().max(50).optional().nullable().or(z.literal('')),
  displayEmail: z.boolean().optional().default(false),
  displayPhone: z.boolean().optional().default(false),
  websiteUrl: z.string().url('Invalid website URL').max(500).optional().nullable().or(z.literal('')),
  internalNotes: z.string().max(5000).optional().nullable(),
  userId: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('DRAFT'),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  orderIndex: z.number().int().optional().default(0),
  seoTitle: z.string().max(120).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  canonicalUrl: z.string().max(500).optional().nullable(),
});
export type CreateStaffProfileDto = z.infer<typeof CreateStaffProfileSchema>;

export const UpdateStaffProfileSchema = CreateStaffProfileSchema.partial();
export type UpdateStaffProfileDto = z.infer<typeof UpdateStaffProfileSchema>;

export const StaffProfileQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  departmentId: z.string().optional(),
  roleTitle: z.string().optional(),
  subject: z.string().optional(),
  search: z.string().max(100).optional(),
  isActive: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  isFeatured: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
});
export type StaffProfileQueryDto = z.infer<typeof StaffProfileQuerySchema>;

// ============================================================================
// DAY 12: NEWS, NOTICES & EVENT CALENDAR
// ============================================================================

export const AnnouncementPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'EMERGENCY']);
export type AnnouncementPriority = z.infer<typeof AnnouncementPriorityEnum>;

export const AnnouncementAudienceEnum = z.enum(['GENERAL', 'STUDENTS', 'PARENTS', 'STAFF']);
export type AnnouncementAudience = z.infer<typeof AnnouncementAudienceEnum>;

// ----------------------------------------------------------------------------
// FR-COM-001: Editorial News
// ----------------------------------------------------------------------------

export interface NewsArticleDto {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  authorName: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  featuredMediaId: string | null;
  tags: string[];
  relatedIds: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  authorId: string | null;
  lastEditorId: string | null;
  featuredMedia?: {
    id: string;
    title: string;
    publicUrl: string;
    altText: string | null;
    caption: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicNewsArticleDto {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  authorName: string | null;
  publishedAt: string;
  featuredMedia: {
    id: string;
    title: string;
    publicUrl: string;
    altText: string | null;
    caption: string | null;
  } | null;
  tags: string[];
  relatedArticles?: Array<{
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    publishedAt: string;
  }>;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
}

export const CreateNewsArticleSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  summary: z.string().max(1000).optional().nullable(),
  body: z.string().min(5, 'Story body must be at least 5 characters'),
  authorName: z.string().max(100).optional().nullable(),
  publishedAt: z.string().datetime({ offset: true }).optional().nullable().or(z.string().datetime().optional().nullable()),
  featuredMediaId: z.string().optional().nullable(),
  tags: z.array(z.string().max(50)).optional().default([]),
  relatedIds: z.array(z.string()).optional().default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('DRAFT'),
  seoTitle: z.string().max(120).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
  canonicalUrl: z.string().max(500).optional().nullable(),
});
export type CreateNewsArticleDto = z.infer<typeof CreateNewsArticleSchema>;

export const UpdateNewsArticleSchema = CreateNewsArticleSchema.partial();
export type UpdateNewsArticleDto = z.infer<typeof UpdateNewsArticleSchema>;

export const NewsArticleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  tag: z.string().optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  search: z.string().max(100).optional(),
});
export type NewsArticleQueryDto = z.infer<typeof NewsArticleQuerySchema>;

// ----------------------------------------------------------------------------
// FR-COM-002: Operational Announcements
// ----------------------------------------------------------------------------

export interface AnnouncementDto {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  isPinned: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  authorId: string | null;
  lastEditorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicAnnouncementDto {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  isPinned: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const CreateAnnouncementSchema = z
  .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    content: z.string().min(2, 'Content must be at least 2 characters').max(5000),
    priority: AnnouncementPriorityEnum.optional().default('NORMAL'),
    audience: AnnouncementAudienceEnum.optional().default('GENERAL'),
    isPinned: z.boolean().optional().default(false),
    startsAt: z.string().datetime({ offset: true }).optional().nullable().or(z.string().datetime().optional().nullable()),
    expiresAt: z.string().datetime({ offset: true }).optional().nullable().or(z.string().datetime().optional().nullable()),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('DRAFT'),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.expiresAt) {
        return new Date(data.expiresAt) > new Date(data.startsAt);
      }
      return true;
    },
    {
      message: 'Announcement expiry time must be after the start time',
      path: ['expiresAt'],
    }
  );
export type CreateAnnouncementDto = z.infer<typeof CreateAnnouncementSchema>;

export const UpdateAnnouncementSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    content: z.string().min(2).max(5000).optional(),
    priority: AnnouncementPriorityEnum.optional(),
    audience: AnnouncementAudienceEnum.optional(),
    isPinned: z.boolean().optional(),
    startsAt: z.string().datetime({ offset: true }).optional().nullable().or(z.string().datetime().optional().nullable()),
    expiresAt: z.string().datetime({ offset: true }).optional().nullable().or(z.string().datetime().optional().nullable()),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.expiresAt) {
        return new Date(data.expiresAt) > new Date(data.startsAt);
      }
      return true;
    },
    {
      message: 'Announcement expiry time must be after the start time',
      path: ['expiresAt'],
    }
  );
export type UpdateAnnouncementDto = z.infer<typeof UpdateAnnouncementSchema>;

export const AnnouncementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  priority: AnnouncementPriorityEnum.optional(),
  audience: AnnouncementAudienceEnum.optional(),
  search: z.string().max(100).optional(),
  activeOnly: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
});
export type AnnouncementQueryDto = z.infer<typeof AnnouncementQuerySchema>;

// ----------------------------------------------------------------------------
// FR-EVT-001: Events Calendar
// ----------------------------------------------------------------------------

export interface EventItemDto {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location: string | null;
  category: string;
  coverMediaId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  capacity: number | null;
  isRegistrationOpen: boolean;
  registrationUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  authorId: string | null;
  lastEditorId: string | null;
  coverMedia?: {
    id: string;
    title: string;
    publicUrl: string;
    altText: string | null;
    caption: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicEventItemDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location: string | null;
  category: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  capacity: number | null;
  isRegistrationOpen: boolean;
  registrationUrl: string | null;
  coverMedia: {
    id: string;
    title: string;
    publicUrl: string;
    altText: string | null;
    caption: string | null;
  } | null;
}

export const CreateEventSchema = z
  .object({
    title: z.string().min(2, 'Event title must be at least 2 characters').max(200),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
    description: z.string().max(10000).optional().nullable(),
    startsAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
    endsAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
    timezone: z.string().min(2).max(50).default('UTC'),
    location: z.string().max(200).optional().nullable(),
    category: z.string().max(50).optional().default('GENERAL'),
    coverMediaId: z.string().optional().nullable(),
    contactName: z.string().max(100).optional().nullable(),
    contactEmail: z.string().email('Invalid contact email').max(200).optional().nullable().or(z.literal('')),
    contactPhone: z.string().max(50).optional().nullable().or(z.literal('')),
    capacity: z.coerce.number().int().positive().optional().nullable(),
    isRegistrationOpen: z.boolean().optional().default(false),
    registrationUrl: z.string().url('Invalid registration URL').max(500).optional().nullable().or(z.literal('')),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('DRAFT'),
  })
  .refine(
    (data) => {
      return new Date(data.endsAt) >= new Date(data.startsAt);
    },
    {
      message: 'Event end time must be at or after the start time',
      path: ['endsAt'],
    }
  );
export type CreateEventDto = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = z
  .object({
    title: z.string().min(2).max(200).optional(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    description: z.string().max(10000).optional().nullable(),
    startsAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
    endsAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
    timezone: z.string().min(2).max(50).optional(),
    location: z.string().max(200).optional().nullable(),
    category: z.string().max(50).optional(),
    coverMediaId: z.string().optional().nullable(),
    contactName: z.string().max(100).optional().nullable(),
    contactEmail: z.string().email().max(200).optional().nullable().or(z.literal('')),
    contactPhone: z.string().max(50).optional().nullable().or(z.literal('')),
    capacity: z.coerce.number().int().positive().optional().nullable(),
    isRegistrationOpen: z.boolean().optional(),
    registrationUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt) >= new Date(data.startsAt);
      }
      return true;
    },
    {
      message: 'Event end time must be at or after the start time',
      path: ['endsAt'],
    }
  );
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;

export const EventQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  category: z.string().optional(),
  timeframe: z.enum(['upcoming', 'past', 'all']).optional().default('upcoming'),
  search: z.string().max(100).optional(),
});
export type EventQueryDto = z.infer<typeof EventQuerySchema>;



