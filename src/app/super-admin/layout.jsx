'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SuperAdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const navLinks = [
    { href: '/super-admin', label: 'Tableau de bord', exact: true },
    { href: '/super-admin/ecoles', label: 'Auto-ecoles' },
  ];

  function isActive(link) {
    if (link.exact) return pathname === link.href;
    return pathname.startsWith(link.href);
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Branding */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-dark">Super Admin</h1>
                <p className="text-xs text-dark-muted">Gestion multi-ecoles</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-xl">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link)
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-dark-muted hover:text-dark'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-muted hover:text-accent-red hover:bg-accent-red/5 rounded-xl transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Deconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
