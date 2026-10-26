'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { AnnouncementDto } from '@school/shared';

interface AnnouncementAdminViewProps {
  apiBaseUrl: string;
  tenantSlug: string;
  getHeaders: () => Record<string, string>;
  setGlobalNotice: (notice: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

export default function AnnouncementAdminView({
  apiBaseUrl,
  tenantSlug,
  getHeaders,
  setGlobalNotice,
}: AnnouncementAdminViewProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY'>('NORMAL');
  const [audience, setAudience] = useState<'GENERAL' | 'STUDENTS' | 'PARENTS' | 'STAFF'>('GENERAL');
  const [isPinned, setIsPinned] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (priorityFilter !== 'ALL') query.set('priority', priorityFilter);
      if (searchQuery.trim()) query.set('search', searchQuery.trim());
      query.set('limit', '100');

      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/announcements?${query.toString()}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch announcements');
      }
      setAnnouncements(data.data?.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, getHeaders, statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setContent('');
    setPriority('NORMAL');
    setAudience('GENERAL');
    setIsPinned(false);
    setStartsAt('');
    setExpiresAt('');
    setStatus('DRAFT');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: AnnouncementDto) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setPriority(item.priority);
    setAudience(item.audience);
    setIsPinned(item.isPinned);
    setStartsAt(item.startsAt ? new Date(item.startsAt).toISOString().slice(0, 16) : '');
    setExpiresAt(item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0, 16) : '');
    setStatus(item.status);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    const payload: any = {
      title,
      content,
      priority,
      audience,
      isPinned,
      status,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    if (payload.startsAt && payload.expiresAt && new Date(payload.expiresAt) <= new Date(payload.startsAt)) {
      setModalError('Expiry time must be after the start display time.');
      setSaving(false);
      return;
    }

    try {
      const url = editingItem
        ? `${apiBaseUrl}/api/v1/tenant/cms/announcements/${editingItem.id}`
        : `${apiBaseUrl}/api/v1/tenant/cms/announcements`;
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to save announcement');
      }

      setGlobalNotice({
        type: 'success',
        message: editingItem
          ? `Announcement '${title}' updated.`
          : `Announcement '${title}' created.`,
      });
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (item: AnnouncementDto) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/announcements/${item.id}/publish`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to publish announcement');
      setGlobalNotice({ type: 'success', message: `Announcement '${item.title}' published.` });
      fetchAnnouncements();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message });
    }
  };

  const handleArchive = async (item: AnnouncementDto) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/announcements/${item.id}/archive`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to archive announcement');
      setGlobalNotice({ type: 'info', message: `Announcement '${item.title}' archived.` });
      fetchAnnouncements();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (item: AnnouncementDto) => {
    if (!window.confirm(`Are you sure you want to delete announcement '${item.title}'?`)) {
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/announcements/${item.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to delete announcement');
      setGlobalNotice({ type: 'success', message: `Announcement '${item.title}' deleted.` });
      fetchAnnouncements();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="announcements-admin-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
            Operational Notices & Announcements
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Publish urgent alerts, operational notices, exam timetables, and campus advisories for {tenantSlug}.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary" id="btn-create-announcement">
          + New Announcement
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '1rem',
          backgroundColor: 'rgba(30, 41, 59, 0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="search"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ width: '100%', padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="ann-priority-filter" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Priority:
          </label>
          <select
            id="ann-priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
          >
            <option value="ALL">All Priorities</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="ann-status-filter" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Status:
          </label>
          <select
            id="ann-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Announcements Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
              No announcements found.
            </p>
            <button onClick={openCreateModal} className="btn btn-secondary btn-sm">
              Create First Announcement
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Title & Content</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Priority</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Audience</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Display Window</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Active Lifecycle State</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((item) => {
                  const now = Date.now();
                  const isStarted = !item.startsAt || new Date(item.startsAt).getTime() <= now;
                  const isExpired = item.expiresAt && new Date(item.expiresAt).getTime() <= now;

                  let dynamicState = 'DRAFT';
                  let dynamicStateColor = '#94a3b8';
                  if (item.status === 'PUBLISHED') {
                    if (isExpired) {
                      dynamicState = 'EXPIRED (Historical)';
                      dynamicStateColor = '#ef4444';
                    } else if (!isStarted) {
                      dynamicState = 'SCHEDULED (Future)';
                      dynamicStateColor = '#3b82f6';
                    } else {
                      dynamicState = 'ACTIVE (Visible)';
                      dynamicStateColor = '#10b981';
                    }
                  } else if (item.status === 'ARCHIVED') {
                    dynamicState = 'ARCHIVED';
                    dynamicStateColor = '#64748b';
                  }

                  const priorityColor =
                    item.priority === 'EMERGENCY'
                      ? '#ef4444'
                      : item.priority === 'HIGH'
                      ? '#f59e0b'
                      : item.priority === 'NORMAL'
                      ? '#3b82f6'
                      : '#94a3b8';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {item.isPinned && <span title="Pinned announcement">📌</span>}
                          <strong style={{ color: '#f8fafc' }}>{item.title}</strong>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', maxWidth: '350px' }}>
                          {item.content.slice(0, 90)}...
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: `${priorityColor}22`,
                            color: priorityColor,
                            border: `1px solid ${priorityColor}44`,
                          }}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                        {item.audience}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div>From: {item.startsAt ? new Date(item.startsAt).toLocaleDateString('en-GB') : 'Immediate'}</div>
                        <div>Until: {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('en-GB') : 'Indefinite'}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: `${dynamicStateColor}22`,
                            color: dynamicStateColor,
                            border: `1px solid ${dynamicStateColor}44`,
                          }}
                        >
                          {dynamicState}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => openEditModal(item)}
                            className="btn btn-secondary btn-sm"
                            aria-label={`Edit announcement ${item.title}`}
                          >
                            Edit
                          </button>
                          {item.status !== 'PUBLISHED' && (
                            <button
                              onClick={() => handlePublish(item)}
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                              aria-label={`Publish announcement ${item.title}`}
                            >
                              Publish
                            </button>
                          )}
                          {item.status === 'PUBLISHED' && (
                            <button
                              onClick={() => handleArchive(item)}
                              className="btn btn-secondary btn-sm"
                              aria-label={`Archive announcement ${item.title}`}
                            >
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#ef4444' }}
                            aria-label={`Delete announcement ${item.title}`}
                          >
                            Delete
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
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ann-modal-title">
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h3 id="ann-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc', margin: 0 }}>
                {editingItem ? `Edit Announcement: ${editingItem.title}` : 'Create Operational Announcement'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {modalError && (
                  <div className="alert alert-error" role="alert">
                    {modalError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="ann-title">Notice Headline / Title *</label>
                  <input
                    id="ann-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="e.g. Adverse Weather Alert: Morning Transport Adjustments"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ann-content">Announcement Content *</label>
                  <textarea
                    id="ann-content"
                    rows={4}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="input"
                    placeholder="Clear description of the operational update, safety advisory, or schedule change..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="ann-priority">Priority Level</label>
                    <select
                      id="ann-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="input"
                    >
                      <option value="NORMAL">NORMAL (Standard Bulletin)</option>
                      <option value="HIGH">HIGH (Important Advisory)</option>
                      <option value="EMERGENCY">EMERGENCY (Critical Alert)</option>
                      <option value="LOW">LOW (Informational)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="ann-audience">Audience Group</label>
                    <select
                      id="ann-audience"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value as any)}
                      className="input"
                    >
                      <option value="GENERAL">GENERAL (All Campus)</option>
                      <option value="STUDENTS">STUDENTS</option>
                      <option value="PARENTS">PARENTS / GUARDIANS</option>
                      <option value="STAFF">STAFF & FACULTY</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="ann-starts">Start Display Time (Optional)</label>
                    <input
                      id="ann-starts"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ann-expires">Expiration Time (Optional)</label>
                    <input
                      id="ann-expires"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  <div className="form-group">
                    <label htmlFor="ann-status">Status</label>
                    <select
                      id="ann-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="input"
                    >
                      <option value="DRAFT">DRAFT (Unpublished)</option>
                      <option value="PUBLISHED">PUBLISHED (Active Window)</option>
                      <option value="ARCHIVED">ARCHIVED (Inactive)</option>
                    </select>
                  </div>

                  <div style={{ paddingTop: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                      />
                      <span style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Pin Announcement to Top</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Update Notice' : 'Create Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
