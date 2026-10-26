'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { NewsArticleDto, MediaAssetDto } from '@school/shared';

interface NewsAdminViewProps {
  apiBaseUrl: string;
  tenantSlug: string;
  getHeaders: () => Record<string, string>;
  setGlobalNotice: (notice: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

export default function NewsAdminView({
  apiBaseUrl,
  tenantSlug,
  getHeaders,
  setGlobalNotice,
}: NewsAdminViewProps) {
  const [articles, setArticles] = useState<NewsArticleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [mediaAssets, setMediaAssets] = useState<MediaAssetDto[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticleDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [featuredMediaId, setFeaturedMediaId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (searchQuery.trim()) query.set('search', searchQuery.trim());
      query.set('limit', '100');

      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/news?${query.toString()}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch news articles');
      }
      setArticles(data.data?.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, getHeaders, statusFilter, searchQuery]);

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
      // Ignore media fetch failure
    }
  }, [apiBaseUrl, getHeaders]);

  useEffect(() => {
    fetchNews();
    fetchMedia();
  }, [fetchNews, fetchMedia]);

  const openCreateModal = () => {
    setEditingArticle(null);
    setTitle('');
    setSlug('');
    setSummary('');
    setBody('');
    setAuthorName('');
    setFeaturedMediaId('');
    setTagsInput('');
    setStatus('DRAFT');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (article: NewsArticleDto) => {
    setEditingArticle(article);
    setTitle(article.title);
    setSlug(article.slug);
    setSummary(article.summary || '');
    setBody(article.body);
    setAuthorName(article.authorName || '');
    setFeaturedMediaId(article.featuredMediaId || '');
    setTagsInput((article.tags || []).join(', '));
    setStatus(article.status);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!editingArticle) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: any = {
      title,
      slug,
      summary: summary.trim() || null,
      body,
      authorName: authorName.trim() || null,
      featuredMediaId: featuredMediaId || null,
      tags,
      status,
    };

    try {
      const url = editingArticle
        ? `${apiBaseUrl}/api/v1/tenant/cms/news/${editingArticle.id}`
        : `${apiBaseUrl}/api/v1/tenant/cms/news`;
      const method = editingArticle ? 'PUT' : 'POST';

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
        throw new Error(data.error?.message || 'Failed to save news article');
      }

      setGlobalNotice({
        type: 'success',
        message: editingArticle
          ? `Article '${title}' updated successfully.`
          : `Article '${title}' created successfully.`,
      });
      setIsModalOpen(false);
      fetchNews();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (article: NewsArticleDto) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/news/${article.id}/publish`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to publish article');
      setGlobalNotice({ type: 'success', message: `Article '${article.title}' is now PUBLISHED.` });
      fetchNews();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message });
    }
  };

  const handleArchive = async (article: NewsArticleDto) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/news/${article.id}/archive`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to archive article');
      setGlobalNotice({ type: 'info', message: `Article '${article.title}' has been ARCHIVED.` });
      fetchNews();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (article: NewsArticleDto) => {
    if (!window.confirm(`Are you sure you want to delete news article '${article.title}'?`)) {
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/news/${article.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to delete article');
      setGlobalNotice({ type: 'success', message: `Article '${article.title}' deleted.` });
      fetchNews();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="news-admin-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
            News Gazette & Editorial Articles
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Author, edit, publish, and manage long-form stories and campus journalism for {tenantSlug}.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary" id="btn-create-news">
          + Author New Story
        </button>
      </div>

      {/* Filter and Search Bar */}
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
            placeholder="Search news by title, summary, or body..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ width: '100%', padding: '0.45rem 0.75rem', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="news-status-filter" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Status:
          </label>
          <select
            id="news-status-filter"
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

      {/* Error state */}
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Table Listing */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading editorial news records...
          </div>
        ) : articles.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
              No news articles found matching the selected criteria.
            </p>
            <button onClick={openCreateModal} className="btn btn-secondary btn-sm">
              Create First Article Draft
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Title & Slug</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Author / Source</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Published Date</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Tags</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((item) => {
                  const statusBg =
                    item.status === 'PUBLISHED'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : item.status === 'DRAFT'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(148, 163, 184, 0.15)';
                  const statusColor =
                    item.status === 'PUBLISHED'
                      ? '#10b981'
                      : item.status === 'DRAFT'
                      ? '#f59e0b'
                      : '#94a3b8';

                  const pubDateStr = item.publishedAt
                    ? new Date(item.publishedAt).toLocaleDateString('en-GB')
                    : 'Not published';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <strong style={{ color: '#f8fafc', display: 'block' }}>{item.title}</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/{item.slug}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: statusBg,
                            color: statusColor,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                        {item.authorName || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                        {pubDateStr}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {item.tags && item.tags.length > 0 ? (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {item.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {t}
                              </span>
                            ))}
                            {item.tags.length > 3 && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                +{item.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => openEditModal(item)}
                            className="btn btn-secondary btn-sm"
                            aria-label={`Edit article ${item.title}`}
                          >
                            Edit
                          </button>
                          {item.status !== 'PUBLISHED' && (
                            <button
                              onClick={() => handlePublish(item)}
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                              aria-label={`Publish article ${item.title}`}
                            >
                              Publish
                            </button>
                          )}
                          {item.status === 'PUBLISHED' && (
                            <button
                              onClick={() => handleArchive(item)}
                              className="btn btn-secondary btn-sm"
                              aria-label={`Archive article ${item.title}`}
                            >
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#ef4444' }}
                            aria-label={`Delete article ${item.title}`}
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
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="news-modal-title">
          <div className="modal-content" style={{ maxWidth: '680px', width: '90%' }}>
            <div className="modal-header">
              <h3 id="news-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc', margin: 0 }}>
                {editingArticle ? `Edit News Article: ${editingArticle.title}` : 'Author New News Article'}
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
                  <label htmlFor="news-title">Story Headline / Title *</label>
                  <input
                    id="news-title"
                    type="text"
                    required
                    value={title}
                    onChange={handleTitleChange}
                    className="input"
                    placeholder="e.g. Oxford Unveils Cutting-Edge STEM Innovation Wing"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="news-slug">URL Slug *</label>
                  <input
                    id="news-slug"
                    type="text"
                    required
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    title="Lowercase alphanumeric with hyphens only"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="input"
                    placeholder="stem-innovation-wing-inauguration"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="news-summary">Summary / Lead Excerpt</label>
                  <textarea
                    id="news-summary"
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="input"
                    placeholder="Brief 1-2 sentence lead paragraph shown in listings..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="news-body">Full Story Content (Long-form) *</label>
                  <textarea
                    id="news-body"
                    rows={7}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="input"
                    placeholder="Detailed news article content with paragraph breaks..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="news-author">Author / Source Attribution</label>
                    <input
                      id="news-author"
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="input"
                      placeholder="e.g. Campus Editorial Desk"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="news-status">Publication Status</label>
                    <select
                      id="news-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="input"
                    >
                      <option value="DRAFT">DRAFT (Private)</option>
                      <option value="PUBLISHED">PUBLISHED (Public)</option>
                      <option value="ARCHIVED">ARCHIVED (Archived)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="news-media">Featured Cover Image (Media Library)</label>
                  <select
                    id="news-media"
                    value={featuredMediaId}
                    onChange={(e) => setFeaturedMediaId(e.target.value)}
                    className="input"
                  >
                    <option value="">-- No Featured Image --</option>
                    {mediaAssets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.storagePolicy})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="news-tags">Tags (comma separated)</label>
                  <input
                    id="news-tags"
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="input"
                    placeholder="e.g. STEM, Campus Development, Academics"
                  />
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
                  {saving ? 'Saving...' : editingArticle ? 'Update Story' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
