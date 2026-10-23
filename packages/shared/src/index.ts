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

  // Admissions
  ADMISSIONS_READ: 'admissions:read',
  ADMISSIONS_REVIEW: 'admissions:review',
  ADMISSIONS_MANAGE: 'admissions:manage',

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
export interface IEmailService {
  sendPasswordResetEmail(toEmail: string, resetToken: string, tenantName?: string): Promise<void>;
  sendEmailVerificationEmail(toEmail: string, verificationToken: string, tenantName?: string): Promise<void>;
  sendInvitationEmail(
    toEmail: string,
    invitationToken: string,
    tenantName: string,
    inviterName?: string
  ): Promise<void>;
}

/**
 * CMS Page Publication Status Enum (SRS Section 8.2)
 */
export const PageStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type PageStatus = z.infer<typeof PageStatusEnum>;

/**
 * Allowlisted Page Section Types (SRS Section 8.1 & 8.3)
 */
export const SectionTypeEnum = z.enum(['HERO', 'TEXT_CONTENT', 'IMAGE_MEDIA', 'FEATURE_GRID']);
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

/**
 * Generic Section Input Schema for API requests
 */
export const SectionInputSchema = z.object({
  id: z.string().optional(),
  sectionType: SectionTypeEnum,
  sortOrder: z.number().int().nonnegative().default(0),
  isVisible: z.boolean().default(true),
  config: z.record(z.unknown()),
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
    default:
      throw new Error(`Unsupported section type: ${sectionType}`);
  }
}

/**
 * CMS Page DTOs and Request Schemas
 */
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    config: Record<string, unknown>;
  }>;
}
