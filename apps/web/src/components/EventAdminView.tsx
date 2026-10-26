'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { EventItemDto, MediaAssetDto } from '@school/shared';

interface EventAdminViewProps {
  apiBaseUrl: string;
  tenantSlug: string;
  getHeaders: () => Record<string, string>;
  setGlobalNotice: (notice: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

const COMMON_TIMEZONES = [
  'UTC',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Africa/Addis_Ababa',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

const EVENT_CATEGORIES = [
  'GENERAL',
  'ACADEMIC',
  'SPORTS',
  'ARTS',
  'COMMUNITY',
  'CAMPUS',
];

export default function EventAdminView({
  apiBaseUrl,
  tenantSlug,
  getHeaders,
  setGlobalNotice,
}: EventAdminViewProps) {
  const [events, setEvents] = useState<EventItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [timeframeFilter, setTimeframeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [mediaAssets, setMediaAssets] = useState<MediaAssetDto[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventItemDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [coverMediaId, setCoverMediaId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [capacity, setCapacity] = useState<string>('');
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (timeframeFilter !== 'ALL') query.set('timeframe', timeframeFilter);
      if (categoryFilter !== 'ALL') query.set('category', categoryFilter);
      if (searchQuery.trim()) query.set('search', searchQuery.trim());
      query.set('limit', '100');

      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/events?${query.toString()}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch events');
      }
      setEvents(data.data?.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, getHeaders, statusFilter, timeframeFilter, categoryFilter, searchQuery]);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/media?category=IMAGE&limit=100`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMediaAssets(data.data?.items || []);
      }
    } catch {
      // media loading failure is non-fatal
    }
  }, [apiBaseUrl, getHeaders]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setSlug('');
    setDescription('');
    // Default starts tomorrow 10:00, ends tomorrow 12:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(12, 0, 0, 0);

    setStartsAt(tomorrow.toISOString().slice(0, 16));
    setEndsAt(tomorrowEnd.toISOString().slice(0, 16));
    setTimezone('UTC');
    setLocation('');
    setCategory('GENERAL');
    setCoverMediaId('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setCapacity('');
    setIsRegistrationOpen(false);
    setRegistrationUrl('');
    setStatus('DRAFT');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: EventItemDto) => {
    setEditingItem(item);
    setTitle(item.title);
    setSlug(item.slug);
    setDescription(item.description || '');
    setStartsAt(item.startsAt ? new Date(item.startsAt).toISOString().slice(0, 16) : '');
    setEndsAt(item.endsAt ? new Date(item.endsAt).toISOString().slice(0, 16) : '');
    setTimezone(item.timezone || 'UTC');
    setLocation(item.location || '');
    setCategory(item.category || 'GENERAL');
    setCoverMediaId(item.coverMediaId || '');
    setContactName(item.contactName || '');
    setContactEmail(item.contactEmail || '');
    setContactPhone(item.contactPhone || '');
    setCapacity(item.capacity != null ? String(item.capacity) : '');
    setIsRegistrationOpen(item.isRegistrationOpen || false);
    setRegistrationUrl(item.registrationUrl || '');
    setStatus(item.status);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingItem) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(generated);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    try {
      if (!title.trim()) throw new Error('Event title is required');
      if (!slug.trim()) throw new Error('Event slug is required');
      if (!startsAt) throw new Error('Start date/time is required');
      if (!endsAt) throw new Error('End date/time is required');

      const startDateObj = new Date(startsAt);
      const endDateObj = new Date(endsAt);
      if (endDateObj < startDateObj) {
        throw new Error('End time cannot be earlier than start time');
      }

      const payload: Record<string, any> = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        startsAt: startDateObj.toISOString(),
        endsAt: endDateObj.toISOString(),
        timezone: timezone.trim() || 'UTC',
        location: location.trim() || null,
        category: category.trim() || 'GENERAL',
        coverMediaId: coverMediaId || null,
        contactName: contactName.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        isRegistrationOpen,
        registrationUrl: registrationUrl.trim() || null,
        status,
      };

      const url = editingItem
        ? `${apiBaseUrl}/api/v1/tenant/cms/events/${editingItem.id}`
        : `${apiBaseUrl}/api/v1/tenant/cms/events`;
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || 'Failed to save event');
      }

      setGlobalNotice({
        type: 'success',
        message: `Event "${payload.title}" successfully ${editingItem ? 'updated' : 'created'}.`,
      });
      setIsModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (item: EventItemDto, newStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/events/${item.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update event status');
      }
      setGlobalNotice({
        type: 'success',
        message: `Event status updated to ${newStatus}.`,
      });
      fetchEvents();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (item: EventItemDto) => {
    if (!window.confirm(`Are you sure you want to delete event "${item.title}"?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/events/${item.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to delete event');
      }
      setGlobalNotice({
        type: 'success',
        message: `Event "${item.title}" successfully deleted.`,
      });
      fetchEvents();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Events Calendar Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Schedule school events, open days, athletic meets, and academic activities with timezone semantics (FR-EVT-001).
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Event
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search events by title or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Filter by Timeframe"
          >
            <option value="ALL">All Timeframes</option>
            <option value="UPCOMING">Upcoming Only</option>
            <option value="PAST">Past Only</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Filter by Category"
          >
            <option value="ALL">All Categories</option>
            {EVENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setSearchQuery('');
            setStatusFilter('ALL');
            setTimeframeFilter('ALL');
            setCategoryFilter('ALL');
          }}
          className="text-sm text-gray-500 hover:text-gray-800 underline self-center"
        >
          Reset Filters
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading events...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50">{error}</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 font-medium">No events found</p>
            <p className="text-sm text-gray-400 mt-1">Get started by creating your first school event.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time / Timezone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location & Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {events.map((evt) => {
                  const isPast = new Date(evt.endsAt) < new Date();
                  return (
                    <tr key={evt.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          {evt.coverMedia?.publicUrl ? (
                            <img
                              src={evt.coverMedia.publicUrl}
                              alt={evt.coverMedia.altText || evt.title}
                              className="w-12 h-12 object-cover rounded-md border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-500">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">{evt.title}</div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5">/{evt.slug}</div>
                            {evt.isRegistrationOpen && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                Registration Open
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                        <div className="font-medium">
                          {new Date(evt.startsAt).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: evt.timezone || 'UTC',
                          })}
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          {new Date(evt.startsAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZone: evt.timezone || 'UTC',
                          })}{' '}
                          -{' '}
                          {new Date(evt.endsAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZone: evt.timezone || 'UTC',
                          })}
                        </div>
                        <div className="text-[10px] text-indigo-600 font-mono mt-0.5 font-semibold">
                          TZ: {evt.timezone}
                        </div>
                        {isPast && (
                          <span className="inline-block mt-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                            Past Event
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-600">
                        <div>{evt.location || <span className="text-gray-400 italic">No venue set</span>}</div>
                        {evt.capacity != null && (
                          <div className="text-gray-400 mt-1">Cap: {evt.capacity} attendees</div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span className="px-2.5 py-1 font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                          {evt.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {evt.status === 'PUBLISHED' ? (
                          <span className="px-2.5 py-1 font-medium bg-green-50 text-green-700 rounded-full border border-green-200">
                            Published
                          </span>
                        ) : evt.status === 'ARCHIVED' ? (
                          <span className="px-2.5 py-1 font-medium bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                            Archived
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                            Draft
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                        <button
                          onClick={() => openEditModal(evt)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors"
                        >
                          Edit
                        </button>

                        {evt.status === 'PUBLISHED' ? (
                          <button
                            onClick={() => handleQuickStatus(evt, 'DRAFT')}
                            className="text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded transition-colors"
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuickStatus(evt, 'PUBLISHED')}
                            className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition-colors"
                          >
                            Publish
                          </button>
                        )}

                        {evt.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleQuickStatus(evt, 'ARCHIVED')}
                            className="text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          >
                            Archive
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(evt)}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingItem ? 'Edit Event' : 'Create School Event'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg p-1"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Autumn Open House 2026"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. autumn-open-house-2026"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {EVENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Publication Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="DRAFT">Draft (Staff Only)</option>
                    <option value="PUBLISHED">Published (Visible Publicly)</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              {/* Date & Time with Explicit Timezone */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Schedule & Timezone Semantics (FR-EVT-001)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Starts At *</label>
                    <input
                      type="datetime-local"
                      required
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Ends At *</label>
                    <input
                      type="datetime-local"
                      required
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Timezone *</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                    >
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Location & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Great Hall, Main Quadrangle"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Max Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Cover Media Asset */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Cover Image
                </label>
                <select
                  value={coverMediaId}
                  onChange={(e) => setCoverMediaId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No cover image</option>
                  {mediaAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({asset.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Event Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide comprehensive details about the schedule, agenda, parking, dress code, etc."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Registration & Contact */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Registration & Contact Information
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRegOpen"
                    checked={isRegistrationOpen}
                    onChange={(e) => setIsRegistrationOpen(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRegOpen" className="text-xs font-medium text-gray-700">
                    Open Public RSVP / Registration
                  </label>
                </div>

                {isRegistrationOpen && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">External Registration URL (optional)</label>
                    <input
                      type="url"
                      value={registrationUrl}
                      onChange={(e) => setRegistrationUrl(e.target.value)}
                      placeholder="https://events.school.edu/register"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Dr. Eleanor Vance"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="events@school.edu"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+44 1865 123456"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
