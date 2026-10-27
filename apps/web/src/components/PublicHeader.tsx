'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface NavItem {
  id: string;
  label: string;
  url: string;
  target?: '_self' | '_blank';
  orderIndex: number;
  children?: NavItem[];
}

interface PublicNavResponse {
  success: boolean;
  data?: {
    location: string;
    title: string;
    items: NavItem[];
  };
}

const DEFAULT_HEADER_ITEMS: NavItem[] = [
  { id: 'def-1', label: 'Home', url: '/', orderIndex: 0 },
  { id: 'def-2', label: 'Admissions', url: '/admissions', orderIndex: 1 },
  { id: 'def-3', label: 'Academics', url: '/academics', orderIndex: 2 },
  { id: 'def-4', label: 'Campus Life', url: '/campus-life', orderIndex: 3 },
  { id: 'def-5', label: 'News & Events', url: '/news', orderIndex: 4 },
];

export default function PublicHeader() {
  const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_HEADER_ITEMS);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchNav = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/v1/tenant/public/navigation/HEADER`, {
          headers: {
            'x-tenant-id': 'oxford',
          },
        });
        if (res.ok) {
          const json: PublicNavResponse = await res.json();
          if (json.success && json.data && Array.isArray(json.data.items) && json.data.items.length > 0) {
            setNavItems(json.data.items);
          }
        }
      } catch {
        // Fall back gracefully to DEFAULT_HEADER_ITEMS
      }
    };

    fetchNav();
  }, []);

  return (
    <header role="banner" className="public-navbar-container">
      <div className="public-navbar-inner">
        <Link href="/" className="public-brand-link" aria-label="School Platform Home">
          <span className="public-brand-crest" aria-hidden="true">🏛️</span>
          <div className="public-brand-text">
            <span className="public-brand-name">Oxford Institution</span>
            <span className="public-brand-sub">Digital Platform</span>
          </div>
        </Link>

        {/* Mobile Toggle Button */}
        <button
          className="mobile-nav-toggle"
          aria-expanded={mobileMenuOpen}
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
          className={`public-nav-menu ${mobileMenuOpen ? 'is-open' : ''}`}
        >
          <ul className="public-nav-list" role="menubar">
            {navItems.map((item) => {
              const hasChildren = Boolean(item.children && item.children.length > 0);
              const isDropdownOpen = activeDropdown === item.id;

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
                      className="public-nav-link dropdown-toggle"
                      aria-haspopup="true"
                      aria-expanded={isDropdownOpen}
                      onClick={() => setActiveDropdown(isDropdownOpen ? null : item.id)}
                    >
                      {item.label}
                      <span className="dropdown-caret" aria-hidden="true">&#9662;</span>
                    </button>
                    {isDropdownOpen && (
                      <ul className="public-dropdown-menu" role="menu" aria-label={`${item.label} Submenu`}>
                        {item.children!.map((sub) => (
                          <li key={sub.id} role="none">
                            <Link
                              href={sub.url}
                              target={sub.target || '_self'}
                              className="public-dropdown-link"
                              role="menuitem"
                              onClick={() => {
                                setActiveDropdown(null);
                                setMobileMenuOpen(false);
                              }}
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
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
                    className="public-nav-link"
                    role="menuitem"
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
            <Link href="/admin" className="btn btn-secondary btn-sm admin-portal-btn">
              Admin Console &rarr;
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
