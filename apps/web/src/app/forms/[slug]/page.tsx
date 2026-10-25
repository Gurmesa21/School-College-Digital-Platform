import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import DynamicPublicForm from '@/components/DynamicPublicForm';

interface FormPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: FormPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} | Oxford International School`,
    description: `Official online form submission for Oxford International School.`,
  };
}

export default async function PublicFormPage({ params }: FormPageProps) {
  const { slug } = await params;

  return (
    <main id="main-content" style={{ minHeight: '80vh', padding: '2rem 1rem' }}>
      <nav aria-label="Breadcrumb" style={{ maxWidth: '720px', margin: '0 auto 1.5rem auto', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          &larr; Return to Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Form</span>
      </nav>

      <DynamicPublicForm slug={slug} tenantSlug="oxford" />
    </main>
  );
}
