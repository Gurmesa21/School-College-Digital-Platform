'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
  sectionType: 'HERO' | 'TEXT_CONTENT' | 'IMAGE_MEDIA' | 'FEATURE_GRID';
  sortOrder: number;
  isVisible: boolean;
  config: Record<string, any>;
}

export default function TenantAdminPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'audit' | 'pages'>('members');
  const [tenantSlug, setTenantSlug] = useState('oxford');
  const [apiBaseUrl, setApiBaseUrl] = useState('');

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
    } catch {
      setCurrentUser(null);
    }
  };

  // Initial load when tab or tenant changes
  useEffect(() => {
    checkAuth();
    fetchRoles();
    if (activeTab === 'members') {
      fetchMembers();
    } else if (activeTab === 'invitations') {
      fetchInvitations();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'pages') {
      fetchPages();
    }
  }, [activeTab, tenantSlug, checkAuth, fetchRoles, fetchMembers, fetchInvitations, fetchAuditLogs, fetchPages]);

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

  const handleAddSection = (type: 'HERO' | 'TEXT_CONTENT' | 'IMAGE_MEDIA' | 'FEATURE_GRID') => {
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

  const handleRemoveSection = (idx: number) => {
    setFormSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSectionConfig = (idx: number, key: string, value: any) => {
    setFormSections((prev) =>
      prev.map((sec, i) => (i === idx ? { ...sec, config: { ...sec.config, [key]: value } } : sec))
    );
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

            <form onSubmit={handleSavePage}>
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
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="badge badge-role" style={{ textTransform: 'uppercase' }}>
                        {sec.sectionType} Section #{idx + 1}
                      </span>
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
                          <input
                            id={`image-url-${idx}`}
                            type="text"
                            value={sec.config.imageUrl || ''}
                            onChange={(e) => handleUpdateSectionConfig(idx, 'imageUrl', e.target.value)}
                            className="input"
                            placeholder="https://..."
                            required
                          />
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

      {/* Footer System Disclaimer */}
      <footer style={{ marginTop: '3rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p>
          Institutional Administration Module — Compliance with FR-AUTH-004 (Tenant User Administration) & BR-010 (Role Assignment Delegation Constraints).
        </p>
      </footer>
    </div>
  );
}
