'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { StaffProfileDto, AcademicDepartmentDto, MediaAssetDto } from '@school/shared';

interface StaffAdminViewProps {
  apiBaseUrl: string;
  tenantSlug: string;
  getHeaders: () => Record<string, string>;
  setGlobalNotice: (notice: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

export default function StaffAdminView({
  apiBaseUrl,
  tenantSlug,
  getHeaders,
  setGlobalNotice,
}: StaffAdminViewProps) {
  // Staff State
  const [staffList, setStaffList] = useState<StaffProfileDto[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Related Entities State
  const [departments, setDepartments] = useState<AcademicDepartmentDto[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetDto[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfileDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [slug, setSlug] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [profileMediaId, setProfileMediaId] = useState('');
  const [subjectsInput, setSubjectsInput] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [consultationHours, setConsultationHours] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [publicPhone, setPublicPhone] = useState('');
  const [displayEmail, setDisplayEmail] = useState(false);
  const [displayPhone, setDisplayPhone] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [biography, setBiography] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [orderIndex, setOrderIndex] = useState(0);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------
  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (departmentFilter !== 'ALL') params.set('departmentId', departmentFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('limit', '50');

      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/staff?${params.toString()}`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to fetch staff profiles');
      }
      setStaffList(data.data?.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error loading staff profiles';
      setStaffError(message);
    } finally {
      setStaffLoading(false);
    }
  }, [apiBaseUrl, getHeaders, statusFilter, departmentFilter, searchQuery]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/departments?active=true`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDepartments(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      // Non-blocking fallback
    }
  }, [apiBaseUrl, getHeaders]);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/media?category=IMAGE&limit=100`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMediaAssets(data.data?.items || []);
      }
    } catch {
      // Non-blocking fallback
    }
  }, [apiBaseUrl, getHeaders]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    fetchDepartments();
    fetchMedia();
  }, [fetchDepartments, fetchMedia]);

  // --------------------------------------------------------------------------
  // Modal Handlers
  // --------------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingStaff(null);
    setFullName('');
    setSlug('');
    setRoleTitle('');
    setDepartmentId('');
    setProfileMediaId('');
    setSubjectsInput('');
    setQualifications('');
    setOfficeLocation('');
    setConsultationHours('');
    setPublicEmail('');
    setPublicPhone('');
    setDisplayEmail(false);
    setDisplayPhone(false);
    setWebsiteUrl('');
    setBiography('');
    setInternalNotes('');
    setStatus('DRAFT');
    setIsActive(true);
    setIsFeatured(false);
    setOrderIndex(0);
    setSeoTitle('');
    setSeoDescription('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffProfileDto) => {
    setEditingStaff(staff);
    setFullName(staff.fullName);
    setSlug(staff.slug);
    setRoleTitle(staff.roleTitle);
    setDepartmentId(staff.departmentId || '');
    setProfileMediaId(staff.profileMediaId || '');
    setSubjectsInput((staff.subjects || []).join(', '));
    setQualifications(staff.qualifications || '');
    setOfficeLocation(staff.officeLocation || '');
    setConsultationHours(staff.consultationHours || '');
    setPublicEmail(staff.publicEmail || '');
    setPublicPhone(staff.publicPhone || '');
    setDisplayEmail(Boolean(staff.displayEmail));
    setDisplayPhone(Boolean(staff.displayPhone));
    setWebsiteUrl(staff.websiteUrl || '');
    setBiography(staff.biography || '');
    setInternalNotes(staff.internalNotes || '');
    setStatus(staff.status);
    setIsActive(staff.isActive);
    setIsFeatured(staff.isFeatured);
    setOrderIndex(staff.orderIndex || 0);
    setSeoTitle(staff.seoTitle || '');
    setSeoDescription(staff.seoDescription || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleFullNameChange = (val: string) => {
    setFullName(val);
    if (!editingStaff) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    const subjectsArray = subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Record<string, any> = {
      fullName: fullName.trim(),
      slug: slug.trim(),
      roleTitle: roleTitle.trim(),
      departmentId: departmentId || null,
      profileMediaId: profileMediaId || null,
      subjects: subjectsArray,
      qualifications: qualifications.trim() || null,
      officeLocation: officeLocation.trim() || null,
      consultationHours: consultationHours.trim() || null,
      publicEmail: publicEmail.trim() || null,
      publicPhone: publicPhone.trim() || null,
      displayEmail,
      displayPhone,
      websiteUrl: websiteUrl.trim() || null,
      biography: biography.trim() || null,
      internalNotes: internalNotes.trim() || null,
      status,
      isActive,
      isFeatured,
      orderIndex: Number(orderIndex) || 0,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
    };

    try {
      const url = editingStaff
        ? `${apiBaseUrl}/api/v1/tenant/cms/staff/${editingStaff.id}`
        : `${apiBaseUrl}/api/v1/tenant/cms/staff`;
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save staff profile');
      }

      setGlobalNotice({
        type: 'success',
        message: `Staff member "${fullName}" saved successfully.`,
      });
      setIsModalOpen(false);
      fetchStaff();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving staff profile';
      setModalError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staff: StaffProfileDto) => {
    const nextStatus = staff.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/staff/${staff.id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update publication status');
      }
      setGlobalNotice({
        type: 'success',
        message: `Staff member "${staff.fullName}" is now ${nextStatus}.`,
      });
      fetchStaff();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating status';
      setGlobalNotice({ type: 'error', message });
    }
  };

  const handleDeleteStaff = async (staff: StaffProfileDto) => {
    if (!confirm(`Are you sure you want to delete profile for "${staff.fullName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/staff/${staff.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to delete staff profile');
      }
      setGlobalNotice({
        type: 'success',
        message: `Staff profile for "${staff.fullName}" deleted.`,
      });
      fetchStaff();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error deleting profile';
      setGlobalNotice({ type: 'error', message });
    }
  };

  return (
    <section aria-labelledby="staff-admin-heading" style={{ marginTop: '1.5rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 id="staff-admin-heading" style={{ fontSize: '1.5rem', color: '#f8fafc', margin: 0 }}>
            Staff Directory & Profiles
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem', marginBottom: 0 }}>
            Manage institutional faculty, educators, and leadership profiles with public contact privacy rules.
          </p>
        </div>
        <button
          id="create-staff-btn"
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>+</span> Add Staff Member
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="staff-search-input" className="form-label" style={{ fontSize: '0.8rem' }}>
            Search Staff
          </label>
          <input
            id="staff-search-input"
            type="text"
            className="input"
            placeholder="Search by name, role, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="staff-status-filter" className="form-label" style={{ fontSize: '0.8rem' }}>
            Publication Status
          </label>
          <select
            id="staff-status-filter"
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published Only</option>
            <option value="DRAFT">Draft Only</option>
            <option value="ARCHIVED">Archived Only</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label htmlFor="staff-dept-filter" className="form-label" style={{ fontSize: '0.8rem' }}>
            Department
          </label>
          <select
            id="staff-dept-filter"
            className="input"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.code ? `(${d.code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error alert */}
      {staffError && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>{staffError}</span>
          <button onClick={fetchStaff} className="btn btn-sm btn-secondary">
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {staffLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading staff profiles...
        </div>
      ) : staffList.length === 0 ? (
        /* Accessible Empty State */
        <div
          id="staff-empty-state"
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>👥</div>
          <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
            No staff members found
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            {searchQuery || statusFilter !== 'ALL' || departmentFilter !== 'ALL'
              ? 'No staff profiles match your current search and filter criteria. Try clearing filters.'
              : 'Add your institution’s educators, leadership team, and faculty members to populate the directory.'}
          </p>
          <button onClick={openCreateModal} className="btn btn-primary">
            Add First Staff Member
          </button>
        </div>
      ) : (
        /* Staff Profiles Table */
        <div className="table-responsive">
          <table className="table" aria-label="Staff Directory Management">
            <thead>
              <tr>
                <th scope="col" style={{ width: '60px' }}>Photo</th>
                <th scope="col">Staff Member</th>
                <th scope="col">Role & Department</th>
                <th scope="col">Public Contacts</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff.id}>
                  {/* Photo thumbnail */}
                  <td>
                    {staff.profileMedia?.publicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={staff.profileMedia.publicUrl}
                        alt={staff.profileMedia.altText || staff.fullName}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid var(--border-subtle)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--bg-input)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {staff.fullName.charAt(0)}
                      </div>
                    )}
                  </td>

                  {/* Staff Info */}
                  <td>
                    <div style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {staff.fullName}
                      {staff.isFeatured && (
                        <span title="Featured Staff" style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
                          ★
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      /staff/{staff.slug}
                    </div>
                    {staff.subjects && staff.subjects.length > 0 && (
                      <div style={{ marginTop: '0.25rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {staff.subjects.slice(0, 3).map((sub, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.7rem',
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#93c5fd',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                            }}
                          >
                            {sub}
                          </span>
                        ))}
                        {staff.subjects.length > 3 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            +{staff.subjects.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Role & Department */}
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{staff.roleTitle}</div>
                    {staff.department ? (
                      <span className="badge badge-role" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {staff.department.name}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Department</span>
                    )}
                  </td>

                  {/* Public Contact Privacy Indicators */}
                  <td>
                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: staff.displayEmail && staff.publicEmail ? '#10b981' : 'var(--text-muted)' }}>
                        📧 {staff.displayEmail && staff.publicEmail ? staff.publicEmail : '(Private / Redacted)'}
                      </span>
                      <span style={{ color: staff.displayPhone && staff.publicPhone ? '#10b981' : 'var(--text-muted)' }}>
                        📞 {staff.displayPhone && staff.publicPhone ? staff.publicPhone : '(Private / Redacted)'}
                      </span>
                    </div>
                  </td>

                  {/* Publication Status */}
                  <td>
                    <span
                      className={`badge ${
                        staff.status === 'PUBLISHED'
                          ? 'badge-published'
                          : staff.status === 'ARCHIVED'
                          ? 'badge-archived'
                          : 'badge-draft'
                      }`}
                    >
                      {staff.status}
                    </span>
                    {!staff.isActive && (
                      <span className="badge badge-deactivated" style={{ marginLeft: '0.25rem' }}>
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className={`btn btn-sm ${staff.status === 'PUBLISHED' ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        title={staff.status === 'PUBLISHED' ? 'Unpublish to Draft' : 'Publish Profile'}
                      >
                        {staff.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => openEditModal(staff)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        aria-label={`Edit ${staff.fullName}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staff)}
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        aria-label={`Delete ${staff.fullName}`}
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

      {/* CREATE / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="staff-modal-title">
          <div className="modal-content" style={{ maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 id="staff-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc', margin: 0 }}>
                {editingStaff ? `Edit Profile: ${editingStaff.fullName}` : 'Add New Staff Member'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="alert alert-error" role="alert" style={{ margin: '1rem 0' }}>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff} style={{ marginTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Full Name */}
                <div className="form-group">
                  <label htmlFor="staff-fullname-input" className="form-label">
                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="staff-fullname-input"
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Dr. Eleanor Vance"
                    value={fullName}
                    onChange={(e) => handleFullNameChange(e.target.value)}
                  />
                </div>

                {/* Slug */}
                <div className="form-group">
                  <label htmlFor="staff-slug-input" className="form-label">
                    Slug (URL Identifier) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="staff-slug-input"
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. dr-eleanor-vance"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>

                {/* Role / Title */}
                <div className="form-group">
                  <label htmlFor="staff-roletitle-input" className="form-label">
                    Professional Role / Title <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="staff-roletitle-input"
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Dean of Science & Senior Lecturer"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                  />
                </div>

                {/* Department Selection */}
                <div className="form-group">
                  <label htmlFor="staff-department-select" className="form-label">
                    Department Association
                  </label>
                  <select
                    id="staff-department-select"
                    className="input"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    <option value="">(None / General Faculty)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Profile Photo / Media Asset */}
                <div className="form-group">
                  <label htmlFor="staff-media-select" className="form-label">
                    Profile Photo (Media Library)
                  </label>
                  <select
                    id="staff-media-select"
                    className="input"
                    value={profileMediaId}
                    onChange={(e) => setProfileMediaId(e.target.value)}
                  >
                    <option value="">(No Portrait Photo)</option>
                    {mediaAssets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qualifications */}
                <div className="form-group">
                  <label htmlFor="staff-qualifications-input" className="form-label">
                    Degrees & Qualifications
                  </label>
                  <input
                    id="staff-qualifications-input"
                    type="text"
                    className="input"
                    placeholder="e.g. Ph.D. Physics (Cambridge), M.Sc. Math"
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                  />
                </div>

                {/* Office Location */}
                <div className="form-group">
                  <label htmlFor="staff-office-input" className="form-label">
                    Office Location
                  </label>
                  <input
                    id="staff-office-input"
                    type="text"
                    className="input"
                    placeholder="e.g. Science Block, Suite 304"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                  />
                </div>

                {/* Consultation Hours */}
                <div className="form-group">
                  <label htmlFor="staff-hours-input" className="form-label">
                    Public Consultation Hours
                  </label>
                  <input
                    id="staff-hours-input"
                    type="text"
                    className="input"
                    placeholder="e.g. Mon & Wed 2:00 PM - 4:00 PM"
                    value={consultationHours}
                    onChange={(e) => setConsultationHours(e.target.value)}
                  />
                </div>

                {/* Website / Academic Profile URL */}
                <div className="form-group">
                  <label htmlFor="staff-website-input" className="form-label">
                    Personal / Academic Website URL
                  </label>
                  <input
                    id="staff-website-input"
                    type="url"
                    className="input"
                    placeholder="https://research.institution.edu"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>

                {/* Order Index */}
                <div className="form-group">
                  <label htmlFor="staff-order-input" className="form-label">
                    Display Order Index
                  </label>
                  <input
                    id="staff-order-input"
                    type="number"
                    className="input"
                    value={orderIndex}
                    onChange={(e) => setOrderIndex(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Subjects / Specializations (Full width) */}
              <div className="form-group">
                <label htmlFor="staff-subjects-input" className="form-label">
                  Subjects & Areas of Expertise (Comma-separated)
                </label>
                <input
                  id="staff-subjects-input"
                  type="text"
                  className="input"
                  placeholder="e.g. Advanced Physics, Quantum Mechanics, Multivariable Calculus"
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                />
              </div>

              {/* APPROVED PUBLIC CONTACT DISCLOSURE SECTION */}
              <fieldset
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  background: 'rgba(30, 41, 59, 0.4)',
                }}
              >
                <legend style={{ padding: '0 0.5rem', fontWeight: 600, color: '#38bdf8', fontSize: '0.9rem' }}>
                  Approved Public Contact Details (FR-ACAD-003 Privacy Allowlist)
                </legend>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Contact details are private by default. Check explicit authorization boxes below to approve public display on the institution website.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label htmlFor="staff-email-input" className="form-label">
                      Institutional Email Address
                    </label>
                    <input
                      id="staff-email-input"
                      type="email"
                      className="input"
                      placeholder="e.g. e.vance@oxford.school.example"
                      value={publicEmail}
                      onChange={(e) => setPublicEmail(e.target.value)}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', cursor: 'pointer' }}>
                      <input
                        id="staff-display-email-checkbox"
                        type="checkbox"
                        checked={displayEmail}
                        onChange={(e) => setDisplayEmail(e.target.checked)}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#f8fafc' }}>
                        Approve email for public display
                      </span>
                    </label>
                  </div>

                  <div>
                    <label htmlFor="staff-phone-input" className="form-label">
                      Office Telephone Number
                    </label>
                    <input
                      id="staff-phone-input"
                      type="text"
                      className="input"
                      placeholder="e.g. +44 1865 270001"
                      value={publicPhone}
                      onChange={(e) => setPublicPhone(e.target.value)}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', cursor: 'pointer' }}>
                      <input
                        id="staff-display-phone-checkbox"
                        type="checkbox"
                        checked={displayPhone}
                        onChange={(e) => setDisplayPhone(e.target.checked)}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#f8fafc' }}>
                        Approve telephone for public display
                      </span>
                    </label>
                  </div>
                </div>
              </fieldset>

              {/* Biography (Full width) */}
              <div className="form-group">
                <label htmlFor="staff-biography-input" className="form-label">
                  Public Biography
                </label>
                <textarea
                  id="staff-biography-input"
                  className="input"
                  rows={4}
                  placeholder="Professional academic background, pedagogical philosophy, and student mentorship focus..."
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                />
              </div>

              {/* Internal Notes (Private) */}
              <div className="form-group">
                <label htmlFor="staff-notes-input" className="form-label" style={{ color: '#fbbf24' }}>
                  🔒 Internal Confidential Notes (Never Exposed Publicly)
                </label>
                <textarea
                  id="staff-notes-input"
                  className="input"
                  rows={2}
                  placeholder="Administrative notes, departmental budgeting responsibilities, internal review dates..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                />
              </div>

              {/* Status and Flags */}
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="staff-status-select" className="form-label">
                    Publication Status
                  </label>
                  <select
                    id="staff-status-select"
                    className="input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.5rem' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>Active Profile</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1.5rem' }}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#f8fafc' }}>Featured Faculty Member</span>
                </label>
              </div>

              {/* Modal footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  id="staff-submit-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving Profile...' : editingStaff ? 'Update Staff Profile' : 'Create Staff Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
