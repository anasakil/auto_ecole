'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { TenantProvider } from '@/contexts/TenantContext';
import Sidebar from '@/components/Sidebar';

function MobileTopBar({ schoolName, logoUrl, onToggleSidebar }) {
  return (
    <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {logoUrl ? (
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 overflow-hidden flex-shrink-0">
              <img src={logoUrl} alt={schoolName} className="w-full h-full object-contain p-0.5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)' }}>
              <span className="text-white font-bold text-xs">
                {schoolName ? schoolName.substring(0, 2).toUpperCase() : 'AE'}
              </span>
            </div>
          )}
          <h1 className="text-sm font-semibold text-gray-900 truncate">
            {schoolName || 'Auto-École'}
          </h1>
        </div>
      </div>
    </div>
  );
}

function MobileOverlay({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
      onClick={onClose}
    />
  );
}

export default function TenantLayout({ children }) {
  const { slug } = useParams();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);

  // Login page gets a clean layout without sidebar
  const isLoginPage = pathname === `/${slug}/login`;

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSchoolInfoLoaded = useCallback((info) => {
    if (info.name) setSchoolName(info.name);
    if (info.logoUrl) setLogoUrl(info.logoUrl);
  }, []);

  if (isLoginPage) {
    return children;
  }

  return (
    <TenantProvider slug={slug}>
      <div className="flex h-screen overflow-hidden bg-surface-100">
        {/* Desktop sidebar - always visible on lg+ */}
        <div className="hidden lg:flex">
          <Sidebar onSchoolInfoLoaded={handleSchoolInfoLoaded} />
        </div>

        {/* Mobile sidebar - slides in from left */}
        <MobileOverlay isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar onSchoolInfoLoaded={handleSchoolInfoLoaded} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <MobileTopBar
            schoolName={schoolName}
            logoUrl={logoUrl}
            onToggleSidebar={() => setMobileOpen(prev => !prev)}
          />
          <main className="flex-1 overflow-auto">
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
