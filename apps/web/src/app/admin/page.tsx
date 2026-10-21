'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface UserMember {
  id: string;
  userId: string;
  tenantId: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string;
  };
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
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

export default function TenantAdminPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'audit'>('members');
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

  // Initial load when tab or tenant changes
  useEffect(() => {
    fetchRoles();
    if (activeTab === 'members') {
      fetchMembers();
    } else if (activeTab === 'invitations') {
      fetchInvitations();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, tenantSlug, fetchRoles, fetchMembers, fetchInvitations, fetchAuditLogs]);

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
    const newStatus = member.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    const actionLabel = newStatus === 'DEACTIVATED' ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} membership for ${member.user.email}?`)) return;

    setStatusUpdateLoadingId(member.id);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/users/${member.id}/status`, {
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
        message: `Membership for ${member.user.email} is now ${newStatus}. ${
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
    setRoleUpdateLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/admin/users/${editingMember.id}/roles`, {
        method: 'PATCH',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ roleIds: editingRoleIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `Failed to update roles (HTTP ${res.status})`);
      }
      setGlobalNotice({ type: 'success', message: `Roles updated successfully for ${editingMember.user.email}.` });
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
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.user.firstName ? `${m.user.firstName} ${m.user.lastName || ''}` : 'Unnamed User'}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.user.email}</div>
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
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setEditingMember(m);
                              setEditingRoleIds(m.roles.map((r) => r.id));
                            }}
                            className="btn btn-secondary btn-sm"
                            aria-label={`Edit roles for ${m.user.email}`}
                          >
                            Edit Roles
                          </button>
                          <button
                            onClick={() => handleToggleMembershipStatus(m)}
                            disabled={statusUpdateLoadingId === m.id}
                            className={`btn btn-sm ${m.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
                            aria-label={`${m.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} membership for ${m.user.email}`}
                          >
                            {statusUpdateLoadingId === m.id
                              ? 'Updating...'
                              : m.status === 'ACTIVE'
                              ? 'Deactivate'
                              : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                  Select authorized tenant roles for <strong>{editingMember.user.email}</strong>. Platform administrator privileges cannot be granted through tenant administration.
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

      {/* Footer System Disclaimer */}
      <footer style={{ marginTop: '3rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <p>
          Institutional Administration Module — Compliance with FR-AUTH-004 (Tenant User Administration) & BR-010 (Role Assignment Delegation Constraints).
        </p>
      </footer>
    </div>
  );
}
