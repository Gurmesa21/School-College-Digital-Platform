'use client';

import React, { useState, useEffect } from 'react';
import type { PublicFormDto, FormFieldDto } from '@school/shared';

interface DynamicPublicFormProps {
  slug: string;
  tenantSlug?: string;
  isEmbedded?: boolean;
  onSuccess?: () => void;
}

export default function DynamicPublicForm({ slug, tenantSlug = 'oxford', isEmbedded = false, onSuccess }: DynamicPublicFormProps) {
  const [form, setForm] = useState<PublicFormDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submissionRef, setSubmissionRef] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    let isMounted = true;
    const fetchForm = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`${apiUrl}/api/v1/tenant/public/forms/${slug}`, {
          headers: {
            'x-tenant-id': tenantSlug,
            'Accept': 'application/json',
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`The form "${slug}" is currently closed or does not exist.`);
          }
          throw new Error(`Failed to load form (Status: ${res.status})`);
        }

        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setForm(json.data);
            // Initialize default form values
            const initial: Record<string, any> = {};
            (json.data.fields || []).forEach((f: FormFieldDto) => {
              initial[f.name] = f.defaultValue || '';
            });
            setFormData(initial);
          } else {
            throw new Error(json.error?.message || 'Failed to parse form schema');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err.message || 'Error connecting to form server');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchForm();
    return () => {
      isMounted = false;
    };
  }, [slug, tenantSlug, apiUrl]);

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear field-specific error upon typing
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setServerError(null);
    setFieldErrors({});

    // Client-side quick validation
    const errors: Record<string, string> = {};
    for (const field of form.fields) {
      const val = formData[field.name];
      const isMissing =
        val === undefined ||
        val === null ||
        (typeof val === 'string' && val.trim() === '') ||
        (Array.isArray(val) && val.length === 0);

      if (field.isRequired && isMissing) {
        errors[field.name] = `${field.label} is required.`;
      } else if (!isMissing && field.fieldType === 'EMAIL') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim())) {
          errors[field.name] = `Please enter a valid email address.`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      // Generate client-side idempotency key
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `idmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch(`${apiUrl}/api/v1/tenant/public/forms/${slug}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantSlug,
          'x-idempotency-key': idempotencyKey,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          data: formData,
          _hp_company: honeypot, // Honeypot trap
          idempotencyKey,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.error?.details && Array.isArray(json.error.details)) {
          const detailMap: Record<string, string> = {};
          json.error.details.forEach((d: { field: string; message: string }) => {
            detailMap[d.field] = d.message;
          });
          setFieldErrors(detailMap);
          setServerError('Please correct the highlighted fields and try again.');
        } else {
          setServerError(json.error?.message || 'Submission failed. Please try again.');
        }
        return;
      }

      setSubmissionRef(json.data?.referenceNumber || null);
      setSubmitSuccess(json.data?.message || form.successMessage || 'Submission received successfully!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setServerError(err.message || 'Network error encountered while sending submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dynamic-form-loading" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading form details...</p>
      </div>
    );
  }

  if (fetchError || !form) {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '2rem auto', textAlign: 'center', border: '1px solid var(--border-color)' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Form Unavailable</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{fetchError || 'Unable to display form.'}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary">
          Try Again
        </button>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div
        className="card"
        style={{
          maxWidth: '680px',
          margin: '2rem auto',
          padding: '2.5rem',
          textAlign: 'center',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
        }}
        role="alert"
        aria-live="polite"
      >
        <div
          style={{
            width: '4rem',
            height: '4rem',
            backgroundColor: 'var(--success, #10b981)',
            color: '#fff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.5rem auto',
          }}
        >
          ✓
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
          Submission Successful
        </h2>
        {submissionRef && (
          <div
            id="submission-reference-badge"
            style={{
              margin: '0 auto 1.25rem auto',
              padding: '0.5rem 1.25rem',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              display: 'inline-block',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reference Code: </span>
            <strong style={{ fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '0.05em' }}>
              {submissionRef}
            </strong>
          </div>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          {submitSuccess}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setSubmitSuccess(null);
            setSubmissionRef(null);
            const reset: Record<string, any> = {};
            form.fields.forEach((f) => {
              reset[f.name] = f.defaultValue || '';
            });
            setFormData(reset);
          }}
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <div
      className="card dynamic-form-container"
      style={{
        maxWidth: '720px',
        margin: '2rem auto',
        padding: '2.5rem',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--card-bg, #ffffff)',
      }}
    >
      <header style={{ marginBottom: '2rem' }}>
        {isEmbedded ? (
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            {form.title}
          </h2>
        ) : (
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            {form.title}
          </h1>
        )}
        {form.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.5' }}>
            {form.description}
          </p>
        )}
      </header>

      {serverError && (
        <div
          className="alert alert-danger"
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: 'var(--danger, #ef4444)',
            marginBottom: '1.5rem',
          }}
          role="alert"
        >
          <strong>Error: </strong> {serverError}
        </div>
      )}

      <form id={`public-form-${form.slug}`} onSubmit={handleSubmit} noValidate>
        {/* Anti-spam Honeypot (Invisible to real users, trap for bots) */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="_hp_company">Do not fill this field</label>
          <input
            type="text"
            id="_hp_company"
            name="_hp_company"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {form.fields.map((field) => {
            const hasError = !!fieldErrors[field.name];
            const errorId = `error-${field.name}`;
            const helpId = `help-${field.name}`;

            return (
              <div key={field.name} className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label
                  htmlFor={`field-${field.name}`}
                  style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}
                >
                  {field.label}{' '}
                  {field.isRequired && (
                    <span style={{ color: 'var(--danger, #ef4444)' }} title="Required">
                      *
                    </span>
                  )}
                </label>

                {field.helpText && (
                  <span id={helpId} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {field.helpText}
                  </span>
                )}

                {/* Render field control according to fieldType */}
                {field.fieldType === 'TEXT' || field.fieldType === 'EMAIL' || field.fieldType === 'PHONE' || field.fieldType === 'NUMBER' || field.fieldType === 'DATE' ? (
                  <input
                    id={`field-${field.name}`}
                    name={field.name}
                    type={
                      field.fieldType === 'EMAIL'
                        ? 'email'
                        : field.fieldType === 'PHONE'
                        ? 'tel'
                        : field.fieldType === 'NUMBER'
                        ? 'number'
                        : field.fieldType === 'DATE'
                        ? 'date'
                        : 'text'
                    }
                    placeholder={field.placeholder || ''}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.isRequired}
                    aria-required={field.isRequired}
                    aria-invalid={hasError}
                    aria-describedby={`${hasError ? errorId : ''} ${field.helpText ? helpId : ''}`.trim() || undefined}
                    className={`form-input ${hasError ? 'input-error' : ''}`}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: hasError ? '2px solid var(--danger, #ef4444)' : '1px solid var(--border-color)',
                      fontSize: '1rem',
                      width: '100%',
                      backgroundColor: 'var(--input-bg, #ffffff)',
                      color: 'var(--text-main)',
                    }}
                  />
                ) : field.fieldType === 'TEXTAREA' ? (
                  <textarea
                    id={`field-${field.name}`}
                    name={field.name}
                    placeholder={field.placeholder || ''}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    rows={4}
                    required={field.isRequired}
                    aria-required={field.isRequired}
                    aria-invalid={hasError}
                    aria-describedby={`${hasError ? errorId : ''} ${field.helpText ? helpId : ''}`.trim() || undefined}
                    className={`form-textarea ${hasError ? 'input-error' : ''}`}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: hasError ? '2px solid var(--danger, #ef4444)' : '1px solid var(--border-color)',
                      fontSize: '1rem',
                      width: '100%',
                      fontFamily: 'inherit',
                      backgroundColor: 'var(--input-bg, #ffffff)',
                      color: 'var(--text-main)',
                    }}
                  />
                ) : field.fieldType === 'SELECT' ? (
                  <select
                    id={`field-${field.name}`}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.isRequired}
                    aria-required={field.isRequired}
                    aria-invalid={hasError}
                    aria-describedby={`${hasError ? errorId : ''} ${field.helpText ? helpId : ''}`.trim() || undefined}
                    className={`form-select ${hasError ? 'input-error' : ''}`}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: hasError ? '2px solid var(--danger, #ef4444)' : '1px solid var(--border-color)',
                      fontSize: '1rem',
                      width: '100%',
                      backgroundColor: 'var(--input-bg, #ffffff)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="">-- Please Select --</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.fieldType === 'RADIO' ? (
                  <fieldset
                    style={{ border: 'none', padding: 0, margin: 0 }}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {(field.options || []).map((opt) => (
                        <label
                          key={opt.value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                          }}
                        >
                          <input
                            type="radio"
                            name={field.name}
                            value={opt.value}
                            checked={formData[field.name] === opt.value}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : field.fieldType === 'CHECKBOX' ? (
                  <fieldset
                    style={{ border: 'none', padding: 0, margin: 0 }}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : undefined}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {(field.options || []).map((opt) => {
                        const currentArr = Array.isArray(formData[field.name]) ? formData[field.name] : [];
                        const isChecked = currentArr.includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              cursor: 'pointer',
                              fontSize: '0.95rem',
                            }}
                          >
                            <input
                              type="checkbox"
                              name={field.name}
                              value={opt.value}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleInputChange(field.name, [...currentArr, opt.value]);
                                } else {
                                  handleInputChange(
                                    field.name,
                                    currentArr.filter((item: string) => item !== opt.value)
                                  );
                                }
                              }}
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                {hasError && (
                  <span
                    id={errorId}
                    style={{
                      color: 'var(--danger, #ef4444)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      marginTop: '0.2rem',
                    }}
                    role="alert"
                  >
                    {fieldErrors[field.name]}
                  </span>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: '1rem' }}>
            <button
              id="form-submit-btn"
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.9rem',
                fontSize: '1.05rem',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting...' : form.submitButtonText || 'Submit'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
