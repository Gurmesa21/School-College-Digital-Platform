'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AcademicAdminView from '@/components/AcademicAdminView';
import StaffAdminView from '@/components/StaffAdminView';
import NewsAdminView from '@/components/NewsAdminView';
import AnnouncementAdminView from '@/components/AnnouncementAdminView';
import EventAdminView from '@/components/EventAdminView';

interface UserMember {
  id?: string;
  membershipId?: string;
  userId: string;
  tenantId?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
  joinedAt?: string;
  createdAt?: string;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string;
  };
  roles: Array<{
    id: string;
    name: string;
    displayName?: string;
    description?: string | null;
  }>;
}

function getMemberId(m: UserMember): string {
  return m.membershipId || m.id || m.userId;
}

function getMemberEmail(m: UserMember): string {
  return m.email || m.user?.email || 'unknown';
}

function getMemberName(m: UserMember): string {
  if (m.firstName || m.lastName) {
    return `${m.firstName || ''} ${m.lastName || ''}`.trim();
  }
  if (m.user?.firstName || m.user?.lastName) {
    return `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim();
  }
  return 'Unnamed User';
}

function getMemberDate(m: UserMember): string {
  return m.joinedAt || m.createdAt || new Date().toISOString();
}

interface Invitation {
  id: string;
  email: string;
  tenantId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  inviter?: {
    id: string;
    email: string;
  };
  roles: Array<{
    id: string;
    name: string;
  }>;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isPlatformRole?: boolean;
}

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

interface CmsPageItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  archivedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  sectionsCount?: number;
}

interface CmsSectionItem {
  id?: string;
  sectionType:
    | 'HERO'
    | 'TEXT_CONTENT'
    | 'IMAGE_MEDIA'
    | 'FEATURE_GRID'
    | 'ACCORDION'
    | 'CTA_BANNER'
    | 'STATS_COUNTER'
    | 'TESTIMONIALS';
  sortOrder: number;
  isVisible: boolean;
  reusableSectionId?: string | null;
  reusableSection?: {
    id: string;
    name: string;
    slug: string;
    category?: string | null;
  } | null;
  config: Record<string, any>;
}

interface ReusableSectionItem {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  sectionType:
    | 'HERO'
    | 'TEXT_CONTENT'
    | 'IMAGE_MEDIA'
    | 'FEATURE_GRID'
    | 'ACCORDION'
    | 'CTA_BANNER'
    | 'STATS_COUNTER'
    | 'TESTIMONIALS';
  category?: string | null;
  isGlobal: boolean;
  config: Record<string, any>;
  placementCount?: number;
  author?: { id: string; email: string; firstName?: string | null; lastName?: string | null } | null;
  lastEditor?: { id: string; email: string; firstName?: string | null; lastName?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

interface NavigationItem {
  id: string;
  menuId: string;
  label: string;
  url: string;
  target: '_self' | '_blank';
  orderIndex: number;
  isVisible: boolean;
  parentId?: string | null;
  pageId?: string | null;
  children?: NavigationItem[];
}

interface MediaAssetItem {
  id: string;
  tenantId: string;
  title: string;
  filename?: string;
  storageKey?: string;
  storagePath?: string;
  publicUrl?: string | null;
  mimeType: string;
  fileSizeBytes?: number;
  fileSize?: number;
  category: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'LOGO' | 'BANNER';
  altText?: string | null;
  isDecorative: boolean;
  isPublic: boolean;
  storagePolicy?: 'PUBLIC' | 'PRIVATE';
  storageProvider?: string;
  caption?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  url?: string;
}

interface FormFieldItem {
  id?: string;
  name: string;
  label: string;
  fieldType: 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'NUMBER' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'DATE';
  placeholder?: string | null;
  helpText?: string | null;
  defaultValue?: string | null;
  isRequired: boolean;
  options?: Array<{ label: string; value: string }> | null;
  orderIndex: number;
}

interface FormRoutingRuleItem {
  category: string;
  label?: string;
  recipientEmails: string[];
  isDefault?: boolean;
}

interface FormItem {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string | null;
  type: 'GENERAL_ENQUIRY' | 'ADMISSIONS_INQUIRY' | 'CONTACT_US' | 'APPLICATION' | 'FEEDBACK' | 'OTHER';
  recipientEmails: string[];
  routingRules?: FormRoutingRuleItem[] | null;
  isPublished: boolean;
  successMessage: string | null;
  submitButtonText: string;
  fields: FormFieldItem[];
  submissionsCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface FormSubmissionItem {
  id: string;
  tenantId: string;
  formId: string;
  formTitle?: string;
  formType?: string;
  category?: string | null;
  routedTo?: string[];
  deliveryStatus?: 'PENDING' | 'DELIVERED' | 'FAILED' | 'SIMULATED' | 'SKIPPED';
  deliveryAttempts?: number;
  lastDeliveryAttemptAt?: string | null;
  deliveryError?: string | null;
  idempotencyKey?: string | null;
  data: Record<string, unknown>;
  status: 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'ARCHIVED';
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

export default function TenantAdminPage() {
  const [activeTab, setActiveTab] = useState<
    | 'members'
    | 'invitations'
    | 'audit'
    | 'pages'
    | 'sections'
    | 'navigation'
    | 'media'
    | 'forms'
    | 'submissions'
    | 'academics'
    | 'staff'
    | 'news'
    | 'announcements'
    | 'events'
  >('members');
  const [tenantSlug, setTenantSlug] = useState('oxford');
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  // Day 8 Reusable Sections State
  const [reusableSections, setReusableSections] = useState<ReusableSectionItem[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [sectionTypeFilter, setSectionTypeFilter] = useState('ALL');
  const [sectionCategoryFilter, setSectionCategoryFilter] = useState('ALL');

  // Reusable Section Builder Modal State
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionFormName, setSectionFormName] = useState('');
  const [sectionFormSlug, setSectionFormSlug] = useState('');
  const [sectionFormDesc, setSectionFormDesc] = useState('');
  const [sectionFormType, setSectionFormType] = useState<
    'HERO' | 'TEXT_CONTENT' | 'IMAGE_MEDIA' | 'FEATURE_GRID' | 'ACCORDION' | 'CTA_BANNER' | 'STATS_COUNTER' | 'TESTIMONIALS'
  >('CTA_BANNER');
  const [sectionFormCategory, setSectionFormCategory] = useState('');
  const [sectionFormIsGlobal, setSectionFormIsGlobal] = useState(false);
  const [sectionFormConfig, setSectionFormConfig] = useState<Record<string, any>>({});
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionModalError, setSectionModalError] = useState<string | null>(null);

  // Reusable Section Insertion Modal (from Page Editor)
  const [isInsertSectionModalOpen, setIsInsertSectionModalOpen] = useState(false);

  // Placements Inspect Modal
  const [placementsModalData, setPlacementsModalData] = useState<{
    sectionName: string;
    sectionSlug: string;
    placements: Array<{ pageId: string; pageTitle: string; pageSlug: string; isPagePublished: boolean; isVisible: boolean }>;
  } | null>(null);

  // Members state
  const [members, setMembers] = useState<UserMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Available roles for tenant
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Role editing modal/inline state
  const [editingMember, setEditingMember] = useState<UserMember | null>(null);
  const [editingRoleIds, setEditingRoleIds] = useState<string[]>([]);
  const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);

  // Status update state
  const [statusUpdateLoadingId, setStatusUpdateLoadingId] = useState<string | null>(null);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Notification / Alert
  const [globalNotice, setGlobalNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // CMS Pages state
  const [pages, setPages] = useState<CmsPageItem[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; firstName?: string | null; lastName?: string | null } | null>(null);
  const [authEmail, setAuthEmail] = useState('admin@oxford.edu');
  const [authPassword, setAuthPassword] = useState('AdminPassword123!');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // CMS Editor Modal state
  const [isPageEditorOpen, setIsPageEditorOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageVersion, setPageVersion] = useState<number>(1);
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formSeoTitle, setFormSeoTitle] = useState('');
  const [formSeoDescription, setFormSeoDescription] = useState('');
  const [formSections, setFormSections] = useState<CmsSectionItem[]>([]);
  const [pageSaving, setPageSaving] = useState(false);
  const [pageFormError, setPageFormError] = useState<string | null>(null);

  // Preview Modal state
  const [previewPage, setPreviewPage] = useState<CmsPageItem | null>(null);
  const [previewSections, setPreviewSections] = useState<CmsSectionItem[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Action loading state (publishing / archiving)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Day 6 Navigation State
  const [navLocation, setNavLocation] = useState<'HEADER' | 'FOOTER' | 'QUICK_LINKS'>('HEADER');
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);
  const [navLoading, setNavLoading] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [editingNavItem, setEditingNavItem] = useState<NavigationItem | null>(null);
  const [navItemLabel, setNavItemLabel] = useState('');
  const [navItemUrl, setNavItemUrl] = useState('');
  const [navItemTarget, setNavItemTarget] = useState<'_self' | '_blank'>('_self');
  const [navItemParentId, setNavItemParentId] = useState<string>('');
  const [navItemPageId, setNavItemPageId] = useState<string>('');
  const [navItemIsVisible, setNavItemIsVisible] = useState(true);
  const [navSaving, setNavSaving] = useState(false);
  const [navModalError, setNavModalError] = useState<string | null>(null);

  // Day 6 Media Library State
  const [mediaAssets, setMediaAssets] = useState<MediaAssetItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState<string>('ALL');
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaCategory, setMediaCategory] = useState<'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'LOGO' | 'BANNER'>('IMAGE');
  const [mediaAltText, setMediaAltText] = useState('');
  const [mediaIsDecorative, setMediaIsDecorative] = useState(false);
  const [mediaIsPublic, setMediaIsPublic] = useState(true);
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaStorageUrl, setMediaStorageUrl] = useState('');
  const [mediaSaving, setMediaSaving] = useState(false);
  const [mediaModalError, setMediaModalError] = useState<string | null>(null);

  // Day 11 Dual Storage & File Upload States
  const [mediaFileBase64, setMediaFileBase64] = useState<string | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string>('');
  const [mediaFileMime, setMediaFileMime] = useState<string>('');
  const [mediaFileBytes, setMediaFileBytes] = useState<number>(0);
  const [mediaStoragePolicy, setMediaStoragePolicy] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');

  // Day 11 File Replacement Modal States
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replacingAsset, setReplacingAsset] = useState<MediaAssetItem | null>(null);
  const [replaceFileBase64, setReplaceFileBase64] = useState<string | null>(null);
  const [replaceFileName, setReplaceFileName] = useState<string>('');
  const [replaceFileMime, setReplaceFileMime] = useState<string>('');
  const [replaceSaving, setReplaceSaving] = useState(false);
  const [replaceModalError, setReplaceModalError] = useState<string | null>(null);

  // Day 6 Media Picker for CMS Sections
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [targetSectionIndex, setTargetSectionIndex] = useState<number | null>(null);

  // Day 7 Dynamic Forms State
  const [forms, setForms] = useState<FormItem[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);

  // Day 7 Form Builder Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formBuilderTitle, setFormBuilderTitle] = useState('');
  const [formBuilderSlug, setFormBuilderSlug] = useState('');
  const [formBuilderDesc, setFormBuilderDesc] = useState('');
  const [formBuilderType, setFormBuilderType] = useState<FormItem['type']>('GENERAL_ENQUIRY');
  const [formBuilderRecipients, setFormBuilderRecipients] = useState('');
  const [formBuilderPublished, setFormBuilderPublished] = useState(true);
  const [formBuilderSuccessMsg, setFormBuilderSuccessMsg] = useState('');
  const [formBuilderBtnText, setFormBuilderBtnText] = useState('Submit');
  const [formBuilderFields, setFormBuilderFields] = useState<FormFieldItem[]>([]);
  const [formBuilderRoutingRules, setFormBuilderRoutingRules] = useState<FormRoutingRuleItem[]>([]);
  const [formModalError, setFormModalError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // Day 7 Submissions State
  const [submissions, setSubmissions] = useState<FormSubmissionItem[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('ALL');
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');

  // Day 7 Submission Review Modal State
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmissionItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<FormSubmissionItem['status']>('PENDING');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [retryNotificationLoading, setRetryNotificationLoading] = useState(false);
  const [reviewModalError, setReviewModalError] = useState<string | null>(null);

  // Helper for API request headers
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (tenantSlug) {
      headers['x-tenant-id'] = tenantSlug;
    }
    return headers;
  }, [tenantSlug]);

  // 1. Fetch available roles
  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/roles`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Filter out platform-only roles like SUPER_ADMIN for tenant assignment
        const tenantRoles = data.data.filter((r: Role) => r.name !== 'SUPER_ADMIN');
        setAvailableRoles(tenantRoles);
      }
    } catch (err: unknown) {
      console.warn('Could not fetch roles from backend API:', err);
    }
  }, [apiBaseUrl, getHeaders]);

  // 2. Fetch members
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/users?page=1&limit=20`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication required: Sign in with a tenant administrator account to view members.');
        }
        throw new Error(`Failed to load members (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        setMembers(data.data.items || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error loading members';
      setMembersError(message);
    } finally {
      setMembersLoading(false);
    }
  }, [apiBaseUrl, getHeaders]);

  // 3. Fetch invitations
  const fetchInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    setInvitationsError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/invitations?page=1&limit=20`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication required: Sign in with tenant administrator permissions.');
        }
        throw new Error(`Failed to load invitations (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        setInvitations(data.data.items || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error loading invitations';
      setInvitationsError(message);
    } finally {
      setInvitationsLoading(false);
    }
  }, [apiBaseUrl, getHeaders]);

  // 4. Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/audit?page=1&limit=25`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Permission denied: Audit log access requires TENANT_ADMIN or AUDIT_READ authority.');
        }
        throw new Error(`Failed to load audit history (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        setAuditLogs(data.data.items || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error loading audit history';
      setAuditError(message);
    } finally {
      setAuditLoading(false);
    }
  }, [apiBaseUrl, getHeaders]);

  // 5. Fetch CMS Pages
  const fetchPages = useCallback(async () => {
    setPagesLoading(true);
    setPagesError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/pages?page=1&limit=50`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication required: Sign in with tenant administrator or editor permissions.');
        }
        throw new Error(`Failed to load CMS pages (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        setPages(data.data.items || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error loading pages';
      setPagesError(message);
    } finally {
      setPagesLoading(false);
    }
  }, [apiBaseUrl, getHeaders]);

  // 5b. Fetch Reusable CMS Sections
  const fetchReusableSections = useCallback(
    async (
      categoryToFetch = sectionCategoryFilter,
      typeToFetch = sectionTypeFilter,
      queryToFetch = sectionSearchQuery
    ) => {
      setSectionsLoading(true);
      setSectionsError(null);
      try {
        const params = new URLSearchParams({ page: '1', limit: '50' });
        if (categoryToFetch && categoryToFetch !== 'ALL') params.append('category', categoryToFetch);
        if (typeToFetch && typeToFetch !== 'ALL') params.append('sectionType', typeToFetch);
        if (queryToFetch && queryToFetch.trim()) params.append('search', queryToFetch.trim());

        const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/sections?${params.toString()}`, {
          headers: getHeaders(),
          credentials: 'include',
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Authentication required: Sign in with tenant administrator or editor permissions.');
          }
          throw new Error(`Failed to load reusable sections (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (data.success && data.data) {
          setReusableSections(data.data.items || []);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error loading reusable sections';
        setSectionsError(message);
      } finally {
        setSectionsLoading(false);
      }
    },
    [apiBaseUrl, getHeaders, sectionCategoryFilter, sectionTypeFilter, sectionSearchQuery]
  );

  // 6. Fetch Navigation Menu
  const fetchNavigation = useCallback(async (locationToFetch = navLocation) => {
    setNavLoading(true);
    setNavError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/navigation/${locationToFetch}`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication required: Sign in with tenant administrator permissions to manage navigation.');
        }
        throw new Error(`Failed to load navigation menu (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        setNavItems(data.data.items || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error loading navigation menu';
      setNavError(message);
    } finally {
      setNavLoading(false);
    }
  }, [apiBaseUrl, getHeaders, navLocation]);

  // 7. Fetch Media Library Assets
  const fetchMediaAssets = useCallback(async (category = mediaCategoryFilter, query = mediaSearchQuery) => {
    setMediaLoading(true);
    setMediaError(null);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'ALL') params.append('category', category);
      if (query && query.trim()) params.append('search', query.trim());
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/media?${params.toString()}`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication required: Sign in with tenant administrator permissions to access media.');
        }
        throw new Error(`Failed to load media assets (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        setMediaAssets(data.data.items || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error loading media assets';
      setMediaError(message);
    } finally {
      setMediaLoading(false);
    }
  }, [apiBaseUrl, getHeaders, mediaCategoryFilter, mediaSearchQuery]);

  // Check active session on load
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          setCurrentUser(json.data.user);
        }
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  }, [apiBaseUrl, getHeaders]);

  const handleSignIn = async (e?: React.SyntheticEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Authentication failed');
      }
      setCurrentUser(data.data.user);
      setGlobalNotice({ type: 'success', message: `Signed in as ${data.data.user.email}` });
      fetchMembers();
      fetchRoles();
      fetchInvitations();
      fetchAuditLogs();
      fetchPages();
      fetchNavigation(navLocation);
      fetchMediaAssets(mediaCategoryFilter, mediaSearchQuery);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/v1/auth/sign-out`, {
        method: 'POST',
        credentials: 'include',
      });
      setCurrentUser(null);
      setGlobalNotice({ type: 'info', message: 'You have signed out.' });
      fetchMembers();
      fetchInvitations();
      fetchAuditLogs();
      fetchPages();
      fetchNavigation(navLocation);
      fetchMediaAssets(mediaCategoryFilter, mediaSearchQuery);
      fetchForms();
      fetchSubmissions(submissionStatusFilter, submissionSearchQuery);
    } catch {
      setCurrentUser(null);
    }
  };

  // 7. Fetch Forms
  const fetchForms = useCallback(async () => {
    setFormsLoading(true);
    setFormsError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/forms`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication required: Sign in with permissions to view forms.');
        }
        throw new Error(`Failed to fetch forms: Status ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setForms(data.data);
      }
    } catch (err: any) {
      setFormsError(err.message || 'Error fetching forms');
    } finally {
      setFormsLoading(false);
    }
  }, [apiBaseUrl, getHeaders]);

  // 8. Fetch Submissions
  const fetchSubmissions = useCallback(
    async (status?: string, search?: string) => {
      setSubmissionsLoading(true);
      setSubmissionsError(null);
      try {
        let queryUrl = `${apiBaseUrl}/api/v1/tenant/cms/forms/submissions/items?page=1&limit=50`;
        if (status && status !== 'ALL') {
          queryUrl += `&status=${encodeURIComponent(status)}`;
        }
        if (search && search.trim()) {
          queryUrl += `&search=${encodeURIComponent(search.trim())}`;
        }
        const res = await fetch(queryUrl, {
          headers: getHeaders(),
          credentials: 'include',
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Authentication required: Sign in with permissions to review submissions.');
          }
          throw new Error(`Failed to fetch submissions: Status ${res.status}`);
        }
        const data = await res.json();
        if (data.success && data.data && Array.isArray(data.data.items)) {
          setSubmissions(data.data.items);
        }
      } catch (err: any) {
        setSubmissionsError(err.message || 'Error fetching submissions');
      } finally {
        setSubmissionsLoading(false);
      }
    },
    [apiBaseUrl, getHeaders]
  );

  // Check auth once on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load admin data when authenticated user, tab, or filters change
  useEffect(() => {
    if (!currentUser) return;
    fetchRoles();
    if (activeTab === 'members') {
      fetchMembers();
    } else if (activeTab === 'invitations') {
      fetchInvitations();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'pages') {
      fetchPages();
      fetchReusableSections();
    } else if (activeTab === 'sections') {
      fetchReusableSections(sectionCategoryFilter, sectionTypeFilter, sectionSearchQuery);
    } else if (activeTab === 'navigation') {
      fetchNavigation(navLocation);
      fetchPages();
    } else if (activeTab === 'media') {
      fetchMediaAssets(mediaCategoryFilter, mediaSearchQuery);
    } else if (activeTab === 'forms') {
      fetchForms();
    } else if (activeTab === 'submissions') {
      fetchSubmissions(submissionStatusFilter, submissionSearchQuery);
    }
  }, [
    currentUser,
    activeTab,
    tenantSlug,
    navLocation,
    mediaCategoryFilter,
    mediaSearchQuery,
    submissionStatusFilter,
    submissionSearchQuery,
    sectionCategoryFilter,
    sectionTypeFilter,
    sectionSearchQuery,
    fetchRoles,
    fetchMembers,
    fetchInvitations,
    fetchAuditLogs,
    fetchPages,
    fetchReusableSections,
    fetchNavigation,
    fetchMediaAssets,
    fetchForms,
    fetchSubmissions,
  ]);

  // CMS Page Action Handlers
  const handleOpenCreatePage = () => {
    setEditingPageId(null);
    setPageVersion(1);
    setFormTitle('');
    setFormSlug('');
    setFormSummary('');
    setFormSeoTitle('');
    setFormSeoDescription('');
    setFormSections([
      {
        sectionType: 'HERO',
        sortOrder: 0,
        isVisible: true,
        config: {
          headline: 'Welcome to Our Institution',
          subheadline: 'Excellence in education and character development.',
          ctaText: 'Learn More',
          ctaLink: '/about-us',
        },
      },
    ]);
    setPageFormError(null);
    setIsPageEditorOpen(true);
  };

  const handleOpenEditPage = async (page: CmsPageItem) => {
    setPageFormError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/pages/${page.id}`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to fetch page details');
      }
      const detail = data.data;
      setEditingPageId(detail.id);
      setPageVersion(detail.version);
      setFormTitle(detail.title);
      setFormSlug(detail.slug);
      setFormSummary(detail.summary || '');
      setFormSeoTitle(detail.seoTitle || '');
      setFormSeoDescription(detail.seoDescription || '');
      setFormSections(detail.sections || []);
      setIsPageEditorOpen(true);
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Failed to open page editor' });
    }
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setPageFormError('Page title is required.');
      return;
    }
    if (!formSlug.trim()) {
      setPageFormError('Page slug is required.');
      return;
    }

    setPageSaving(true);
    setPageFormError(null);
    try {
      const payload = {
        title: formTitle.trim(),
        slug: formSlug.trim(),
        summary: formSummary.trim() || null,
        seoTitle: formSeoTitle.trim() || null,
        seoDescription: formSeoDescription.trim() || null,
        version: editingPageId ? pageVersion : undefined,
        sections: formSections,
      };

      const url = editingPageId
        ? `${apiBaseUrl}/api/v1/tenant/cms/pages/${editingPageId}`
        : `${apiBaseUrl}/api/v1/tenant/cms/pages`;
      const method = editingPageId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save page');
      }

      setGlobalNotice({
        type: 'success',
        message: editingPageId
          ? `Page "${formTitle}" updated successfully.`
          : `Page draft "${formTitle}" created successfully.`,
      });
      setIsPageEditorOpen(false);
      fetchPages();
    } catch (err: any) {
      setPageFormError(err.message || 'An error occurred while saving.');
    } finally {
      setPageSaving(false);
    }
  };

  const handlePublishPage = async (page: CmsPageItem) => {
    setActionLoadingId(page.id);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/pages/${page.id}/publish`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to publish page');
      }
      setGlobalNotice({ type: 'success', message: `Page "${page.title}" published successfully.` });
      fetchPages();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Error publishing page' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchivePage = async (page: CmsPageItem) => {
    setActionLoadingId(page.id);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/pages/${page.id}/archive`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to archive page');
      }
      setGlobalNotice({ type: 'success', message: `Page "${page.title}" archived successfully.` });
      fetchPages();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Error archiving page' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddSection = (
    type:
      | 'HERO'
      | 'TEXT_CONTENT'
      | 'IMAGE_MEDIA'
      | 'FEATURE_GRID'
      | 'ACCORDION'
      | 'CTA_BANNER'
      | 'STATS_COUNTER'
      | 'TESTIMONIALS'
  ) => {
    let defaultConfig: Record<string, any> = {};
    if (type === 'HERO') {
      defaultConfig = { headline: 'New Hero Headline', subheadline: '', ctaText: '', ctaLink: '' };
    } else if (type === 'TEXT_CONTENT') {
      defaultConfig = { body: 'Enter content here...', alignment: 'left' };
    } else if (type === 'IMAGE_MEDIA') {
      defaultConfig = { imageUrl: 'https://example.com/photo.jpg', altText: 'Descriptive image alt text', caption: '' };
    } else if (type === 'FEATURE_GRID') {
      defaultConfig = {
        title: 'Highlights',
        items: [
          { title: 'Feature 1', description: 'Feature 1 details' },
          { title: 'Feature 2', description: 'Feature 2 details' },
        ],
      };
    } else if (type === 'ACCORDION') {
      defaultConfig = {
        title: 'Frequently Asked Questions',
        subtitle: 'Key information and answers',
        items: [
          { id: 'item-1', title: 'Question 1', content: 'Details and answers for question 1.', isOpenDefault: true },
          { id: 'item-2', title: 'Question 2', content: 'Details and answers for question 2.', isOpenDefault: false },
        ],
        allowMultipleOpen: true,
      };
    } else if (type === 'CTA_BANNER') {
      defaultConfig = {
        headline: 'Discover Your Potential at Oxford',
        subheadline: 'Apply now for the upcoming academic cohort or schedule a private campus tour.',
        primaryButtonText: 'Apply Online',
        primaryButtonUrl: '/admissions',
        secondaryButtonText: 'Contact Admissions',
        secondaryButtonUrl: '/contact',
        theme: 'primary',
        alignment: 'center',
      };
    } else if (type === 'STATS_COUNTER') {
      defaultConfig = {
        title: 'Oxford Academic Excellence in Numbers',
        subtitle: 'Proven outcomes across all key academic metrics',
        items: [
          { value: '98%', label: 'Graduation Rate', suffix: '', description: 'Consistently achieved' },
          { value: '15:1', label: 'Student-to-Teacher Ratio', suffix: '', description: 'Individual attention' },
          { value: '45+', label: 'Clubs & Societies', suffix: '', description: 'Extracurricular activities' },
        ],
      };
    } else if (type === 'TESTIMONIALS') {
      defaultConfig = {
        title: 'What Our Community Says',
        subtitle: 'Reflections from students, alumni, and parents',
        items: [
          {
            quote: 'Oxford gave me the confidence and academic foundation to pursue medicine at top universities.',
            author: 'Eleanor Vance',
            role: 'Alumna',
            organization: 'Class of 2024',
          },
        ],
      };
    }

    setFormSections((prev) => [
      ...prev,
      {
        sectionType: type,
        sortOrder: prev.length,
        isVisible: true,
        config: defaultConfig,
      },
    ]);
  };

  const handleInsertReusableSection = (section: ReusableSectionItem) => {
    setFormSections((prev) => [
      ...prev,
      {
        sectionType: section.sectionType,
        sortOrder: prev.length,
        isVisible: true,
        reusableSectionId: section.id,
        reusableSection: {
          id: section.id,
          name: section.name,
          slug: section.slug,
          category: section.category,
        },
        config: section.config,
      },
    ]);
    setIsInsertSectionModalOpen(false);
    setGlobalNotice({
      type: 'success',
      message: `Inserted reusable section "${section.name}" into page layout.`,
    });
  };

  const handleMoveSection = (idx: number, direction: 'up' | 'down') => {
    setFormSections((prev) => {
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
  };

  const handleToggleSectionVisibility = (idx: number) => {
    setFormSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, isVisible: !s.isVisible } : s))
    );
  };

  const handleRemoveSection = (idx: number) => {
    setFormSections((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i }))
    );
  };

  const handleUpdateSectionConfig = (idx: number, key: string, value: any) => {
    setFormSections((prev) =>
      prev.map((sec, i) => (i === idx ? { ...sec, config: { ...sec.config, [key]: value } } : sec))
    );
  };

  // Day 8 Reusable Section CRUD Handlers
  const handleOpenCreateSection = () => {
    setEditingSectionId(null);
    setSectionFormName('');
    setSectionFormSlug('');
    setSectionFormDesc('');
    setSectionFormType('CTA_BANNER');
    setSectionFormCategory('Admissions');
    setSectionFormIsGlobal(false);
    setSectionFormConfig({
      headline: 'Join Oxford International Today',
      subheadline: 'Book a campus tour or start your admissions application online.',
      primaryButtonText: 'Apply Now',
      primaryButtonUrl: '/admissions',
      secondaryButtonText: 'Inquire',
      secondaryButtonUrl: '/contact',
      theme: 'primary',
      alignment: 'center',
    });
    setSectionModalError(null);
    setIsSectionModalOpen(true);
  };

  const handleOpenEditSection = (item: ReusableSectionItem) => {
    setEditingSectionId(item.id);
    setSectionFormName(item.name);
    setSectionFormSlug(item.slug);
    setSectionFormDesc(item.description || '');
    setSectionFormType(item.sectionType);
    setSectionFormCategory(item.category || '');
    setSectionFormIsGlobal(item.isGlobal);
    setSectionFormConfig(JSON.parse(JSON.stringify(item.config || {})));
    setSectionModalError(null);
    setIsSectionModalOpen(true);
  };

  const handleSaveReusableSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionFormName.trim()) {
      setSectionModalError('Section name is required.');
      return;
    }
    if (!sectionFormSlug.trim()) {
      setSectionModalError('Section slug is required.');
      return;
    }

    setSectionSaving(true);
    setSectionModalError(null);
    try {
      const payload = {
        name: sectionFormName.trim(),
        slug: sectionFormSlug.trim().toLowerCase(),
        description: sectionFormDesc.trim() || null,
        sectionType: sectionFormType,
        category: sectionFormCategory.trim() || null,
        isGlobal: sectionFormIsGlobal,
        config: sectionFormConfig,
      };

      const url = editingSectionId
        ? `${apiBaseUrl}/api/v1/tenant/cms/sections/${editingSectionId}`
        : `${apiBaseUrl}/api/v1/tenant/cms/sections`;
      const method = editingSectionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save reusable section');
      }

      setGlobalNotice({
        type: 'success',
        message: editingSectionId
          ? `Reusable section "${sectionFormName}" updated. Live placements will update automatically.`
          : `Reusable section "${sectionFormName}" created successfully.`,
      });
      setIsSectionModalOpen(false);
      fetchReusableSections(sectionCategoryFilter, sectionTypeFilter, sectionSearchQuery);
      if (activeTab === 'pages') {
        fetchPages();
      }
    } catch (err: any) {
      setSectionModalError(err.message || 'Error saving reusable section');
    } finally {
      setSectionSaving(false);
    }
  };

  const handleDeleteReusableSection = async (item: ReusableSectionItem) => {
    const confirmMsg = item.placementCount && item.placementCount > 0
      ? `This section is placed on ${item.placementCount} page(s). Deleting it will detach it from those pages (they will remain intact without live library sync). Proceed?`
      : `Are you sure you want to delete reusable section "${item.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(item.id);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/sections/${item.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to delete reusable section');
      }
      setGlobalNotice({
        type: 'success',
        message: `Reusable section "${item.name}" deleted successfully.`,
      });
      fetchReusableSections(sectionCategoryFilter, sectionTypeFilter, sectionSearchQuery);
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Error deleting section' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewPlacements = async (item: ReusableSectionItem) => {
    setActionLoadingId(item.id);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/sections/${item.id}/placements`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to fetch placements');
      }
      setPlacementsModalData({
        sectionName: item.name,
        sectionSlug: item.slug,
        placements: data.data || [],
      });
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Error fetching placements' });
    } finally {
      setActionLoadingId(null);
    }
  };


  // Handle invitation creation
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    if (selectedRoleIds.length === 0) {
      setInviteFeedback({ type: 'error', message: 'Please select at least one role to grant.' });
      return;
    }

    setInviteSubmitting(true);
    setInviteFeedback(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/invitations`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          roleIds: selectedRoleIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `Failed to create invitation (HTTP ${res.status})`);
      }

      setInviteFeedback({
        type: 'success',
        message: `Invitation generated for ${inviteEmail}. Token dispatched via email service (adapter status: unconfigured).`,
      });
      setInviteEmail('');
      setSelectedRoleIds([]);
      fetchInvitations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation';
      setInviteFeedback({ type: 'error', message });
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Handle resend invitation
  const handleResendInvite = async (id: string, email: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/invitations/${id}/resend`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `Failed to resend (HTTP ${res.status})`);
      }
      setGlobalNotice({ type: 'success', message: `Invitation resent to ${email}. Token refreshed with 7-day expiry.` });
      fetchInvitations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error resending invitation';
      setGlobalNotice({ type: 'error', message });
    }
  };

  // Handle revoke invitation
  const handleRevokeInvite = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the pending invitation for ${email}?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/invitations/${id}/revoke`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `Failed to revoke (HTTP ${res.status})`);
      }
      setGlobalNotice({ type: 'success', message: `Invitation for ${email} has been revoked.` });
      fetchInvitations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error revoking invitation';
      setGlobalNotice({ type: 'error', message });
    }
  };

  // Handle status toggle (Activate / Deactivate)
  const handleToggleMembershipStatus = async (member: UserMember) => {
    const memberId = getMemberId(member);
    const email = getMemberEmail(member);
    const newStatus = member.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    const actionLabel = newStatus === 'DEACTIVATED' ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} membership for ${email}?`)) return;

    setStatusUpdateLoadingId(memberId);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/users/${memberId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `Failed to update status (HTTP ${res.status})`);
      }
      setGlobalNotice({
        type: 'success',
        message: `Membership for ${email} is now ${newStatus}. ${
          newStatus === 'DEACTIVATED' ? 'All active sessions for this tenant are terminated immediately.' : ''
        }`,
      });
      fetchMembers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating membership status';
      setGlobalNotice({ type: 'error', message });
    } finally {
      setStatusUpdateLoadingId(null);
    }
  };

  // Handle role modification submit
  const handleSaveRoles = async () => {
    if (!editingMember) return;
    const memberId = getMemberId(editingMember);
    const email = getMemberEmail(editingMember);
    setRoleUpdateLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/users/${memberId}/roles`, {
        method: 'PATCH',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ roleIds: editingRoleIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `Failed to update roles (HTTP ${res.status})`);
      }
      setGlobalNotice({ type: 'success', message: `Roles updated successfully for ${email}.` });
      setEditingMember(null);
      fetchMembers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating roles';
      setGlobalNotice({ type: 'error', message });
    } finally {
      setRoleUpdateLoading(false);
    }
  };

  // =========================================================================
  // Day 6 Navigation Action Handlers
  // =========================================================================
  const handleOpenCreateNavItem = () => {
    setEditingNavItem(null);
    setNavItemLabel('');
    setNavItemUrl('');
    setNavItemTarget('_self');
    setNavItemParentId('');
    setNavItemPageId('');
    setNavItemIsVisible(true);
    setNavModalError(null);
    setIsNavModalOpen(true);
  };

  const handleOpenEditNavItem = (item: NavigationItem) => {
    setEditingNavItem(item);
    setNavItemLabel(item.label);
    setNavItemUrl(item.url);
    setNavItemTarget(item.target || '_self');
    setNavItemParentId(item.parentId || '');
    setNavItemPageId(item.pageId || '');
    setNavItemIsVisible(item.isVisible);
    setNavModalError(null);
    setIsNavModalOpen(true);
  };

  const handleSaveNavItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navItemLabel.trim() || !navItemUrl.trim()) {
      setNavModalError('Menu item label and destination URL are required.');
      return;
    }
    setNavSaving(true);
    setNavModalError(null);
    try {
      const payload: Record<string, any> = {
        label: navItemLabel.trim(),
        url: navItemUrl.trim(),
        target: navItemTarget,
        parentId: navItemParentId || undefined,
        pageId: navItemPageId || undefined,
        isVisible: navItemIsVisible,
      };

      const url = editingNavItem
        ? `${apiBaseUrl}/api/v1/tenant/cms/navigation/items/${editingNavItem.id}`
        : `${apiBaseUrl}/api/v1/tenant/cms/navigation/${navLocation}/items`;
      const method = editingNavItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save navigation item');
      }

      setGlobalNotice({
        type: 'success',
        message: `Navigation item "${navItemLabel}" saved successfully.`,
      });
      setIsNavModalOpen(false);
      fetchNavigation(navLocation);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving navigation item';
      setNavModalError(message);
    } finally {
      setNavSaving(false);
    }
  };

  const handleDeleteNavItem = async (item: NavigationItem) => {
    if (!confirm(`Are you sure you want to remove "${item.label}" from this navigation menu?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/navigation/items/${item.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to delete navigation item');
      }
      setGlobalNotice({ type: 'success', message: `Item "${item.label}" removed from menu.` });
      fetchNavigation(navLocation);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error deleting item';
      setGlobalNotice({ type: 'error', message });
    }
  };

  const handleMoveNavItem = async (itemIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= navItems.length) return;

    const newItems = [...navItems];
    const [moved] = newItems.splice(itemIndex, 1);
    newItems.splice(targetIndex, 0, moved);

    const reorderPayload = {
      items: newItems.map((item, idx) => ({ id: item.id, orderIndex: idx })),
    };

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/navigation/${navLocation}/reorder`, {
        method: 'PUT',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(reorderPayload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to reorder navigation');
      }
      setNavItems(newItems);
      setGlobalNotice({ type: 'success', message: 'Navigation order updated successfully.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reorder items';
      setGlobalNotice({ type: 'error', message });
      fetchNavigation(navLocation);
    }
  };

  // =========================================================================
  // Day 6 Media Library Action Handlers
  // =========================================================================
  const handleOpenCreateMedia = () => {
    setMediaTitle('');
    setMediaCategory('IMAGE');
    setMediaAltText('');
    setMediaIsDecorative(false);
    setMediaIsPublic(true);
    setMediaStoragePolicy('PUBLIC');
    setMediaCaption('');
    setMediaStorageUrl('');
    setMediaFileBase64(null);
    setMediaFileName('');
    setMediaFileMime('');
    setMediaFileBytes(0);
    setMediaModalError(null);
    setIsMediaModalOpen(true);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMediaModalError('File size exceeds the 10MB limit.');
      return;
    }

    setMediaFileName(file.name);
    setMediaFileBytes(file.size);
    setMediaFileMime(file.type || 'application/octet-stream');
    setMediaModalError(null);

    // Auto-populate title if empty
    if (!mediaTitle.trim()) {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setMediaTitle(baseName.replace(/[-_]/g, ' '));
    }

    // Auto-detect category from MIME
    if (file.type.startsWith('image/')) {
      setMediaCategory('IMAGE');
    } else if (file.type === 'application/pdf' || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      setMediaCategory('DOCUMENT');
    } else if (file.type.startsWith('video/')) {
      setMediaCategory('VIDEO');
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setMediaFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim()) {
      setMediaModalError('Title is required.');
      return;
    }
    // WCAG 2.2 AA Accessibility requirement: non-decorative visual assets MUST have alt-text
    if (['IMAGE', 'LOGO', 'BANNER'].includes(mediaCategory) && !mediaIsDecorative && !mediaAltText.trim()) {
      setMediaModalError('WCAG 2.2 AA Accessibility Violation: Non-decorative images must have descriptive alternative text for screen readers.');
      return;
    }

    setMediaSaving(true);
    setMediaModalError(null);
    try {
      const mime = mediaFileMime || (mediaCategory === 'DOCUMENT' ? 'application/pdf' : 'image/jpeg');
      const sizeBytes = mediaFileBytes || 1024;
      const effectivePolicy = mediaStoragePolicy || (mediaIsPublic ? 'PUBLIC' : 'PRIVATE');

      const payload: Record<string, any> = {
        title: mediaTitle.trim(),
        category: mediaCategory,
        altText: mediaIsDecorative ? undefined : mediaAltText.trim(),
        isDecorative: mediaIsDecorative,
        isPublic: effectivePolicy === 'PUBLIC',
        storagePolicy: effectivePolicy,
        caption: mediaCaption.trim() || undefined,
        fileName: mediaFileName || `${mediaTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        mimeType: mime,
        fileSizeBytes: sizeBytes,
        fileBase64: mediaFileBase64 || undefined,
        storageKey: mediaStorageUrl.trim() || `pending-${Date.now()}`,
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/media`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to upload media asset');
      }

      setGlobalNotice({
        type: 'success',
        message: `Media asset "${mediaTitle}" stored successfully (${effectivePolicy} storage).`,
      });
      setIsMediaModalOpen(false);
      fetchMediaAssets(mediaCategoryFilter, mediaSearchQuery);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error uploading media asset';
      setMediaModalError(message);
    } finally {
      setMediaSaving(false);
    }
  };

  const handleOpenReplaceMedia = (asset: MediaAssetItem) => {
    setReplacingAsset(asset);
    setReplaceFileBase64(null);
    setReplaceFileName('');
    setReplaceFileMime('');
    setReplaceModalError(null);
    setIsReplaceModalOpen(true);
  };

  const handleReplaceFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setReplaceModalError('Replacement file exceeds 10MB limit.');
      return;
    }

    setReplaceFileName(file.name);
    setReplaceFileMime(file.type || 'application/octet-stream');
    setReplaceModalError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setReplaceFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteReplaceMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingAsset || !replaceFileBase64) {
      setReplaceModalError('Please select a replacement file.');
      return;
    }

    setReplaceSaving(true);
    setReplaceModalError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/media/${replacingAsset.id}/replace`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          fileBase64: replaceFileBase64,
          mimeType: replaceFileMime || replacingAsset.mimeType,
          fileName: replaceFileName || replacingAsset.title,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to replace media asset file');
      }

      setGlobalNotice({
        type: 'success',
        message: `File replaced successfully for "${replacingAsset.title}".`,
      });
      setIsReplaceModalOpen(false);
      fetchMediaAssets(mediaCategoryFilter, mediaSearchQuery);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error replacing file';
      setReplaceModalError(message);
    } finally {
      setReplaceSaving(false);
    }
  };

  const handleGenerateSignedUrl = async (asset: MediaAssetItem) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/media/${asset.id}/signed-url`, {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ expiresInSeconds: 900 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to generate signed download URL');
      }

      const signedUrl = `${apiBaseUrl}${data.data.url}`;
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(signedUrl);
        }
      } catch {
        // In headless CI or non-secure contexts, clipboard write may fail gracefully
      }
      setGlobalNotice({
        type: 'success',
        message: `Generated 15-minute signed download URL for "${asset.title}". Copied to clipboard!`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error generating signed URL';
      setGlobalNotice({ type: 'error', message });
    }
  };

  const handleDeleteMedia = async (asset: MediaAssetItem) => {
    if (!confirm(`Are you sure you want to delete media asset "${asset.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/media/${asset.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to delete asset');
      }
      setGlobalNotice({ type: 'success', message: `Media asset "${asset.title}" deleted.` });
      fetchMediaAssets(mediaCategoryFilter, mediaSearchQuery);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error deleting asset';
      setGlobalNotice({ type: 'error', message });
    }
  };

  const handleSelectMediaForSection = (asset: MediaAssetItem) => {
    if (targetSectionIndex === null) return;
    const updated = [...formSections];
    const sec = updated[targetSectionIndex];
    if (sec) {
      const storagePath = asset.storagePath || asset.publicUrl || asset.storageKey || '';
      const publicUrl = asset.isPublic
        ? `${apiBaseUrl}/api/v1/tenant/public/media/${asset.id}/file`
        : storagePath;
      sec.config.imageUrl = publicUrl;
      sec.config.altText = asset.altText || (asset.isDecorative ? '' : asset.title);
      if (asset.caption && !sec.config.caption) {
        sec.config.caption = asset.caption;
      }
    }
    setFormSections(updated);
    setIsMediaPickerOpen(false);
    setTargetSectionIndex(null);
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      {/* Top Header */}
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <Link href="/" style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>
              &larr; Back to Platform Home
            </Link>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.25rem' }}>
              Tenant User Administration
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label htmlFor="tenant-select" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Tenant Scope:
            </label>
            <input
              id="tenant-select"
              type="text"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              className="input"
              style={{ width: '150px', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              placeholder="tenant-id"
              aria-label="Active Tenant Identifier"
            />
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Manage institutional users, role assignments, time-bounded cryptographic invitations, and inspect auditable administrative operations.
        </p>
      </header>

      {/* Auth Status & Sign-in Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', background: 'rgba(30, 41, 59, 0.7)' }}>
        {currentUser ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }}></span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Authenticated as: <strong id="auth-user-badge" style={{ color: '#f8fafc' }}>{currentUser.email}</strong>
              </span>
            </div>
            <button id="auth-signout-btn" onClick={handleSignOut} className="btn btn-secondary btn-sm">
              Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
              Admin Sign In:
            </span>
            <input
              id="auth-email"
              type="email"
              placeholder="admin@oxford.edu"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="input"
              style={{ width: '220px', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              required
            />
            <input
              id="auth-password"
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="input"
              style={{ width: '180px', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
              required
            />
            <button
              id="auth-signin-btn"
              type="button"
              onClick={() => handleSignIn()}
              className="btn btn-primary btn-sm"
              disabled={authLoading}
            >
              {authLoading ? 'Signing in...' : 'Sign In'}
            </button>
            {authError && (
              <span id="auth-error-msg" style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>
                {authError}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Global Notice Alert */}
      {globalNotice && (
        <div className={`alert alert-${globalNotice.type}`} role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>{globalNotice.message}</span>
          <button
            onClick={() => setGlobalNotice(null)}
            className="btn btn-sm btn-secondary"
            style={{ padding: '0.15rem 0.5rem', marginLeft: '1rem' }}
            aria-label="Dismiss notice"
          >
            &times;
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="tabs" aria-label="Administration Sections">
        <button
          className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
          aria-selected={activeTab === 'members'}
          role="tab"
        >
          Members & Roles
        </button>
        <button
          className={`tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
          onClick={() => setActiveTab('invitations')}
          aria-selected={activeTab === 'invitations'}
          role="tab"
        >
          Invitations & Onboarding
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
          aria-selected={activeTab === 'audit'}
          role="tab"
        >
          Audit History
        </button>
        <button
          id="tab-pages-btn"
          className={`tab-btn ${activeTab === 'pages' ? 'active' : ''}`}
          onClick={() => setActiveTab('pages')}
          aria-selected={activeTab === 'pages'}
          role="tab"
        >
          Pages & CMS
        </button>
        <button
          id="tab-sections-btn"
          className={`tab-btn ${activeTab === 'sections' ? 'active' : ''}`}
          onClick={() => setActiveTab('sections')}
          aria-selected={activeTab === 'sections'}
          role="tab"
        >
          Reusable Sections
        </button>
        <button
          id="tab-navigation-btn"
          className={`tab-btn ${activeTab === 'navigation' ? 'active' : ''}`}
          onClick={() => setActiveTab('navigation')}
          aria-selected={activeTab === 'navigation'}
          role="tab"
        >
          Navigation Menus
        </button>
        <button
          id="tab-media-btn"
          className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
          aria-selected={activeTab === 'media'}
          role="tab"
        >
          Media Library
        </button>
        <button
          id="tab-forms-btn"
          className={`tab-btn ${activeTab === 'forms' ? 'active' : ''}`}
          onClick={() => setActiveTab('forms')}
          aria-selected={activeTab === 'forms'}
          role="tab"
        >
          Dynamic Forms
        </button>
        <button
          id="tab-submissions-btn"
          className={`tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
          aria-selected={activeTab === 'submissions'}
          role="tab"
        >
          Inquiries & Submissions
        </button>
        <button
          id="tab-academics-btn"
          className={`tab-btn ${activeTab === 'academics' ? 'active' : ''}`}
          onClick={() => setActiveTab('academics')}
          aria-selected={activeTab === 'academics'}
          role="tab"
        >
          Academic Catalogue
        </button>
        <button
          id="tab-staff-btn"
          className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
          aria-selected={activeTab === 'staff'}
          role="tab"
        >
          Staff & Profiles
        </button>
        <button
          id="tab-news-btn"
          className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
          aria-selected={activeTab === 'news'}
          role="tab"
        >
          Editorial News
        </button>
        <button
          id="tab-announcements-btn"
          className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
          aria-selected={activeTab === 'announcements'}
          role="tab"
        >
          Announcements & Notices
        </button>
        <button
          id="tab-events-btn"
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
          aria-selected={activeTab === 'events'}
          role="tab"
        >
          Events Calendar
        </button>
      </nav>

      {/* TAB 1: MEMBERS */}
      {activeTab === 'members' && (
        <section aria-labelledby="members-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 id="members-heading" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
              Institutional Members
            </h2>
            <button onClick={fetchMembers} className="btn btn-secondary btn-sm" disabled={membersLoading}>
              {membersLoading ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>

          {membersError && (
            <div className="alert alert-error" role="alert">
              <span>{membersError}</span>
              <button onClick={fetchMembers} className="btn btn-sm btn-secondary">Retry</button>
            </div>
          )}

          {membersLoading && !membersError && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading tenant memberships...</p>
            </div>
          )}

          {!membersLoading && !membersError && members.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                No active or pending members found for tenant <code>{tenantSlug}</code>.
              </p>
              <button onClick={() => setActiveTab('invitations')} className="btn btn-primary btn-sm">
                Invite New Member
              </button>
            </div>
          )}

          {!membersLoading && !membersError && members.length > 0 && (
            <div className="table-container">
              <table className="table" aria-label="Tenant User Members">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Assigned Roles</th>
                    <th scope="col">Status</th>
                    <th scope="col">Joined</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const memberId = getMemberId(m);
                    const email = getMemberEmail(m);
                    const name = getMemberName(m);
                    const dateStr = getMemberDate(m);
                    return (
                      <tr key={memberId}>
                        <td>
                          <strong>{name}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{email}</div>
                        </td>
                        <td>
                          {m.roles && m.roles.length > 0 ? (
                            m.roles.map((r) => (
                              <span key={r.id} className="badge badge-role">
                                {r.name}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No roles assigned</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${m.status === 'ACTIVE' ? 'badge-active' : 'badge-deactivated'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {new Date(dateStr).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => {
                                setEditingMember(m);
                                setEditingRoleIds(m.roles.map((r) => r.id));
                              }}
                              className="btn btn-secondary btn-sm"
                              aria-label={`Edit roles for ${email}`}
                            >
                              Edit Roles
                            </button>
                            <button
                              onClick={() => handleToggleMembershipStatus(m)}
                              disabled={statusUpdateLoadingId === memberId}
                              className={`btn btn-sm ${m.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
                              aria-label={`${m.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} membership for ${email}`}
                            >
                              {statusUpdateLoadingId === memberId
                                ? 'Updating...'
                                : m.status === 'ACTIVE'
                                ? 'Deactivate'
                                : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Edit Roles Modal / In-Page Drawer */}
          {editingMember && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem',
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-roles-title"
            >
              <div className="card" style={{ maxWidth: '500px', width: '100%', margin: 0 }}>
                <h3 id="modal-roles-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
                  Assign Tenant Roles
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Select authorized tenant roles for <strong>{getMemberEmail(editingMember)}</strong>. Platform administrator privileges cannot be granted through tenant administration.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {availableRoles.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      No tenant roles discovered. (Default institutional roles will populate when connected).
                    </p>
                  ) : (
                    availableRoles.map((role) => (
                      <label
                        key={role.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          background: 'var(--bg-input)',
                          padding: '0.6rem 0.8rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editingRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingRoleIds([...editingRoleIds, role.id]);
                            } else {
                              setEditingRoleIds(editingRoleIds.filter((id) => id !== role.id));
                            }
                          }}
                        />
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{role.name}</strong>
                          {role.description && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                              {role.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    onClick={() => setEditingMember(null)}
                    className="btn btn-secondary"
                    disabled={roleUpdateLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRoles}
                    className="btn btn-primary"
                    disabled={roleUpdateLoading || editingRoleIds.length === 0}
                  >
                    {roleUpdateLoading ? 'Saving...' : 'Apply Role Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: INVITATIONS */}
      {activeTab === 'invitations' && (
        <section aria-labelledby="invitations-heading">
          {/* Create Invitation Form */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 id="invitations-heading" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
              Invite New Institutional Member
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Generate a cryptographically secure, 7-day expiring single-use invitation. An invitation must be accepted before account creation and session authentication.
            </p>

            {inviteFeedback && (
              <div className={`alert alert-${inviteFeedback.type}`} role="alert">
                <span>{inviteFeedback.message}</span>
                <button
                  onClick={() => setInviteFeedback(null)}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '0.15rem 0.5rem' }}
                >
                  &times;
                </button>
              </div>
            )}

            <form onSubmit={handleCreateInvite}>
              <div className="form-group">
                <label htmlFor="invite-email" className="form-label">
                  Invitee Email Address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="colleague@institution.edu"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Initial Roles</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {availableRoles.length === 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Loading authorized tenant roles...
                    </span>
                  ) : (
                    availableRoles.map((role) => (
                      <label
                        key={role.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: 'var(--bg-input)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoleIds([...selectedRoleIds, role.id]);
                            } else {
                              setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.id));
                            }
                          }}
                        />
                        <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{role.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={inviteSubmitting || !inviteEmail.trim() || selectedRoleIds.length === 0}
              >
                {inviteSubmitting ? 'Dispatching Invitation...' : 'Send Secure Invitation'}
              </button>
            </form>
          </div>

          {/* Pending & Existing Invitations Table */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#f8fafc' }}>Invitation Records</h3>
            <button onClick={fetchInvitations} className="btn btn-secondary btn-sm" disabled={invitationsLoading}>
              {invitationsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {invitationsError && (
            <div className="alert alert-error" role="alert">
              <span>{invitationsError}</span>
              <button onClick={fetchInvitations} className="btn btn-sm btn-secondary">Retry</button>
            </div>
          )}

          {invitationsLoading && !invitationsError && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading invitations...</p>
            </div>
          )}

          {!invitationsLoading && !invitationsError && invitations.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No invitations on record for this tenant.</p>
            </div>
          )}

          {!invitationsLoading && !invitationsError && invitations.length > 0 && (
            <div className="table-container">
              <table className="table" aria-label="Tenant Invitations">
                <thead>
                  <tr>
                    <th scope="col">Invited Email</th>
                    <th scope="col">Roles</th>
                    <th scope="col">Status</th>
                    <th scope="col">Expires</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.email}</strong>
                        {inv.inviter && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Invited by {inv.inviter.email}
                          </div>
                        )}
                      </td>
                      <td>
                        {inv.roles && inv.roles.length > 0 ? (
                          inv.roles.map((r) => (
                            <span key={r.id} className="badge badge-role">
                              {r.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Standard</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            inv.status === 'PENDING'
                              ? 'badge-pending'
                              : inv.status === 'ACCEPTED'
                              ? 'badge-success'
                              : inv.status === 'REVOKED'
                              ? 'badge-revoked'
                              : 'badge-expired'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {inv.status === 'PENDING' ? (
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleResendInvite(inv.id, inv.email)}
                              className="btn btn-secondary btn-sm"
                              aria-label={`Resend invitation to ${inv.email}`}
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(inv.id, inv.email)}
                              className="btn btn-danger btn-sm"
                              aria-label={`Revoke invitation for ${inv.email}`}
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: AUDIT HISTORY */}
      {activeTab === 'audit' && (
        <section aria-labelledby="audit-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 id="audit-heading" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Tenant Audit Trail
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Immutable, tenant-scoped administrative log. Access requires explicit audit verification.
              </p>
            </div>
            <button onClick={fetchAuditLogs} className="btn btn-secondary btn-sm" disabled={auditLoading}>
              {auditLoading ? 'Refreshing...' : 'Refresh Audit'}
            </button>
          </div>

          {auditError && (
            <div className="alert alert-error" role="alert">
              <span>{auditError}</span>
              <button onClick={fetchAuditLogs} className="btn btn-sm btn-secondary">Retry</button>
            </div>
          )}

          {auditLoading && !auditError && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading auditable events...</p>
            </div>
          )}

          {!auditLoading && !auditError && auditLogs.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No audit events recorded for tenant scope yet.</p>
            </div>
          )}

          {!auditLoading && !auditError && auditLogs.length > 0 && (
            <div className="table-container">
              <table className="table" aria-label="Tenant Audit Logs">
                <thead>
                  <tr>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Action</th>
                    <th scope="col">Entity</th>
                    <th scope="col">Outcome</th>
                    <th scope="col">Actor ID</th>
                    <th scope="col">Metadata (Redacted)</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{log.action}</strong>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {log.entityType}: <code style={{ fontSize: '0.75rem' }}>{log.entityId}</code>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            log.outcome === 'SUCCESS'
                              ? 'badge-success'
                              : log.outcome === 'DENIED'
                              ? 'badge-warning'
                              : 'badge-failed'
                          }`}
                        >
                          {log.outcome}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {log.actorUserId ? log.actorUserId.substring(0, 8) + '...' : 'System'}
                      </td>
                      <td style={{ fontSize: '0.75rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.metadata ? (
                          <pre style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(log.metadata)}
                          </pre>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: CMS PAGES & CONTENT */}
      {activeTab === 'pages' && (
        <section aria-labelledby="pages-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 id="pages-heading" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
              Institutional CMS Pages
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                id="create-page-btn"
                onClick={handleOpenCreatePage}
                className="btn btn-primary btn-sm"
              >
                + Create Page Draft
              </button>
              <button
                id="refresh-pages-btn"
                onClick={fetchPages}
                className="btn btn-secondary btn-sm"
                disabled={pagesLoading}
              >
                {pagesLoading ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>
          </div>

          {pagesError && (
            <div className="alert alert-error" role="alert">
              <span>{pagesError}</span>
              <button onClick={fetchPages} className="btn btn-sm btn-secondary">Retry</button>
            </div>
          )}

          {pagesLoading && !pagesError && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading institutional CMS pages...</p>
            </div>
          )}

          {!pagesLoading && !pagesError && pages.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                No CMS pages found for tenant <code>{tenantSlug}</code>.
              </p>
              <button onClick={handleOpenCreatePage} className="btn btn-primary btn-sm">
                Create First Page Draft
              </button>
            </div>
          )}

          {!pagesLoading && !pagesError && pages.length > 0 && (
            <div className="table-container">
              <table className="table" aria-label="Tenant CMS Pages">
                <thead>
                  <tr>
                    <th scope="col">Page Title & Summary</th>
                    <th scope="col">Slug / Route</th>
                    <th scope="col">Status</th>
                    <th scope="col">Sections</th>
                    <th scope="col">Published Date</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.title}</strong>
                        {p.summary && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.summary}
                          </div>
                        )}
                      </td>
                      <td>
                        <code>/{p.slug}</code>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            p.status === 'PUBLISHED'
                              ? 'badge-active'
                              : p.status === 'DRAFT'
                              ? 'badge-warning'
                              : 'badge-secondary'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {p.sectionsCount ?? 0} {p.sectionsCount === 1 ? 'section' : 'sections'} (v{p.version})
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : 'Not published'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            id={`edit-page-${p.slug}`}
                            onClick={() => handleOpenEditPage(p)}
                            className="btn btn-secondary btn-sm"
                            aria-label={`Edit ${p.title}`}
                          >
                            Edit
                          </button>
                          {p.status !== 'PUBLISHED' && (
                            <button
                              id={`publish-page-${p.slug}`}
                              onClick={() => handlePublishPage(p)}
                              disabled={actionLoadingId === p.id}
                              className="btn btn-primary btn-sm"
                              aria-label={`Publish ${p.title}`}
                            >
                              {actionLoadingId === p.id ? 'Publishing...' : 'Publish'}
                            </button>
                          )}
                          {p.status === 'PUBLISHED' && (
                            <>
                              <a
                                id={`view-live-${p.slug}`}
                                href={`/${p.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ textDecoration: 'none' }}
                                aria-label={`View live ${p.title}`}
                              >
                                View Live &rarr;
                              </a>
                              <button
                                id={`archive-page-${p.slug}`}
                                onClick={() => handleArchivePage(p)}
                                disabled={actionLoadingId === p.id}
                                className="btn btn-danger btn-sm"
                                aria-label={`Archive ${p.title}`}
                              >
                                {actionLoadingId === p.id ? 'Archiving...' : 'Archive'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB: REUSABLE CMS SECTIONS & LAYOUTS (DAY 8) */}
      {activeTab === 'sections' && (
        <section aria-labelledby="sections-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 id="sections-heading" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Reusable CMS Sections & Layout Library
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                Create once, publish everywhere (CO-PE). Manage modular, standardized content sections and embed them across any number of institutional pages with synchronized layout updates.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                id="create-section-btn"
                onClick={handleOpenCreateSection}
                className="btn btn-primary btn-sm"
              >
                + New Reusable Section
              </button>
              <button
                id="refresh-sections-btn"
                onClick={() => fetchReusableSections(sectionCategoryFilter, sectionTypeFilter, sectionSearchQuery)}
                className="btn btn-secondary btn-sm"
                disabled={sectionsLoading}
              >
                {sectionsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Search and Category/Type Filters */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ flex: '1 1 220px' }}>
              <label htmlFor="search-sections-input" className="sr-only">
                Search Sections
              </label>
              <input
                id="search-sections-input"
                type="text"
                placeholder="Search by name, slug, or keywords..."
                value={sectionSearchQuery}
                onChange={(e) => setSectionSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchReusableSections(sectionCategoryFilter, sectionTypeFilter, sectionSearchQuery);
                  }
                }}
                className="input"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label htmlFor="filter-section-type-select" className="sr-only">
                Filter by Type
              </label>
              <select
                id="filter-section-type-select"
                value={sectionTypeFilter}
                onChange={(e) => {
                  setSectionTypeFilter(e.target.value);
                  fetchReusableSections(sectionCategoryFilter, e.target.value, sectionSearchQuery);
                }}
                className="select"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.88rem' }}
              >
                <option value="ALL">All Section Types</option>
                <option value="HERO">Hero Banner</option>
                <option value="TEXT_CONTENT">Text Content</option>
                <option value="IMAGE_MEDIA">Image Media</option>
                <option value="FEATURE_GRID">Feature Grid</option>
                <option value="ACCORDION">Accordion / FAQ</option>
                <option value="CTA_BANNER">CTA Banner</option>
                <option value="STATS_COUNTER">Stats Counter</option>
                <option value="TESTIMONIALS">Testimonials</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-section-category-select" className="sr-only">
                Filter by Category
              </label>
              <select
                id="filter-section-category-select"
                value={sectionCategoryFilter}
                onChange={(e) => {
                  setSectionCategoryFilter(e.target.value);
                  fetchReusableSections(e.target.value, sectionTypeFilter, sectionSearchQuery);
                }}
                className="select"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.88rem' }}
              >
                <option value="ALL">All Categories</option>
                <option value="Admissions">Admissions</option>
                <option value="Academics">Academics</option>
                <option value="Campus Life">Campus Life</option>
                <option value="General">General</option>
              </select>
            </div>

            <button
              type="button"
              id="apply-sections-filter-btn"
              onClick={() => fetchReusableSections(sectionCategoryFilter, sectionTypeFilter, sectionSearchQuery)}
              className="btn btn-secondary btn-sm"
            >
              Filter
            </button>
          </div>

          {sectionsError && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }} role="alert">
              <strong>Error:</strong> {sectionsError}
            </div>
          )}

          {sectionsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading reusable section library...
            </div>
          ) : reusableSections.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
                No Reusable Sections Found
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Create your first reusable section to begin standardizing content components across pages.
              </p>
              <button onClick={handleOpenCreateSection} className="btn btn-primary btn-sm">
                + Create Section
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" aria-label="Reusable Sections Table">
                <thead>
                  <tr>
                    <th scope="col">Name & Slug</th>
                    <th scope="col">Type</th>
                    <th scope="col">Category</th>
                    <th scope="col">Placements</th>
                    <th scope="col">Last Updated</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reusableSections.map((sec) => (
                    <tr key={sec.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{sec.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          slug: <code>{sec.slug}</code>
                          {sec.description && ` — ${sec.description}`}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-reusable">{sec.sectionType}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {sec.category || 'General'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          id={`view-placements-${sec.id}`}
                          onClick={() => handleViewPlacements(sec)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.15rem 0.5rem', fontSize: '0.78rem' }}
                          title="Click to view pages embedding this section"
                        >
                          {sec.placementCount ?? 0} Page{(sec.placementCount ?? 0) === 1 ? '' : 's'}
                        </button>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(sec.updatedAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            id={`edit-section-${sec.id}`}
                            onClick={() => handleOpenEditSection(sec)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.6rem' }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            id={`delete-section-${sec.id}`}
                            onClick={() => handleDeleteReusableSection(sec)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.2rem 0.6rem' }}
                            disabled={actionLoadingId === sec.id}
                          >
                            {actionLoadingId === sec.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 5: DYNAMIC NAVIGATION MENUS */}
      {activeTab === 'navigation' && (
        <section aria-labelledby="nav-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 id="nav-heading" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Institutional Navigation Menus
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                Configure hierarchy, destination routes, target windows, and dynamic dropdown submenus for header, footer, and quick links.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                id="create-nav-item-btn"
                onClick={handleOpenCreateNavItem}
                className="btn btn-primary btn-sm"
              >
                + Add Menu Item
              </button>
              <button
                id="refresh-nav-btn"
                onClick={() => fetchNavigation(navLocation)}
                className="btn btn-secondary btn-sm"
                disabled={navLoading}
              >
                {navLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Location Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(30, 41, 59, 0.5)', padding: '0.5rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '0.5rem' }}>
              Menu Location:
            </span>
            {(['HEADER', 'FOOTER', 'QUICK_LINKS'] as const).map((loc) => (
              <button
                key={loc}
                id={`nav-loc-btn-${loc.toLowerCase()}`}
                type="button"
                className={`btn btn-sm ${navLocation === loc ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setNavLocation(loc);
                  fetchNavigation(loc);
                }}
              >
                {loc === 'HEADER' ? 'Header Navbar' : loc === 'FOOTER' ? 'Footer Menu' : 'Quick Links'}
              </button>
            ))}
          </div>

          {navError && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
              <span>{navError}</span>
              <button onClick={() => fetchNavigation(navLocation)} className="btn btn-sm btn-secondary">Retry</button>
            </div>
          )}

          {navLoading && !navError && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading navigation items...</p>
            </div>
          )}

          {!navLoading && !navError && navItems.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                No navigation items defined for location <code>{navLocation}</code>.
              </p>
              <button onClick={handleOpenCreateNavItem} className="btn btn-primary btn-sm">
                Add First Menu Item
              </button>
            </div>
          )}

          {!navLoading && !navError && navItems.length > 0 && (
            <div className="table-container">
              <table className="table" aria-label="Navigation Menu Items">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '80px' }}>Order</th>
                    <th scope="col">Menu Item Label</th>
                    <th scope="col">Destination URL</th>
                    <th scope="col">Target</th>
                    <th scope="col">Status</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {navItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            id={`nav-move-up-${idx}`}
                            onClick={() => handleMoveNavItem(idx, 'up')}
                            disabled={idx === 0}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                            title="Move Up"
                            aria-label={`Move ${item.label} Up`}
                          >
                            &uarr;
                          </button>
                          <button
                            id={`nav-move-down-${idx}`}
                            onClick={() => handleMoveNavItem(idx, 'down')}
                            disabled={idx === navItems.length - 1}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem' }}
                            title="Move Down"
                            aria-label={`Move ${item.label} Down`}
                          >
                            &darr;
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {item.parentId ? (
                            <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem' }}>&#x2514;&#x2500;</span>
                          ) : null}
                          <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{item.label}</strong>
                          {item.parentId ? (
                            <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Submenu</span>
                          ) : null}
                          {item.pageId ? (
                            <span className="badge badge-role" style={{ fontSize: '0.65rem' }}>Linked Page</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.85rem' }}>{item.url}</code>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {item.target === '_blank' ? 'New Window (_blank)' : 'Same Window (_self)'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${item.isVisible ? 'badge-active' : 'badge-secondary'}`}>
                          {item.isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            id={`edit-nav-${item.id}`}
                            onClick={() => handleOpenEditNavItem(item)}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-nav-${item.id}`}
                            onClick={() => handleDeleteNavItem(item)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 6: MEDIA LIBRARY */}
      {activeTab === 'media' && (
        <section aria-labelledby="media-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 id="media-heading" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Media Library & Digital Assets
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                Centralized asset repository supporting WCAG 2.2 AA alternative text compliance, categories, and public vs. access-controlled document distribution.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                id="upload-media-btn"
                onClick={handleOpenCreateMedia}
                className="btn btn-primary btn-sm"
              >
                + Upload Asset
              </button>
              <button
                id="refresh-media-btn"
                onClick={() => fetchMediaAssets(mediaCategoryFilter, mediaSearchQuery)}
                className="btn btn-secondary btn-sm"
                disabled={mediaLoading}
              >
                {mediaLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Category Chips and Search Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="media-category-chips" style={{ marginBottom: 0 }}>
              {(['ALL', 'IMAGE', 'DOCUMENT', 'VIDEO', 'LOGO', 'BANNER'] as const).map((cat) => (
                <button
                  key={cat}
                  id={`media-chip-${cat.toLowerCase()}`}
                  className={`media-chip-btn ${mediaCategoryFilter === cat ? 'active' : ''}`}
                  onClick={() => {
                    setMediaCategoryFilter(cat);
                    fetchMediaAssets(cat, mediaSearchQuery);
                  }}
                >
                  {cat === 'ALL' ? 'All Assets' : cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <label htmlFor="media-search-input" className="sr-only" style={{ display: 'none' }}>Search Media</label>
              <input
                id="media-search-input"
                type="text"
                placeholder="Search by title or filename..."
                value={mediaSearchQuery}
                onChange={(e) => {
                  setMediaSearchQuery(e.target.value);
                  fetchMediaAssets(mediaCategoryFilter, e.target.value);
                }}
                className="input"
                style={{ width: '240px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {mediaError && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
              <span>{mediaError}</span>
              <button onClick={() => fetchMediaAssets(mediaCategoryFilter, mediaSearchQuery)} className="btn btn-sm btn-secondary">Retry</button>
            </div>
          )}

          {mediaLoading && !mediaError && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Loading media assets...</p>
            </div>
          )}

          {!mediaLoading && !mediaError && mediaAssets.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                No assets found matching the selected filter.
              </p>
              <button onClick={handleOpenCreateMedia} className="btn btn-primary btn-sm">
                Upload New Asset
              </button>
            </div>
          )}

          {!mediaLoading && !mediaError && mediaAssets.length > 0 && (
            <div className="media-grid">
              {mediaAssets.map((asset) => {
                const storagePath = asset.storagePath || asset.publicUrl || asset.storageKey || '';
                const isImageLike = ['IMAGE', 'LOGO', 'BANNER'].includes(asset.category);
                const isPrivate = !asset.isPublic || asset.storagePolicy === 'PRIVATE';
                const displayUrl = asset.isPublic
                  ? `${apiBaseUrl}/api/v1/tenant/public/media/${asset.id}/file`
                  : `${apiBaseUrl}/api/v1/tenant/cms/media/${asset.id}/file`;
                const imageSrc = storagePath.startsWith('http') ? storagePath : displayUrl;
                const filename = asset.filename || asset.storageKey?.split('/').pop() || `${asset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${asset.category === 'DOCUMENT' ? 'pdf' : 'jpg'}`;
                const sizeKb = ((asset.fileSizeBytes || asset.fileSize || 0) / 1024).toFixed(0);

                return (
                  <div key={asset.id} className="media-card" id={`media-card-${asset.id}`}>
                    <div className="media-thumbnail-container">
                      {isPrivate ? (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                          <span style={{ fontSize: '2.2rem' }} role="img" aria-label="Restricted Private Asset">🔒</span>
                          <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: 500 }}>
                            Private Document
                          </p>
                        </div>
                      ) : isImageLike ? (
                        <img
                          src={imageSrc}
                          alt={asset.altText || (asset.isDecorative ? '' : asset.title)}
                          className="media-thumbnail"
                          loading="lazy"
                        />
                      ) : (
                        <span className="media-doc-icon" aria-hidden="true">
                          {asset.category === 'DOCUMENT' ? '📄' : '🎥'}
                        </span>
                      )}
                    </div>
                    <div className="media-card-body">
                      <h3 className="media-card-title" title={asset.title}>
                        {asset.title}
                      </h3>
                      <div className="media-card-meta">
                        <span>{filename}</span> &bull; <span>{sizeKb} KB</span>
                      </div>
                      <div className="media-badges">
                        <span className="badge badge-role">{asset.category}</span>
                        <span className={`badge ${isPrivate ? 'badge-danger' : 'badge-active'}`}>
                          {isPrivate ? 'RESTRICTED' : 'PUBLIC'}
                        </span>
                        <span className="badge badge-secondary" title={`Storage policy: ${asset.storagePolicy || (asset.isPublic ? 'PUBLIC' : 'PRIVATE')}`}>
                          {asset.storagePolicy || (asset.isPublic ? 'PUBLIC' : 'PRIVATE')}
                        </span>
                        <span className="badge badge-secondary" title={`Storage provider: ${asset.storageProvider || 'local'}`}>
                          {asset.storageProvider || 'local'}
                        </span>
                        {asset.isDecorative ? (
                          <span className="badge badge-secondary" title="Decorative Asset (Alt text omitted)">Decorative</span>
                        ) : asset.altText ? (
                          <span className="badge badge-active" title={`Alt: "${asset.altText}"`}>Alt Text OK</span>
                        ) : (
                          <span className="badge badge-warning" title="Missing Alt Text">Needs Alt</span>
                        )}
                      </div>
                      <div className="media-card-actions" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
                        <button
                          id={`copy-url-${asset.id}`}
                          onClick={() => {
                            navigator.clipboard?.writeText(displayUrl);
                            setGlobalNotice({ type: 'info', message: `Copied endpoint URL for "${asset.title}" to clipboard.` });
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1 }}
                        >
                          Copy Link
                        </button>
                        <button
                          id={`replace-asset-${asset.id}`}
                          onClick={() => handleOpenReplaceMedia(asset)}
                          className="btn btn-secondary btn-sm"
                          title="Execute safe 2-phase file replacement"
                        >
                          Replace
                        </button>
                        {isPrivate && (
                          <button
                            id={`signed-url-${asset.id}`}
                            onClick={() => handleGenerateSignedUrl(asset)}
                            className="btn btn-secondary btn-sm"
                            title="Generate 15-minute temporary signed download link"
                          >
                            Signed Link
                          </button>
                        )}
                        <a
                          id={`view-asset-${asset.id}`}
                          href={displayUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: 'none' }}
                          title="Open or download asset file"
                        >
                          Open &rarr;
                        </a>
                        <button
                          id={`delete-asset-${asset.id}`}
                          onClick={() => handleDeleteMedia(asset)}
                          className="btn btn-danger btn-sm"
                          aria-label={`Delete ${asset.title}`}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 7: DYNAMIC FORMS BUILDER */}
      {activeTab === 'forms' && (
        <section aria-labelledby="forms-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 id="forms-heading" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Dynamic Form Builder & Institutional Workflows
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                Create configurable enquiry, admissions, and contact forms with custom fields, validation rules, recipient routing, and spam protection.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                id="create-form-btn"
                onClick={() => {
                  setEditingFormId(null);
                  setFormBuilderTitle('');
                  setFormBuilderSlug('');
                  setFormBuilderDesc('');
                  setFormBuilderType('GENERAL_ENQUIRY');
                  setFormBuilderRecipients('admissions@oxford.school.example');
                  setFormBuilderPublished(true);
                  setFormBuilderSuccessMsg('Thank you! Your submission has been received.');
                  setFormBuilderBtnText('Submit Enquiry');
                  setFormBuilderFields([
                    { name: 'fullName', label: 'Full Name', fieldType: 'TEXT', isRequired: true, orderIndex: 0 },
                    { name: 'email', label: 'Email Address', fieldType: 'EMAIL', isRequired: true, orderIndex: 1 },
                    { name: 'message', label: 'Message', fieldType: 'TEXTAREA', isRequired: true, orderIndex: 2 },
                  ]);
                  setFormBuilderRoutingRules([]);
                  setFormModalError(null);
                  setIsFormModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
              >
                + Build New Form
              </button>
              <button
                id="refresh-forms-btn"
                onClick={fetchForms}
                className="btn btn-secondary btn-sm"
                disabled={formsLoading}
              >
                {formsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {formsError && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }} role="alert">
              <strong>Error:</strong> {formsError}
            </div>
          )}

          {formsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading forms...
            </div>
          ) : forms.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#f8fafc' }}>No Forms Configured</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Create your first admissions or general inquiry form to begin receiving submissions.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Form Title</th>
                    <th>Type</th>
                    <th>Slug / Endpoint</th>
                    <th>Fields</th>
                    <th>Submissions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((f) => (
                    <tr key={f.id} id={`form-row-${f.slug}`}>
                      <td style={{ fontWeight: 600 }}>{f.title}</td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                          {f.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                          /forms/{f.slug}
                        </code>
                      </td>
                      <td>{f.fields?.length || 0} fields</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                          {f.submissionsCount ?? 0}
                        </span>
                      </td>
                      <td>
                        {f.isPublished ? (
                          <span className="badge badge-success">Published</span>
                        ) : (
                          <span className="badge badge-warning">Draft</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <a
                            id={`view-public-form-${f.slug}`}
                            href={`/forms/${f.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Public View &rarr;
                          </a>
                          <button
                            id={`edit-form-${f.slug}`}
                            onClick={() => {
                              setEditingFormId(f.id);
                              setFormBuilderTitle(f.title);
                              setFormBuilderSlug(f.slug);
                              setFormBuilderDesc(f.description || '');
                              setFormBuilderType(f.type);
                              setFormBuilderRecipients((f.recipientEmails || []).join(', '));
                              setFormBuilderPublished(f.isPublished);
                              setFormBuilderSuccessMsg(f.successMessage || '');
                              setFormBuilderBtnText(f.submitButtonText || 'Submit');
                              setFormBuilderFields(
                                (f.fields || []).map((field) => ({
                                  name: field.name,
                                  label: field.label,
                                  fieldType: field.fieldType,
                                  placeholder: field.placeholder || '',
                                  helpText: field.helpText || '',
                                  defaultValue: field.defaultValue || '',
                                  isRequired: field.isRequired,
                                  options: field.options || null,
                                  orderIndex: field.orderIndex,
                                }))
                              );
                              setFormBuilderRoutingRules(
                                Array.isArray(f.routingRules)
                                  ? (f.routingRules as FormRoutingRuleItem[]).map((r) => ({
                                      category: r.category,
                                      label: r.label || '',
                                      recipientEmails: Array.isArray(r.recipientEmails) ? r.recipientEmails : [],
                                      isDefault: !!r.isDefault,
                                    }))
                                  : []
                              );
                              setFormModalError(null);
                              setIsFormModalOpen(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-form-${f.slug}`}
                            onClick={async () => {
                              if (!window.confirm(`Are you sure you want to delete form "${f.title}" and its submissions?`)) return;
                              try {
                                const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/forms/${f.id}`, {
                                  method: 'DELETE',
                                  headers: getHeaders(),
                                  credentials: 'include',
                                });
                                if (!res.ok) throw new Error(`Delete failed (Status: ${res.status})`);
                                setGlobalNotice({ type: 'success', message: `Form "${f.title}" deleted.` });
                                fetchForms();
                              } catch (err: any) {
                                setGlobalNotice({ type: 'error', message: err.message || 'Failed to delete form' });
                              }
                            }}
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 8: ADMISSIONS & SUBMISSIONS REVIEW */}
      {activeTab === 'submissions' && (
        <section aria-labelledby="submissions-heading">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 id="submissions-heading" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Form Submissions & Admissions Review
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                Review incoming enquiries and admissions applications, transition review statuses, and record reviewer decisions.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                id="refresh-submissions-btn"
                onClick={() => fetchSubmissions(submissionStatusFilter, submissionSearchQuery)}
                className="btn btn-secondary btn-sm"
                disabled={submissionsLoading}
              >
                {submissionsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Status Filters and Search Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="media-category-chips" style={{ marginBottom: 0 }}>
              {(['ALL', 'PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'ARCHIVED'] as const).map((status) => (
                <button
                  key={status}
                  id={`sub-filter-${status.toLowerCase()}`}
                  className={`media-chip-btn ${submissionStatusFilter === status ? 'active' : ''}`}
                  onClick={() => {
                    setSubmissionStatusFilter(status);
                    fetchSubmissions(status, submissionSearchQuery);
                  }}
                >
                  {status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                id="sub-search-input"
                type="text"
                placeholder="Search submitter / notes..."
                value={submissionSearchQuery}
                onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchSubmissions(submissionStatusFilter, submissionSearchQuery);
                  }
                }}
                className="form-input"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: '220px' }}
              />
              <button
                id="sub-search-btn"
                onClick={() => fetchSubmissions(submissionStatusFilter, submissionSearchQuery)}
                className="btn btn-secondary btn-sm"
              >
                Search
              </button>
            </div>
          </div>

          {submissionsError && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }} role="alert">
              <strong>Error:</strong> {submissionsError}
            </div>
          )}

          {submissionsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#f8fafc' }}>No Submissions Found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                There are no form submissions matching the current filter criteria.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Submitter</th>
                    <th>Form &amp; Category</th>
                    <th>Status</th>
                    <th>Delivery</th>
                    <th>Submitted Date</th>
                    <th>Reviewer</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} id={`sub-row-${sub.id}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sub.submitterName || 'Anonymous Submitter'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub.submitterEmail || 'No email provided'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{sub.formTitle || 'General Form'}</div>
                        {sub.category && (
                          <span className="badge badge-info" style={{ fontSize: '0.7rem', marginTop: '0.2rem', display: 'inline-block' }}>
                            {sub.category}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            sub.status === 'ACCEPTED'
                              ? 'badge-success'
                              : sub.status === 'REJECTED'
                              ? 'badge-danger'
                              : sub.status === 'UNDER_REVIEW'
                              ? 'badge-info'
                              : 'badge-warning'
                          }`}
                        >
                          {sub.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            sub.deliveryStatus === 'DELIVERED'
                              ? 'badge-success'
                              : sub.deliveryStatus === 'SIMULATED'
                              ? 'badge-info'
                              : sub.deliveryStatus === 'FAILED'
                              ? 'badge-danger'
                              : 'badge-secondary'
                          }`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {sub.deliveryStatus || 'PENDING'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {sub.reviewerName || 'Unreviewed'}
                      </td>
                      <td>
                        <button
                          id={`review-sub-${sub.id}`}
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setReviewStatus(sub.status);
                            setReviewNotes(sub.adminNotes || '');
                            setReviewModalError(null);
                            setIsSubmissionModalOpen(true);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        >
                          Review &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB: ACADEMIC CATALOGUE */}
      {activeTab === 'academics' && (
        <AcademicAdminView
          apiBaseUrl={apiBaseUrl}
          tenantSlug={tenantSlug}
          getHeaders={getHeaders}
          setGlobalNotice={setGlobalNotice}
        />
      )}

      {/* TAB: STAFF DIRECTORY & PROFILES */}
      {activeTab === 'staff' && (
        <StaffAdminView
          apiBaseUrl={apiBaseUrl}
          tenantSlug={tenantSlug}
          getHeaders={getHeaders}
          setGlobalNotice={setGlobalNotice}
        />
      )}

      {/* TAB: EDITORIAL NEWS */}
      {activeTab === 'news' && (
        <NewsAdminView
          apiBaseUrl={apiBaseUrl}
          tenantSlug={tenantSlug}
          getHeaders={getHeaders}
          setGlobalNotice={setGlobalNotice}
        />
      )}

      {/* TAB: OPERATIONAL ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <AnnouncementAdminView
          apiBaseUrl={apiBaseUrl}
          tenantSlug={tenantSlug}
          getHeaders={getHeaders}
          setGlobalNotice={setGlobalNotice}
        />
      )}

      {/* TAB: EVENTS CALENDAR */}
      {activeTab === 'events' && (
        <EventAdminView
          apiBaseUrl={apiBaseUrl}
          tenantSlug={tenantSlug}
          getHeaders={getHeaders}
          setGlobalNotice={setGlobalNotice}
        />
      )}

      {/* CMS PAGE EDITOR MODAL */}
      {isPageEditorOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="editor-modal-title">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="editor-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                {editingPageId ? 'Edit CMS Page' : 'Create New CMS Page Draft'}
              </h2>
              <button
                onClick={() => setIsPageEditorOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close editor"
              >
                &times;
              </button>
            </div>

            {pageFormError && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
                <span>{pageFormError}</span>
              </div>
            )}

            <form onSubmit={handleSavePage} noValidate>
              <div className="grid" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="page-title-input" className="form-label">
                    Page Title *
                  </label>
                  <input
                    id="page-title-input"
                    type="text"
                    value={formTitle}
                    onChange={(e) => {
                      setFormTitle(e.target.value);
                      if (!editingPageId && !formSlug) {
                        setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    className="input"
                    placeholder="e.g. Academic Programmes"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="page-slug-input" className="form-label">
                    URL Slug * (lowercase, hyphens)
                  </label>
                  <input
                    id="page-slug-input"
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase())}
                    className="input"
                    placeholder="e.g. academic-programmes"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="page-summary-input" className="form-label">
                  Page Summary / Excerpt
                </label>
                <textarea
                  id="page-summary-input"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="textarea"
                  rows={2}
                  placeholder="Brief summary for listings and preview snippets..."
                />
              </div>

              {/* SEO Metadata Accordion / Fields */}
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>
                  SEO & Search Engine Metadata
                </h3>
                <div className="grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="page-seo-title-input" className="form-label">
                      SEO Title Tag
                    </label>
                    <input
                      id="page-seo-title-input"
                      type="text"
                      value={formSeoTitle}
                      onChange={(e) => setFormSeoTitle(e.target.value)}
                      className="input"
                      placeholder="e.g. Academic Programmes | Oxford International"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="page-seo-description-input" className="form-label">
                      SEO Meta Description
                    </label>
                    <input
                      id="page-seo-description-input"
                      type="text"
                      value={formSeoDescription}
                      onChange={(e) => setFormSeoDescription(e.target.value)}
                      className="input"
                      placeholder="Compelling search result description (max 160 chars)"
                    />
                  </div>
                </div>
              </div>

              {/* Sections Builder */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', color: '#f8fafc' }}>
                    Structured Content Sections ({formSections.length})
                  </h3>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      id="add-hero-btn"
                      onClick={() => handleAddSection('HERO')}
                      className="btn btn-secondary btn-sm"
                    >
                      + Hero
                    </button>
                    <button
                      type="button"
                      id="add-text-btn"
                      onClick={() => handleAddSection('TEXT_CONTENT')}
                      className="btn btn-secondary btn-sm"
                    >
                      + Text
                    </button>
                    <button
                      type="button"
                      id="add-image-btn"
                      onClick={() => handleAddSection('IMAGE_MEDIA')}
                      className="btn btn-secondary btn-sm"
                    >
                      + Image
                    </button>
                    <button
                      type="button"
                      id="add-features-btn"
                      onClick={() => handleAddSection('FEATURE_GRID')}
                      className="btn btn-secondary btn-sm"
                    >
                      + Feature Grid
                    </button>
                    <button
                      type="button"
                      id="add-accordion-btn"
                      onClick={() => handleAddSection('ACCORDION')}
                      className="btn btn-secondary btn-sm"
                    >
                      + Accordion
                    </button>
                    <button
                      type="button"
                      id="add-cta-btn"
                      onClick={() => handleAddSection('CTA_BANNER')}
                      className="btn btn-secondary btn-sm"
                    >
                      + CTA Banner
                    </button>
                    <button
                      type="button"
                      id="add-stats-btn"
                      onClick={() => handleAddSection('STATS_COUNTER')}
                      className="btn btn-secondary btn-sm"
                    >
                      + Stats
                    </button>
                    <button
                      type="button"
                      id="add-testimonials-btn"
                      onClick={() => handleAddSection('TESTIMONIALS')}
                      className="btn btn-secondary btn-sm"
                    >
                      + Testimonials
                    </button>
                    <button
                      type="button"
                      id="insert-reusable-section-btn"
                      onClick={() => {
                        fetchReusableSections();
                        setIsInsertSectionModalOpen(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: '#7c3aed', borderColor: '#6d28d9' }}
                    >
                      + Insert Reusable Section
                    </button>
                  </div>
                </div>

                {formSections.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem', border: '1px dashed var(--border-subtle)', borderRadius: '6px', textAlign: 'center' }}>
                    No content sections added yet. Click an option above to add an allowlisted section.
                  </p>
                )}

                {formSections.map((sec, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: sec.reusableSectionId ? 'rgba(124, 58, 237, 0.08)' : 'rgba(30, 41, 59, 0.6)',
                      border: sec.reusableSectionId ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {sec.reusableSectionId ? (
                          <span className="badge badge-reusable">
                            Reusable: {sec.reusableSection?.name || 'Synced Section'}
                          </span>
                        ) : (
                          <span className="badge badge-inline" style={{ textTransform: 'uppercase' }}>
                            Inline {sec.sectionType} #{idx + 1}
                          </span>
                        )}
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={sec.isVisible}
                            onChange={() => handleToggleSectionVisibility(idx)}
                          />
                          Visible
                        </label>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleMoveSection(idx, 'up')}
                          disabled={idx === 0}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.15rem 0.5rem', opacity: idx === 0 ? 0.4 : 1 }}
                          aria-label={`Move section ${idx + 1} up`}
                          title="Move section up"
                        >
                          &uarr; Up
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSection(idx, 'down')}
                          disabled={idx === formSections.length - 1}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.15rem 0.5rem', opacity: idx === formSections.length - 1 ? 0.4 : 1 }}
                          aria-label={`Move section ${idx + 1} down`}
                          title="Move section down"
                        >
                          &darr; Down
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(idx)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.15rem 0.5rem' }}
                          aria-label={`Remove section ${idx + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {sec.reusableSectionId ? (
                      <div style={{ padding: '0.85rem 1rem', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '6px', fontSize: '0.88rem', color: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <strong>Centralized Reusable Section:</strong> <code>{sec.reusableSection?.slug || sec.reusableSectionId}</code>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                              Type: {sec.sectionType} &bull; Category: {sec.reusableSection?.category || 'General'} &bull; Synchronized layout
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPageEditorOpen(false);
                              setActiveTab('sections');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                          >
                            Edit in Library &rarr;
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {sec.sectionType === 'HERO' && (
                          <div className="grid">
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label htmlFor={`hero-headline-${idx}`} className="form-label">Headline *</label>
                              <input
                                id={`hero-headline-${idx}`}
                                type="text"
                                value={sec.config.headline || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'headline', e.target.value)}
                                className="input"
                                required
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label htmlFor={`hero-subheadline-${idx}`} className="form-label">Subheadline</label>
                              <input
                                id={`hero-subheadline-${idx}`}
                                type="text"
                                value={sec.config.subheadline || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'subheadline', e.target.value)}
                                className="input"
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label htmlFor={`hero-cta-text-${idx}`} className="form-label">CTA Button Label</label>
                              <input
                                id={`hero-cta-text-${idx}`}
                                type="text"
                                value={sec.config.ctaText || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'ctaText', e.target.value)}
                                className="input"
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label htmlFor={`hero-cta-link-${idx}`} className="form-label">CTA Destination URL</label>
                              <input
                                id={`hero-cta-link-${idx}`}
                                type="text"
                                value={sec.config.ctaLink || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'ctaLink', e.target.value)}
                                className="input"
                              />
                            </div>
                          </div>
                        )}

                        {sec.sectionType === 'TEXT_CONTENT' && (
                          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                            <label htmlFor={`text-body-${idx}`} className="form-label">Content Body *</label>
                            <textarea
                              id={`text-body-${idx}`}
                              value={sec.config.body || ''}
                              onChange={(e) => handleUpdateSectionConfig(idx, 'body', e.target.value)}
                              className="textarea"
                              rows={4}
                              required
                            />
                          </div>
                        )}

                        {sec.sectionType === 'IMAGE_MEDIA' && (
                          <div className="grid">
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label htmlFor={`image-url-${idx}`} className="form-label">Image URL *</label>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                  id={`image-url-${idx}`}
                                  type="text"
                                  value={sec.config.imageUrl || ''}
                                  onChange={(e) => handleUpdateSectionConfig(idx, 'imageUrl', e.target.value)}
                                  className="input"
                                  placeholder="https://..."
                                  required
                                />
                                <button
                                  id={`choose-media-btn-${idx}`}
                                  type="button"
                                  onClick={() => {
                                    setTargetSectionIndex(idx);
                                    fetchMediaAssets();
                                    setIsMediaPickerOpen(true);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ whiteSpace: 'nowrap' }}
                                >
                                  Browse Media
                                </button>
                              </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label htmlFor={`image-alt-${idx}`} className="form-label">Accessible Alt Text * (WCAG 2.2 AA)</label>
                              <input
                                id={`image-alt-${idx}`}
                                type="text"
                                value={sec.config.altText || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'altText', e.target.value)}
                                className="input"
                                placeholder="Describe image purpose"
                                required
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label htmlFor={`image-caption-${idx}`} className="form-label">Caption (Optional)</label>
                              <input
                                id={`image-caption-${idx}`}
                                type="text"
                                value={sec.config.caption || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'caption', e.target.value)}
                                className="input"
                              />
                            </div>
                          </div>
                        )}

                        {sec.sectionType === 'FEATURE_GRID' && (
                          <div>
                            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                              <label className="form-label">Section Heading</label>
                              <input
                                type="text"
                                value={sec.config.title || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'title', e.target.value)}
                                className="input"
                              />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {sec.config.items?.length || 0} features configured.
                            </p>
                          </div>
                        )}

                        {sec.sectionType === 'ACCORDION' && (
                          <div className="grid">
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Accordion Title *</label>
                              <input
                                type="text"
                                value={sec.config.title || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'title', e.target.value)}
                                className="input"
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Subtitle</label>
                              <input
                                type="text"
                                value={sec.config.subtitle || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'subtitle', e.target.value)}
                                className="input"
                              />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                              {sec.config.items?.length || 0} accordion items configured.
                            </p>
                          </div>
                        )}

                        {sec.sectionType === 'CTA_BANNER' && (
                          <div className="grid">
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Headline *</label>
                              <input
                                type="text"
                                value={sec.config.headline || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'headline', e.target.value)}
                                className="input"
                                required
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Subheadline</label>
                              <input
                                type="text"
                                value={sec.config.subheadline || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'subheadline', e.target.value)}
                                className="input"
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Primary Button Text</label>
                              <input
                                type="text"
                                value={sec.config.primaryButtonText || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'primaryButtonText', e.target.value)}
                                className="input"
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Primary Button URL</label>
                              <input
                                type="text"
                                value={sec.config.primaryButtonUrl || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'primaryButtonUrl', e.target.value)}
                                className="input"
                              />
                            </div>
                          </div>
                        )}

                        {sec.sectionType === 'STATS_COUNTER' && (
                          <div className="grid">
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Section Title</label>
                              <input
                                type="text"
                                value={sec.config.title || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'title', e.target.value)}
                                className="input"
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Subtitle</label>
                              <input
                                type="text"
                                value={sec.config.subtitle || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'subtitle', e.target.value)}
                                className="input"
                              />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                              {sec.config.items?.length || 0} stats counters configured.
                            </p>
                          </div>
                        )}

                        {sec.sectionType === 'TESTIMONIALS' && (
                          <div className="grid">
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Section Title</label>
                              <input
                                type="text"
                                value={sec.config.title || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'title', e.target.value)}
                                className="input"
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                              <label className="form-label">Subtitle</label>
                              <input
                                type="text"
                                value={sec.config.subtitle || ''}
                                onChange={(e) => handleUpdateSectionConfig(idx, 'subtitle', e.target.value)}
                                className="input"
                              />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', gridColumn: '1 / -1' }}>
                              {sec.config.items?.length || 0} testimonials configured.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPageEditorOpen(false)}
                  className="btn btn-secondary"
                  disabled={pageSaving}
                >
                  Cancel
                </button>
                <button
                  id="save-draft-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={pageSaving}
                >
                  {pageSaving ? 'Saving...' : editingPageId ? 'Update Page' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGATION ITEM MODAL */}
      {isNavModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="nav-modal-title">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2 id="nav-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                {editingNavItem ? 'Edit Navigation Item' : `Add ${navLocation} Menu Item`}
              </h2>
              <button
                onClick={() => setIsNavModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {navModalError && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
                <span>{navModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNavItem} noValidate>
              <div className="form-group">
                <label htmlFor="nav-item-label" className="form-label">
                  Menu Label *
                </label>
                <input
                  id="nav-item-label"
                  type="text"
                  value={navItemLabel}
                  onChange={(e) => setNavItemLabel(e.target.value)}
                  className="input"
                  placeholder="e.g. Undergraduate Admissions"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="nav-item-url" className="form-label">
                  Destination URL *
                </label>
                <input
                  id="nav-item-url"
                  type="text"
                  value={navItemUrl}
                  onChange={(e) => setNavItemUrl(e.target.value)}
                  className="input"
                  placeholder="e.g. /admissions or https://..."
                  required
                />
              </div>

              <div className="grid">
                <div className="form-group">
                  <label htmlFor="nav-item-target" className="form-label">
                    Target Window
                  </label>
                  <select
                    id="nav-item-target"
                    value={navItemTarget}
                    onChange={(e) => setNavItemTarget(e.target.value as '_self' | '_blank')}
                    className="select"
                  >
                    <option value="_self">Same Window (_self)</option>
                    <option value="_blank">New Window (_blank)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="nav-item-parent" className="form-label">
                    Parent Item (Submenu)
                  </label>
                  <select
                    id="nav-item-parent"
                    value={navItemParentId}
                    onChange={(e) => setNavItemParentId(e.target.value)}
                    className="select"
                  >
                    <option value="">None (Top-Level Item)</option>
                    {navItems
                      .filter((i) => !editingNavItem || i.id !== editingNavItem.id)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="nav-item-page" className="form-label">
                  Optionally Link to Existing Page
                </label>
                <select
                  id="nav-item-page"
                  value={navItemPageId}
                  onChange={(e) => {
                    const selPageId = e.target.value;
                    setNavItemPageId(selPageId);
                    if (selPageId) {
                      const matched = pages.find((p) => p.id === selPageId);
                      if (matched) {
                        setNavItemUrl(`/${matched.slug}`);
                        if (!navItemLabel) setNavItemLabel(matched.title);
                      }
                    }
                  }}
                  className="select"
                >
                  <option value="">Custom URL (Not linked to CMS Page)</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (/{p.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  id="nav-item-visible"
                  type="checkbox"
                  checked={navItemIsVisible}
                  onChange={(e) => setNavItemIsVisible(e.target.checked)}
                />
                <label htmlFor="nav-item-visible" style={{ color: '#f8fafc', fontSize: '0.9rem', cursor: 'pointer' }}>
                  Visible in public navigation
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsNavModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={navSaving}
                >
                  Cancel
                </button>
                <button
                  id="save-nav-item-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={navSaving}
                >
                  {navSaving ? 'Saving...' : editingNavItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA UPLOAD MODAL */}
      {isMediaModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="media-modal-title">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h2 id="media-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Upload Digital Media Asset
              </h2>
              <button
                onClick={() => setIsMediaModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {mediaModalError && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
                <span>{mediaModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMedia} noValidate>
              <div className="grid">
                <div className="form-group">
                  <label htmlFor="media-title-input" className="form-label">
                    Asset Title *
                  </label>
                  <input
                    id="media-title-input"
                    type="text"
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    className="input"
                    placeholder="e.g. Campus Aerial View"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="media-category-select" className="form-label">
                    Category *
                  </label>
                  <select
                    id="media-category-select"
                    value={mediaCategory}
                    onChange={(e) => setMediaCategory(e.target.value as any)}
                    className="select"
                  >
                    <option value="IMAGE">Image</option>
                    <option value="DOCUMENT">Document / PDF</option>
                    <option value="VIDEO">Video</option>
                    <option value="LOGO">Institutional Logo</option>
                    <option value="BANNER">Hero Banner</option>
                  </select>
                </div>
              </div>

              {/* Alt Text Accessibility Section (WCAG 2.2 AA) */}
              {['IMAGE', 'LOGO', 'BANNER'].includes(mediaCategory) && (
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="media-alt-input" className="form-label" style={{ marginBottom: 0 }}>
                      Accessible Alternative Text {mediaIsDecorative ? '(Omitted)' : '*'}
                    </label>
                    <span className="badge badge-active" style={{ fontSize: '0.68rem' }}>WCAG 2.2 AA Mandatory</span>
                  </div>
                  <input
                    id="media-alt-input"
                    type="text"
                    value={mediaAltText}
                    onChange={(e) => setMediaAltText(e.target.value)}
                    className="input"
                    placeholder="Describe asset contents for screen-reader users..."
                    disabled={mediaIsDecorative}
                    required={!mediaIsDecorative}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      id="media-decorative-check"
                      type="checkbox"
                      checked={mediaIsDecorative}
                      onChange={(e) => {
                        setMediaIsDecorative(e.target.checked);
                        if (e.target.checked) setMediaAltText('');
                      }}
                    />
                    <label htmlFor="media-decorative-check" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer' }}>
                      Mark as purely decorative (decorative elements omit alt text per WCAG 2.2 guideline 1.1.1)
                    </label>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-subtle)', marginBottom: '1.25rem' }}>
                <label htmlFor="media-file-input" className="form-label" style={{ fontWeight: 600 }}>
                  Select File from Computer (Up to 10MB)
                </label>
                <input
                  id="media-file-input"
                  type="file"
                  onChange={handleFileSelection}
                  className="input"
                  style={{ padding: '0.4rem' }}
                />
                {mediaFileName ? (
                  <p style={{ color: '#10b981', fontSize: '0.82rem', marginTop: '0.4rem', fontWeight: 500 }}>
                    ✓ Ready to upload: {mediaFileName} ({((mediaFileBytes || 0) / 1024).toFixed(1)} KB &bull; {mediaFileMime})
                  </p>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                    Supported formats: JPEG, PNG, WebP, GIF, SVG, PDF, DOC, DOCX, MP4, WebM.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="media-url-input" className="form-label">
                  Remote Storage URL / Key (Optional if file is selected)
                </label>
                <input
                  id="media-url-input"
                  type="text"
                  value={mediaStorageUrl}
                  onChange={(e) => setMediaStorageUrl(e.target.value)}
                  className="input"
                  placeholder="https://... or leave empty for local upload"
                />
              </div>

              <div className="form-group">
                <label htmlFor="media-caption-input" className="form-label">
                  Caption / Description (Optional)
                </label>
                <input
                  id="media-caption-input"
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  className="input"
                  placeholder="Additional context displayed beneath media..."
                />
              </div>

              {/* Public vs. Restricted Policy Selector */}
              <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                  Storage Policy & Access Boundary *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.88rem' }}>
                    <input
                      type="radio"
                      name="mediaStoragePolicy"
                      value="PUBLIC"
                      checked={mediaStoragePolicy === 'PUBLIC'}
                      onChange={() => {
                        setMediaStoragePolicy('PUBLIC');
                        setMediaIsPublic(true);
                      }}
                    />
                    <span><strong>Public Media Asset:</strong> Saved to public storage. Publicly viewable on web pages without login.</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#f8fafc', fontSize: '0.88rem' }}>
                    <input
                      type="radio"
                      name="mediaStoragePolicy"
                      value="PRIVATE"
                      checked={mediaStoragePolicy === 'PRIVATE'}
                      onChange={() => {
                        setMediaStoragePolicy('PRIVATE');
                        setMediaIsPublic(false);
                      }}
                    />
                    <span><strong>Private Document:</strong> Saved to isolated private storage. Inaccessible to anonymous visitors (returns 404). Requires authenticated staff credentials or signed download token.</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={mediaSaving}
                >
                  Cancel
                </button>
                <button
                  id="submit-media-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={mediaSaving}
                >
                  {mediaSaving ? 'Saving...' : 'Upload Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILE REPLACEMENT MODAL (Day 11 2-Phase Safe Replacement) */}
      {isReplaceModalOpen && replacingAsset && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="replace-modal-title">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h2 id="replace-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Replace Asset File — 2-Phase Safe Swap
              </h2>
              <button
                onClick={() => setIsReplaceModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {replaceModalError && (
              <div className="alert alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
                <span>{replaceModalError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteReplaceMedia}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: 0 }}>
                  Replacing file for: <strong>{replacingAsset.title}</strong>
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: 0 }}>
                  Policy: <code>{replacingAsset.storagePolicy || (replacingAsset.isPublic ? 'PUBLIC' : 'PRIVATE')}</code> &bull; MIME: <code>{replacingAsset.mimeType}</code>
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="replace-file-input" className="form-label" style={{ fontWeight: 600 }}>
                  Choose Replacement File *
                </label>
                <input
                  id="replace-file-input"
                  type="file"
                  onChange={handleReplaceFileSelection}
                  className="input"
                  required
                />
                {replaceFileName && (
                  <p style={{ color: '#10b981', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                    Selected replacement: {replaceFileName} ({replaceFileMime})
                  </p>
                )}
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                  The existing file is safely preserved until the new file is verified, uploaded, and the database record is updated.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsReplaceModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={replaceSaving}
                >
                  Cancel
                </button>
                <button
                  id="submit-replace-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={replaceSaving || !replaceFileBase64}
                >
                  {replaceSaving ? 'Replacing...' : 'Confirm Safe Replacement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA PICKER MODAL (For CMS Section Editor) */}
      {isMediaPickerOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="media-picker-title">
          <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '85vh' }}>
            <div className="modal-header">
              <h2 id="media-picker-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Choose Media for Section
              </h2>
              <button
                onClick={() => setIsMediaPickerOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Select an asset from the media library to populate the section image and accessibility alt text.
              </p>
            </div>

            {mediaAssets.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No media assets available.</p>
              </div>
            ) : (
              <div className="media-grid" style={{ maxHeight: '55vh', overflowY: 'auto', padding: '0.5rem' }}>
                {mediaAssets.map((asset) => {
                  const storagePath = asset.storagePath || asset.publicUrl || asset.storageKey || '';
                  const displayUrl = asset.isPublic
                    ? `${apiBaseUrl}/api/v1/tenant/public/media/${asset.id}/file`
                    : `${apiBaseUrl}/api/v1/tenant/cms/media/${asset.id}/file`;
                  const imageSrc = storagePath.startsWith('http') ? storagePath : displayUrl;

                  return (
                    <div
                      key={asset.id}
                      id={`picker-asset-${asset.id}`}
                      onClick={() => handleSelectMediaForSection(asset)}
                      className="media-card"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="media-thumbnail-container" style={{ height: '120px' }}>
                        {['IMAGE', 'LOGO', 'BANNER'].includes(asset.category) ? (
                          <img
                            src={imageSrc}
                            alt={asset.altText || ''}
                            className="media-thumbnail"
                          />
                        ) : (
                          <span className="media-doc-icon">📄</span>
                        )}
                      </div>
                    <div className="media-card-body" style={{ padding: '0.75rem' }}>
                      <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{asset.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '0.25rem' }}>
                        Click to Select &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAY 7: FORM BUILDER MODAL */}
      {isFormModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 id="form-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                {editingFormId ? 'Edit Dynamic Form Configuration' : 'Create New Dynamic Form'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close form builder"
              >
                &times;
              </button>
            </div>

            {formModalError && (
              <div className="alert alert-danger" style={{ margin: '1rem' }} role="alert">
                <strong>Error: </strong> {formModalError}
              </div>
            )}

            <form
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                setFormModalError(null);
                if (!formBuilderTitle.trim() || !formBuilderSlug.trim()) {
                  setFormModalError('Form title and slug are required.');
                  return;
                }

                setFormSaving(true);
                try {
                  const recipients = formBuilderRecipients
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);

                  const payload = {
                    title: formBuilderTitle.trim(),
                    slug: formBuilderSlug.trim().toLowerCase(),
                    description: formBuilderDesc.trim() || null,
                    type: formBuilderType,
                    recipientEmails: recipients,
                    routingRules:
                      formBuilderRoutingRules.length > 0
                        ? formBuilderRoutingRules
                            .filter((r) => r.category.trim().length > 0 && r.recipientEmails.length > 0)
                            .map((r) => ({
                              category: r.category.trim().toUpperCase(),
                              label: r.label?.trim() || undefined,
                              recipientEmails: r.recipientEmails.map((e) => e.trim()).filter(Boolean),
                              isDefault: !!r.isDefault,
                            }))
                        : undefined,
                    isPublished: formBuilderPublished,
                    successMessage: formBuilderSuccessMsg.trim() || null,
                    submitButtonText: formBuilderBtnText.trim() || 'Submit',
                    fields: formBuilderFields.map((f, idx) => ({
                      name: f.name.trim(),
                      label: f.label.trim(),
                      fieldType: f.fieldType,
                      placeholder: f.placeholder?.trim() || null,
                      helpText: f.helpText?.trim() || null,
                      defaultValue: f.defaultValue?.trim() || null,
                      isRequired: f.isRequired,
                      options: f.options || null,
                      orderIndex: idx,
                    })),
                  };

                  const url = editingFormId
                    ? `${apiBaseUrl}/api/v1/tenant/cms/forms/${editingFormId}`
                    : `${apiBaseUrl}/api/v1/tenant/cms/forms`;
                  const method = editingFormId ? 'PUT' : 'POST';

                  const res = await fetch(url, {
                    method,
                    headers: getHeaders(),
                    credentials: 'include',
                    body: JSON.stringify(payload),
                  });

                  const json = await res.json();
                  if (!res.ok || !json.success) {
                    throw new Error(json.error?.message || 'Failed to save form');
                  }

                  setGlobalNotice({
                    type: 'success',
                    message: `Form "${formBuilderTitle}" saved successfully.`,
                  });
                  setIsFormModalOpen(false);
                  fetchForms();
                } catch (err: any) {
                  setFormModalError(err.message || 'Error saving form');
                } finally {
                  setFormSaving(false);
                }
              }}
              style={{ padding: '1.25rem' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="form-builder-title" style={{ fontWeight: 600 }}>Form Title *</label>
                  <input
                    id="form-builder-title"
                    type="text"
                    value={formBuilderTitle}
                    onChange={(e) => {
                      setFormBuilderTitle(e.target.value);
                      if (!editingFormId) {
                        setFormBuilderSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)+/g, '')
                        );
                      }
                    }}
                    placeholder="e.g. Admissions Inquiry"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-builder-slug" style={{ fontWeight: 600 }}>Slug *</label>
                  <input
                    id="form-builder-slug"
                    type="text"
                    value={formBuilderSlug}
                    onChange={(e) => setFormBuilderSlug(e.target.value)}
                    placeholder="e.g. admissions-inquiry"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-builder-type" style={{ fontWeight: 600 }}>Form Type</label>
                  <select
                    id="form-builder-type"
                    value={formBuilderType}
                    onChange={(e) => setFormBuilderType(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="GENERAL_ENQUIRY">General Enquiry</option>
                    <option value="ADMISSIONS_INQUIRY">Admissions Inquiry</option>
                    <option value="CONTACT_US">Contact Us</option>
                    <option value="APPLICATION">Application Form</option>
                    <option value="FEEDBACK">Feedback</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="form-builder-recipients" style={{ fontWeight: 600 }}>Recipient Emails (comma separated)</label>
                  <input
                    id="form-builder-recipients"
                    type="text"
                    value={formBuilderRecipients}
                    onChange={(e) => setFormBuilderRecipients(e.target.value)}
                    placeholder="admissions@school.edu, info@school.edu"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="form-builder-desc" style={{ fontWeight: 600 }}>Form Description</label>
                <textarea
                  id="form-builder-desc"
                  rows={2}
                  value={formBuilderDesc}
                  onChange={(e) => setFormBuilderDesc(e.target.value)}
                  placeholder="Introductory instructions displayed above fields..."
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label htmlFor="form-builder-btn-text" style={{ fontWeight: 600 }}>Submit Button Text</label>
                  <input
                    id="form-builder-btn-text"
                    type="text"
                    value={formBuilderBtnText}
                    onChange={(e) => setFormBuilderBtnText(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="form-builder-success-msg" style={{ fontWeight: 600 }}>Success Message</label>
                  <input
                    id="form-builder-success-msg"
                    type="text"
                    value={formBuilderSuccessMsg}
                    onChange={(e) => setFormBuilderSuccessMsg(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <input
                    id="form-builder-published"
                    type="checkbox"
                    checked={formBuilderPublished}
                    onChange={(e) => setFormBuilderPublished(e.target.checked)}
                  />
                  <label htmlFor="form-builder-published" style={{ fontWeight: 600, cursor: 'pointer' }}>
                    Publish Form (Open for submissions)
                  </label>
                </div>
              </div>

              {/* Day 13 Department & Category Recipient Routing */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                      Department &amp; Category Routing Rules ({formBuilderRoutingRules.length})
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      Route enquiries directly to admissions, finance, or department mailboxes without exposing recipient addresses to the public.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="add-routing-rule-btn"
                    onClick={() => {
                      setFormBuilderRoutingRules([
                        ...formBuilderRoutingRules,
                        {
                          category: 'GENERAL',
                          label: 'General Inquiries',
                          recipientEmails: ['info@school.edu'],
                          isDefault: formBuilderRoutingRules.length === 0,
                        },
                      ]);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    + Add Routing Rule
                  </button>
                </div>

                {formBuilderRoutingRules.length === 0 ? (
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    No category routing rules configured. All enquiries will route to the general recipient emails above.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {formBuilderRoutingRules.map((rule, rIdx) => (
                      <div
                        key={rIdx}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr)) auto 36px',
                          gap: '0.75rem',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category Key *</label>
                          <input
                            type="text"
                            value={rule.category}
                            placeholder="e.g. ADMISSIONS"
                            onChange={(e) => {
                              const next = [...formBuilderRoutingRules];
                              next[rIdx].category = e.target.value.toUpperCase();
                              setFormBuilderRoutingRules(next);
                            }}
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Display Label</label>
                          <input
                            type="text"
                            value={rule.label || ''}
                            placeholder="e.g. Admissions Office"
                            onChange={(e) => {
                              const next = [...formBuilderRoutingRules];
                              next[rIdx].label = e.target.value;
                              setFormBuilderRoutingRules(next);
                            }}
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Emails (comma separated) *</label>
                          <input
                            type="text"
                            value={rule.recipientEmails.join(', ')}
                            placeholder="admissions@school.edu"
                            onChange={(e) => {
                              const next = [...formBuilderRoutingRules];
                              next[rIdx].recipientEmails = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                              setFormBuilderRoutingRules(next);
                            }}
                            className="form-input"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                            required
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Default</label>
                          <input
                            type="checkbox"
                            checked={!!rule.isDefault}
                            onChange={(e) => {
                              const next = formBuilderRoutingRules.map((item, idx) => ({
                                ...item,
                                isDefault: idx === rIdx ? e.target.checked : false,
                              }));
                              setFormBuilderRoutingRules(next);
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormBuilderRoutingRules(formBuilderRoutingRules.filter((_, idx) => idx !== rIdx));
                          }}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Delete Routing Rule"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Field Builder Rows */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                    Form Fields ({formBuilderFields.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setFormBuilderFields([
                        ...formBuilderFields,
                        {
                          name: `field_${Date.now()}`,
                          label: 'New Question',
                          fieldType: 'TEXT',
                          isRequired: false,
                          orderIndex: formBuilderFields.length,
                        },
                      ]);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    + Add Field
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {formBuilderFields.map((field, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 40px',
                        gap: '0.75rem',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Field Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const updated = [...formBuilderFields];
                            updated[idx].label = e.target.value;
                            if (!field.name || field.name.startsWith('field_')) {
                              updated[idx].name = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '_')
                                .replace(/(^_|_$)+/g, '');
                            }
                            setFormBuilderFields(updated);
                          }}
                          className="form-input"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Identifier (key)</label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const updated = [...formBuilderFields];
                            updated[idx].name = e.target.value;
                            setFormBuilderFields(updated);
                          }}
                          className="form-input"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Field Type</label>
                        <select
                          value={field.fieldType}
                          onChange={(e) => {
                            const updated = [...formBuilderFields];
                            updated[idx].fieldType = e.target.value as any;
                            setFormBuilderFields(updated);
                          }}
                          className="form-select"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                        >
                          <option value="TEXT">Text</option>
                          <option value="TEXTAREA">Textarea</option>
                          <option value="EMAIL">Email</option>
                          <option value="PHONE">Phone</option>
                          <option value="NUMBER">Number</option>
                          <option value="SELECT">Select Dropdown</option>
                          <option value="RADIO">Radio</option>
                          <option value="CHECKBOX">Checkbox</option>
                          <option value="DATE">Date</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem' }}>
                        <input
                          type="checkbox"
                          id={`req-${idx}`}
                          checked={field.isRequired}
                          onChange={(e) => {
                            const updated = [...formBuilderFields];
                            updated[idx].isRequired = e.target.checked;
                            setFormBuilderFields(updated);
                          }}
                        />
                        <label htmlFor={`req-${idx}`} style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                          Required
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFormBuilderFields(formBuilderFields.filter((_, i) => i !== idx));
                        }}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.35rem 0.6rem', marginTop: '0.75rem' }}
                        title="Remove field"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={formSaving}
                >
                  Cancel
                </button>
                <button id="save-form-btn" type="submit" className="btn btn-primary" disabled={formSaving}>
                  {formSaving ? 'Saving...' : editingFormId ? 'Update Form' : 'Create Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAY 7: SUBMISSION REVIEW MODAL */}
      {isSubmissionModalOpen && selectedSubmission && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
          <div className="modal-content" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 id="review-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Review Submission — {selectedSubmission.formTitle || 'Form'}
              </h2>
              <button
                type="button"
                onClick={() => setIsSubmissionModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close review modal"
              >
                &times;
              </button>
            </div>

            {reviewModalError && (
              <div className="alert alert-danger" style={{ margin: '1rem' }} role="alert">
                <strong>Error: </strong> {reviewModalError}
              </div>
            )}

            <div style={{ padding: '1.25rem' }}>
              {/* Submitter Metadata Banner */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Submitter Name</div>
                  <div style={{ fontWeight: 600 }}>{selectedSubmission.submitterName || 'Not specified'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</div>
                  <div style={{ fontWeight: 600 }}>{selectedSubmission.submitterEmail || 'Not specified'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</div>
                  <div style={{ fontWeight: 600 }}>{selectedSubmission.submitterPhone || 'Not specified'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Submitted Timestamp</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enquiry Category</div>
                  <div style={{ fontWeight: 600 }}>
                    {selectedSubmission.category ? (
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {selectedSubmission.category}
                      </span>
                    ) : (
                      'General Enquiry'
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Routed Recipient(s)</div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', wordBreak: 'break-all' }}>
                    {selectedSubmission.routedTo && selectedSubmission.routedTo.length > 0
                      ? selectedSubmission.routedTo.join(', ')
                      : 'Default institution mailbox'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Notification Delivery</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <span
                      className={`badge ${
                        selectedSubmission.deliveryStatus === 'DELIVERED'
                          ? 'badge-success'
                          : selectedSubmission.deliveryStatus === 'SIMULATED'
                          ? 'badge-info'
                          : selectedSubmission.deliveryStatus === 'FAILED'
                          ? 'badge-danger'
                          : 'badge-secondary'
                      }`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {selectedSubmission.deliveryStatus || 'PENDING'}
                    </span>
                    {selectedSubmission.deliveryAttempts ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({selectedSubmission.deliveryAttempts} attempt{selectedSubmission.deliveryAttempts > 1 ? 's' : ''})
                      </span>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    id="retry-notification-btn"
                    disabled={retryNotificationLoading}
                    onClick={async () => {
                      setRetryNotificationLoading(true);
                      try {
                        const res = await fetch(
                          `${apiBaseUrl}/api/v1/tenant/cms/forms/submissions/${selectedSubmission.id}/retry-notification`,
                          {
                            method: 'POST',
                            headers: getHeaders(),
                            credentials: 'include',
                          }
                        );
                        const json = await res.json();
                        if (!res.ok || !json.success) {
                          throw new Error(json.error?.message || 'Failed to retry notification dispatch');
                        }
                        setGlobalNotice({
                          type: 'success',
                          message: `Notification retried successfully. Status: ${json.data?.deliveryStatus}`,
                        });
                        setSelectedSubmission((prev) =>
                          prev
                            ? {
                                ...prev,
                                deliveryStatus: json.data?.deliveryStatus,
                                deliveryAttempts: json.data?.deliveryAttempts,
                                lastDeliveryAttemptAt: json.data?.lastDeliveryAttemptAt,
                                deliveryError: json.data?.deliveryError,
                                routedTo: json.data?.routedTo,
                              }
                            : null
                        );
                        fetchSubmissions(submissionStatusFilter, submissionSearchQuery);
                      } catch (err: any) {
                        setGlobalNotice({
                          type: 'error',
                          message: err.message || 'Notification retry failed',
                        });
                      } finally {
                        setRetryNotificationLoading(false);
                      }
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  >
                    {retryNotificationLoading ? 'Retrying...' : '↻ Retry Notification'}
                  </button>
                </div>
              </div>

              {selectedSubmission.deliveryError && (
                <div
                  style={{
                    padding: '0.6rem 0.9rem',
                    marginBottom: '1.25rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--danger)',
                  }}
                >
                  <strong>Delivery Failure Reason:</strong> {selectedSubmission.deliveryError}
                </div>
              )}

              {/* Form Data Fields Table */}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f8fafc' }}>
                Submitted Form Data
              </h3>
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '1.5rem',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <tbody>
                    {Object.entries(selectedSubmission.data || {}).map(([key, val]) => (
                      <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td
                          style={{
                            padding: '0.65rem 1rem',
                            fontWeight: 600,
                            width: '35%',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {key}
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Review & Status Transition Section */}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f8fafc' }}>
                Administrative Review Decision
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="review-status-select" style={{ fontWeight: 600 }}>Review Status</label>
                  <select
                    id="review-status-select"
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="PENDING">Pending Review</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="ACCEPTED">Accepted / Approved</option>
                    <option value="REJECTED">Rejected / Closed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="review-notes-textarea" style={{ fontWeight: 600 }}>Internal Administrator Notes</label>
                  <textarea
                    id="review-notes-textarea"
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add remarks regarding candidate qualifications, missing documents, or interview results..."
                    className="form-textarea"
                  />
                </div>

                {selectedSubmission.reviewerName && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Last reviewed by <strong>{selectedSubmission.reviewerName}</strong> on{' '}
                    {selectedSubmission.reviewedAt ? new Date(selectedSubmission.reviewedAt).toLocaleString() : 'N/A'}.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.25rem' }}>
              <button
                type="button"
                onClick={() => setIsSubmissionModalOpen(false)}
                className="btn btn-secondary"
                disabled={reviewSaving}
              >
                Close
              </button>
              <button
                type="button"
                id="save-review-decision-btn"
                onClick={async () => {
                  setReviewSaving(true);
                  setReviewModalError(null);
                  try {
                    const res = await fetch(
                      `${apiBaseUrl}/api/v1/tenant/cms/forms/submissions/${selectedSubmission.id}/status`,
                      {
                        method: 'PATCH',
                        headers: getHeaders(),
                        credentials: 'include',
                        body: JSON.stringify({
                          status: reviewStatus,
                          adminNotes: reviewNotes.trim() || null,
                        }),
                      }
                    );

                    const json = await res.json();
                    if (!res.ok || !json.success) {
                      throw new Error(json.error?.message || 'Failed to update review status');
                    }

                    setGlobalNotice({
                      type: 'success',
                      message: `Submission status updated to ${reviewStatus}.`,
                    });
                    setIsSubmissionModalOpen(false);
                    fetchSubmissions(submissionStatusFilter, submissionSearchQuery);
                  } catch (err: any) {
                    setReviewModalError(err.message || 'Error updating review decision');
                  } finally {
                    setReviewSaving(false);
                  }
                }}
                className="btn btn-primary"
                disabled={reviewSaving}
              >
                {reviewSaving ? 'Saving...' : 'Save Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAY 8: REUSABLE SECTION MODAL */}
      {isSectionModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="section-modal-title">
          <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 id="section-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                {editingSectionId ? `Edit Reusable Section: ${sectionFormName}` : 'Create Reusable CMS Section'}
              </h2>
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {sectionModalError && (
              <div className="alert alert-danger" style={{ margin: '1rem' }} role="alert">
                <strong>Error: </strong> {sectionModalError}
              </div>
            )}

            <form onSubmit={handleSaveReusableSection} noValidate style={{ padding: '1.25rem' }}>
              <div className="grid">
                <div className="form-group">
                  <label htmlFor="section-name-input" className="form-label">
                    Section Name *
                  </label>
                  <input
                    id="section-name-input"
                    type="text"
                    value={sectionFormName}
                    onChange={(e) => {
                      setSectionFormName(e.target.value);
                      if (!editingSectionId) {
                        setSectionFormSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    className="input"
                    placeholder="e.g. Campus Tour Call-To-Action"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="section-slug-input" className="form-label">
                    Unique Slug * (lowercase, hyphens)
                  </label>
                  <input
                    id="section-slug-input"
                    type="text"
                    value={sectionFormSlug}
                    onChange={(e) => setSectionFormSlug(e.target.value.toLowerCase())}
                    className="input"
                    placeholder="e.g. campus-tour-cta"
                    required
                  />
                </div>
              </div>

              <div className="grid">
                <div className="form-group">
                  <label htmlFor="section-type-select" className="form-label">
                    Section Type *
                  </label>
                  <select
                    id="section-type-select"
                    value={sectionFormType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setSectionFormType(newType);
                      // Reset to appropriate default config for selected type
                      if (newType === 'CTA_BANNER') {
                        setSectionFormConfig({
                          headline: 'Experience Oxford First-Hand',
                          subheadline: 'Schedule a guided tour or apply for the upcoming term.',
                          primaryButtonText: 'Book a Campus Tour',
                          primaryButtonUrl: '/contact',
                          theme: 'primary',
                          alignment: 'center',
                        });
                      } else if (newType === 'ACCORDION') {
                        setSectionFormConfig({
                          title: 'Frequently Asked Questions',
                          subtitle: 'Admissions details and deadlines',
                          items: [
                            { id: '1', title: 'What is the application deadline?', content: 'January 15th for autumn enrollment.', isOpenDefault: true },
                            { id: '2', title: 'Are scholarships available?', content: 'Yes, merit scholarships covering up to 50% tuition.', isOpenDefault: false },
                          ],
                          allowMultipleOpen: true,
                        });
                      } else if (newType === 'STATS_COUNTER') {
                        setSectionFormConfig({
                          title: 'Key Statistics',
                          subtitle: 'Academic achievements',
                          items: [
                            { value: '98%', label: 'Graduation Rate', suffix: '', description: 'Consistently achieved' },
                            { value: '15:1', label: 'Student-Teacher Ratio', suffix: '', description: 'Dedicated attention' },
                          ],
                        });
                      } else if (newType === 'TESTIMONIALS') {
                        setSectionFormConfig({
                          title: 'Student Testimonials',
                          subtitle: 'Voices from our campus community',
                          items: [
                            { quote: 'Oxford prepared me with world-class academic rigour.', author: 'Alex Morgan', role: 'Alumnus', organization: 'Class of 2024' },
                          ],
                        });
                      } else if (newType === 'HERO') {
                        setSectionFormConfig({
                          headline: 'Welcome to Oxford',
                          subheadline: 'Excellence in primary and secondary education.',
                          ctaText: 'Explore Programmes',
                          ctaLink: '/academics',
                        });
                      } else if (newType === 'TEXT_CONTENT') {
                        setSectionFormConfig({
                          body: 'Detailed institutional information and narrative.',
                          alignment: 'left',
                        });
                      } else if (newType === 'IMAGE_MEDIA') {
                        setSectionFormConfig({
                          imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80',
                          altText: 'Campus grounds and historic library building',
                          caption: 'Historic Campus Quadrangle',
                        });
                      } else if (newType === 'FEATURE_GRID') {
                        setSectionFormConfig({
                          title: 'Core Pillars of Learning',
                          items: [
                            { title: 'STEM & Robotics Lab', description: 'Advanced robotics and coding curriculum.' },
                            { title: 'Fine Arts Studio', description: 'Comprehensive performing and visual arts program.' },
                          ],
                        });
                      }
                    }}
                    className="select"
                    disabled={Boolean(editingSectionId)}
                  >
                    <option value="CTA_BANNER">CTA Banner</option>
                    <option value="ACCORDION">Accordion / FAQ</option>
                    <option value="STATS_COUNTER">Stats Counter</option>
                    <option value="TESTIMONIALS">Testimonials</option>
                    <option value="HERO">Hero Banner</option>
                    <option value="TEXT_CONTENT">Text Content</option>
                    <option value="IMAGE_MEDIA">Image Media</option>
                    <option value="FEATURE_GRID">Feature Grid</option>
                  </select>
                  {editingSectionId && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Section type cannot be changed after creation.
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="section-category-input" className="form-label">
                    Category Tag
                  </label>
                  <input
                    id="section-category-input"
                    type="text"
                    value={sectionFormCategory}
                    onChange={(e) => setSectionFormCategory(e.target.value)}
                    className="input"
                    placeholder="e.g. Admissions, Academics, Campus Life"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="section-desc-input" className="form-label">
                  Description / Internal Notes
                </label>
                <textarea
                  id="section-desc-input"
                  value={sectionFormDesc}
                  onChange={(e) => setSectionFormDesc(e.target.value)}
                  className="textarea"
                  rows={2}
                  placeholder="Describe when and where this section should be used across pages..."
                />
              </div>

              {/* Dynamic Type-Specific Configuration Builder */}
              <div style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                  Configuration for {sectionFormType}
                </h3>

                {sectionFormType === 'CTA_BANNER' && (
                  <div className="grid">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Headline *</label>
                      <input
                        id="cta-headline-input"
                        type="text"
                        value={sectionFormConfig.headline || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, headline: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Subheadline</label>
                      <input
                        id="cta-subheadline-input"
                        type="text"
                        value={sectionFormConfig.subheadline || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, subheadline: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Primary Button Text *</label>
                      <input
                        id="cta-primary-btn-text"
                        type="text"
                        value={sectionFormConfig.primaryButtonText || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, primaryButtonText: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Primary Button URL *</label>
                      <input
                        id="cta-primary-btn-url"
                        type="text"
                        value={sectionFormConfig.primaryButtonUrl || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, primaryButtonUrl: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Secondary Button Text (Optional)</label>
                      <input
                        type="text"
                        value={sectionFormConfig.secondaryButtonText || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, secondaryButtonText: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Secondary Button URL</label>
                      <input
                        type="text"
                        value={sectionFormConfig.secondaryButtonUrl || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, secondaryButtonUrl: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {sectionFormType === 'ACCORDION' && (
                  <div>
                    <div className="grid">
                      <div className="form-group">
                        <label className="form-label">Accordion Title *</label>
                        <input
                          id="accordion-title-input"
                          type="text"
                          value={sectionFormConfig.title || ''}
                          onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, title: e.target.value })}
                          className="input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Subtitle</label>
                        <input
                          type="text"
                          value={sectionFormConfig.subtitle || ''}
                          onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, subtitle: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
                          FAQ / Accordion Items ({(sectionFormConfig.items || []).length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const current = sectionFormConfig.items || [];
                            setSectionFormConfig({
                              ...sectionFormConfig,
                              items: [
                                ...current,
                                {
                                  id: `item-${Date.now()}`,
                                  title: 'New Question Title',
                                  content: 'Detailed answer content goes here.',
                                  isOpenDefault: false,
                                },
                              ],
                            });
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          + Add Item
                        </button>
                      </div>

                      {(sectionFormConfig.items || []).map((item: any, itemIdx: number) => (
                        <div key={item.id || itemIdx} style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Item #{itemIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = [...(sectionFormConfig.items || [])];
                                current.splice(itemIdx, 1);
                                setSectionFormConfig({ ...sectionFormConfig, items: current });
                              }}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            value={item.title || ''}
                            onChange={(e) => {
                              const current = [...(sectionFormConfig.items || [])];
                              current[itemIdx] = { ...current[itemIdx], title: e.target.value };
                              setSectionFormConfig({ ...sectionFormConfig, items: current });
                            }}
                            className="input"
                            placeholder="Question or Heading..."
                            style={{ marginBottom: '0.5rem' }}
                          />
                          <textarea
                            value={item.content || ''}
                            onChange={(e) => {
                              const current = [...(sectionFormConfig.items || [])];
                              current[itemIdx] = { ...current[itemIdx], content: e.target.value };
                              setSectionFormConfig({ ...sectionFormConfig, items: current });
                            }}
                            className="textarea"
                            rows={2}
                            placeholder="Answer or Body content..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sectionFormType === 'STATS_COUNTER' && (
                  <div>
                    <div className="grid">
                      <div className="form-group">
                        <label className="form-label">Section Title</label>
                        <input
                          id="stats-title-input"
                          type="text"
                          value={sectionFormConfig.title || ''}
                          onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, title: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Subtitle</label>
                        <input
                          type="text"
                          value={sectionFormConfig.subtitle || ''}
                          onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, subtitle: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
                          Key Metric Counters ({(sectionFormConfig.items || []).length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const current = sectionFormConfig.items || [];
                            setSectionFormConfig({
                              ...sectionFormConfig,
                              items: [
                                ...current,
                                { value: '100%', label: 'Metric Label', suffix: '', description: '' },
                              ],
                            });
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          + Add Counter
                        </button>
                      </div>

                      {(sectionFormConfig.items || []).map((item: any, itemIdx: number) => (
                        <div key={itemIdx} style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Counter #{itemIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = [...(sectionFormConfig.items || [])];
                                current.splice(itemIdx, 1);
                                setSectionFormConfig({ ...sectionFormConfig, items: current });
                              }}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid">
                            <input
                              type="text"
                              value={item.value || ''}
                              onChange={(e) => {
                                const current = [...(sectionFormConfig.items || [])];
                                current[itemIdx] = { ...current[itemIdx], value: e.target.value };
                                setSectionFormConfig({ ...sectionFormConfig, items: current });
                              }}
                              className="input"
                              placeholder="Value (e.g. 98%)"
                            />
                            <input
                              type="text"
                              value={item.label || ''}
                              onChange={(e) => {
                                const current = [...(sectionFormConfig.items || [])];
                                current[itemIdx] = { ...current[itemIdx], label: e.target.value };
                                setSectionFormConfig({ ...sectionFormConfig, items: current });
                              }}
                              className="input"
                              placeholder="Label (e.g. Graduation Rate)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sectionFormType === 'TESTIMONIALS' && (
                  <div>
                    <div className="grid">
                      <div className="form-group">
                        <label className="form-label">Section Title</label>
                        <input
                          id="testimonials-title-input"
                          type="text"
                          value={sectionFormConfig.title || ''}
                          onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, title: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Subtitle</label>
                        <input
                          type="text"
                          value={sectionFormConfig.subtitle || ''}
                          onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, subtitle: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
                          Testimonial Quotes ({(sectionFormConfig.items || []).length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const current = sectionFormConfig.items || [];
                            setSectionFormConfig({
                              ...sectionFormConfig,
                              items: [
                                ...current,
                                { quote: 'Insightful quote here...', author: 'Author Name', role: 'Student', organization: 'Class of 2025' },
                              ],
                            });
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          + Add Quote
                        </button>
                      </div>

                      {(sectionFormConfig.items || []).map((item: any, itemIdx: number) => (
                        <div key={itemIdx} style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Quote #{itemIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = [...(sectionFormConfig.items || [])];
                                current.splice(itemIdx, 1);
                                setSectionFormConfig({ ...sectionFormConfig, items: current });
                              }}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                            >
                              Remove
                            </button>
                          </div>
                          <textarea
                            value={item.quote || ''}
                            onChange={(e) => {
                              const current = [...(sectionFormConfig.items || [])];
                              current[itemIdx] = { ...current[itemIdx], quote: e.target.value };
                              setSectionFormConfig({ ...sectionFormConfig, items: current });
                            }}
                            className="textarea"
                            rows={2}
                            placeholder="Quote text..."
                            style={{ marginBottom: '0.5rem' }}
                          />
                          <div className="grid">
                            <input
                              type="text"
                              value={item.author || ''}
                              onChange={(e) => {
                                const current = [...(sectionFormConfig.items || [])];
                                current[itemIdx] = { ...current[itemIdx], author: e.target.value };
                                setSectionFormConfig({ ...sectionFormConfig, items: current });
                              }}
                              className="input"
                              placeholder="Author Name"
                            />
                            <input
                              type="text"
                              value={item.role || ''}
                              onChange={(e) => {
                                const current = [...(sectionFormConfig.items || [])];
                                current[itemIdx] = { ...current[itemIdx], role: e.target.value };
                                setSectionFormConfig({ ...sectionFormConfig, items: current });
                              }}
                              className="input"
                              placeholder="Role (e.g. Alumnus)"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sectionFormType === 'HERO' && (
                  <div className="grid">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Headline *</label>
                      <input
                        type="text"
                        value={sectionFormConfig.headline || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, headline: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Subheadline</label>
                      <input
                        type="text"
                        value={sectionFormConfig.subheadline || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, subheadline: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CTA Text</label>
                      <input
                        type="text"
                        value={sectionFormConfig.ctaText || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, ctaText: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CTA Link</label>
                      <input
                        type="text"
                        value={sectionFormConfig.ctaLink || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, ctaLink: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {sectionFormType === 'TEXT_CONTENT' && (
                  <div className="form-group">
                    <label className="form-label">Body Text *</label>
                    <textarea
                      value={sectionFormConfig.body || ''}
                      onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, body: e.target.value })}
                      className="textarea"
                      rows={5}
                      required
                    />
                  </div>
                )}

                {sectionFormType === 'IMAGE_MEDIA' && (
                  <div className="grid">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Image URL *</label>
                      <input
                        type="text"
                        value={sectionFormConfig.imageUrl || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, imageUrl: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Alt Text * (WCAG 2.2 AA)</label>
                      <input
                        type="text"
                        value={sectionFormConfig.altText || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, altText: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Caption</label>
                      <input
                        type="text"
                        value={sectionFormConfig.caption || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, caption: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                )}

                {sectionFormType === 'FEATURE_GRID' && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Section Heading</label>
                      <input
                        type="text"
                        value={sectionFormConfig.title || ''}
                        onChange={(e) => setSectionFormConfig({ ...sectionFormConfig, title: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={sectionSaving}
                >
                  Cancel
                </button>
                <button
                  id="save-section-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={sectionSaving}
                >
                  {sectionSaving ? 'Saving...' : editingSectionId ? 'Update Section' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DAY 8: INSERT REUSABLE SECTION MODAL (FROM PAGE BUILDER) */}
      {isInsertSectionModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="insert-section-modal-title">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 id="insert-section-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Insert Reusable Section from Library
              </h2>
              <button
                type="button"
                onClick={() => setIsInsertSectionModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                Select a centralized section from your institution's component library. Any changes made to the master section will synchronize to this page automatically.
              </p>

              {reusableSections.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No reusable sections created yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInsertSectionModalOpen(false);
                      setIsPageEditorOpen(false);
                      setActiveTab('sections');
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Go to Sections Library
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {reusableSections.map((sec) => (
                    <div
                      key={sec.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>{sec.name}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                          <span className="badge badge-reusable">{sec.sectionType}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            slug: <code>{sec.slug}</code> &bull; {sec.category || 'General'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        id={`insert-section-item-${sec.id}`}
                        onClick={() => handleInsertReusableSection(sec)}
                        className="btn btn-primary btn-sm"
                      >
                        + Insert
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.25rem' }}>
              <button
                type="button"
                onClick={() => setIsInsertSectionModalOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAY 8: PLACEMENTS INSPECTION MODAL */}
      {placementsModalData && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="placements-modal-title">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 id="placements-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                Placements: {placementsModalData.sectionName}
              </h2>
              <button
                type="button"
                onClick={() => setPlacementsModalData(null)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                This section is referenced across the following institutional CMS pages:
              </p>

              {placementsModalData.placements.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                  This reusable section is not currently embedded in any pages.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {placementsModalData.placements.map((p) => (
                    <div
                      key={p.pageId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{p.pageTitle}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          URL: <code>/{p.pageSlug}</code>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`badge ${p.isPagePublished ? 'badge-active' : 'badge-pending'}`}>
                          {p.isPagePublished ? 'Published' : 'Draft'}
                        </span>
                        <a
                          href={`/${p.pageSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.15rem 0.5rem', textDecoration: 'none' }}
                        >
                          View Page &rarr;
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.25rem' }}>
              <button
                type="button"
                onClick={() => setPlacementsModalData(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer System Disclaimer */}
      <footer style={{ marginTop: '3rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p>
          Institutional Administration Module — Compliance with FR-AUTH-004 (Tenant User Administration) & BR-010 (Role Assignment Delegation Constraints).
        </p>
      </footer>
    </div>
  );
}
