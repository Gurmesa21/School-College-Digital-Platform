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
 * Deterministically normalizes a raw hostname string:
 * 1. Trims leading and trailing whitespace
 * 2. Strips leading protocols (http://, https://) if present
 * 3. Strips trailing paths or queries if present
 * 4. Extracts hostname portion before port number (supports IPv4, IPv6, domains)
 * 5. Removes trailing dots (.) if present (FQDN format)
 * 6. Converts to lowercase
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
 * Email Delivery Service Interface
 */
export interface IEmailService {
  sendPasswordResetEmail(toEmail: string, resetToken: string, tenantName?: string): Promise<void>;
  sendEmailVerificationEmail(toEmail: string, verificationToken: string, tenantName?: string): Promise<void>;
}
