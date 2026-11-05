'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ResolvedTenant } from '@school/shared';
import { formatInstitutionType, NavItem } from '@/lib/tenantTypes';

interface PublicHeaderProps {
  tenant?: ResolvedTenant | null;
  initialNav?: NavItem[];
}

const DEFAULT_HEADER_ITEMS: NavItem[] = [
  { id: 'def-1', label: 'Home', url: '/', orderIndex: 0 },
  { id: 'def-2', label: 'Academics', url: '/academics', orderIndex: 1 },
  { id: 'def-3', label: 'Staff Directory', url: '/staff', orderIndex: 2 },
  { id: 'def-4', label: 'News & Notices', url: '/news', orderIndex: 3 },
  { id: 'def-5', label: 'Events Calendar', url: '/events', orderIndex: 4 },
  { id: 'def-6', label: 'Admissions', url: '/admissions', orderIndex: 5 },
  { id: 'def-7', label: 'Contact', url: '/contact', orderIndex: 6 },
];

export default function PublicHeader({ tenant, initialNav }: PublicHeaderProps) {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<NavItem[]>(
    initialNav && initialNav.length > 0 ? initialNav : DEFAULT_HEADER_ITEMS
  );
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If initialNav updates or wasn't supplied, sync or fetch client-side if needed
  useEffect(() => {
    if (initialNav && initialNav.length > 0) {
      setNavItems(initialNav);
      return;
    }

    const fetchNav = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/v1/tenant/public/navigation/HEADER`, {
          headers: {
            Host: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && Array.isArray(json.data.items) && json.data.items.length > 0) {
            setNavItems(json.data.items);
          }
        }
      } catch {
        // Fall back gracefully to DEFAULT_HEADER_ITEMS
      }
    };

    fetchNav();
  }, [initialNav]);

  const crestIcon =
    tenant?.institutionType === 'KINDERGARTEN'
      ? '🎨'
      : tenant?.institutionType === 'TVET_TRAINING_CENTRE'
      ? '⚙️'
      : '🏛️';

  const brandName = tenant?.name || 'School Platform';
  const brandSub = tenant?.institutionType
    ? formatInstitutionType(tenant.institutionType)
    : 'Primary & Secondary Education';

  return (
    <header role="banner" className="public-navbar-container">
      <div className="public-navbar-inner">
        <Link href="/" className="public-brand-link">
          <span className="public-brand-crest" aria-hidden="true">{crestIcon}</span>
          <div className="public-brand-text">
            <span className="public-brand-name">{brandName}</span>
            <span className="public-brand-sub">{brandSub}</span>
          </div>
        </Link>

        {/* Mobile Toggle Button */}
        <button
          id="mobile-nav-toggle-btn"
          className="mobile-nav-toggle"
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-navigation"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
        </button>

        {/* Desktop / Collapsible Navigation */}
        <nav
          id="primary-navigation"
          role="navigation"
          aria-label="Main"
          className={`public-nav-menu ${mobileMenuOpen ? 'is-open open' : ''}`}
        >
          <ul className="public-nav-list" role="menubar">
            {navItems
              .filter((item) => !item.url.startsWith('/admin'))
              .map((item) => {
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const isDropdownOpen = activeDropdown === item.id;
              const isActive = item.url === '/' ? pathname === '/' : pathname.startsWith(item.url);

              if (hasChildren) {
                return (
                  <li
                    key={item.id}
                    className="public-nav-item has-dropdown"
                    role="none"
                    onMouseEnter={() => setActiveDropdown(item.id)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <button
                      type="button"
                      className={`public-nav-link dropdown-toggle ${isActive ? 'is-active' : ''}`}
                      aria-haspopup="true"
                      aria-expanded={isDropdownOpen}
                      onClick={() => setActiveDropdown(isDropdownOpen ? null : item.id)}
                    >
                      {item.label}
                      <span className="dropdown-caret" aria-hidden="true">&#9662;</span>
                    </button>
                    {isDropdownOpen && (
                      <ul className="public-dropdown-menu" role="menu" aria-label={`${item.label} Submenu`}>
                        {item.children!.map((sub) => {
                          const isSubActive = pathname === sub.url;
                          return (
                            <li key={sub.id} role="none">
                              <Link
                                href={sub.url}
                                target={sub.target || '_self'}
                                className={`public-dropdown-link ${isSubActive ? 'is-active' : ''}`}
                                role="menuitem"
                                aria-current={isSubActive ? 'page' : undefined}
                                onClick={() => {
                                  setActiveDropdown(null);
                                  setMobileMenuOpen(false);
                                }}
                              >
                                {sub.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.id} className="public-nav-item" role="none">
                  <Link
                    href={item.url}
                    target={item.target || '_self'}
                    className={`public-nav-link ${isActive ? 'is-active' : ''}`}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="public-nav-actions">
            <Link
              href="/search"
              className="public-nav-search-btn"
              aria-label="Search institutional website"
              id="nav-search-button"
            >
              <span aria-hidden="true">🔍</span> Search
            </Link>
            <Link
              href="/admissions"
              className="btn btn-primary btn-sm public-admissions-btn public-header-apply-cta"
              style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Admissions Inquiry &rarr;
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
