'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import api from '@/utils/api';

const menuPaths = [
  { path: '', label: 'Tableau de bord', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/students', label: 'Étudiants', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { path: '/attendance', label: 'Scanner QR', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { path: '/presences-absences', label: 'Présences/Absences', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/obtenir-permis', label: 'Permis Obtenus', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { path: '/stages', label: 'Stages & Examens', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/payments', label: 'Paiements', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { path: '/invoices', label: 'Factures', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { path: '/alerts', label: 'Alertes', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { path: '/offers', label: 'Offres', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  { path: '/settings', label: 'Paramètres', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function Sidebar({ onSchoolInfoLoaded }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { slug } = useTenant();
  const [alertCounts, setAlertCounts] = useState({ total: 0, danger: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);

  const menuItems = menuPaths.map(item => ({
    ...item,
    fullPath: `/${slug}${item.path}`,
  }));

  useEffect(() => {
    api.alerts.getCounts().then(setAlertCounts).catch(() => {});
    const interval = setInterval(() => {
      api.alerts.getCounts().then(setAlertCounts).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch school info (name + logo)
  useEffect(() => {
    api.settings.get().then(async (data) => {
      if (data) {
        const name = data.school_name || '';
        setSchoolName(name);
        let base64Logo = null;
        if (data.logo) {
          try {
            base64Logo = await api.files.getBase64(data.logo);
            if (base64Logo) setLogoUrl(base64Logo);
          } catch {}
        }
        if (onSchoolInfoLoaded) onSchoolInfoLoaded({ name, logoUrl: base64Logo });
      }
    }).catch(() => {});
  }, []);

  return (
    <aside
      className={`flex flex-col transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
      style={{
        background: 'linear-gradient(180deg, #6C5CE7 0%, #4834D4 100%)',
      }}
    >
      {/* School branding */}
      <div className={`flex items-center ${collapsed ? 'justify-center p-4' : 'justify-between px-4 py-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white flex-shrink-0 overflow-hidden shadow-sm">
                <img src={logoUrl} alt={schoolName} className="w-full h-full object-contain p-0.5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">{schoolName || 'Auto-École'}</h1>
              <p className="text-[10px] text-white/50 truncate">Gestion des étudiants</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <div className="w-full h-full bg-white p-0.5 rounded-xl">
                <img src={logoUrl} alt={schoolName} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center rounded-xl">
                <span className="text-white font-bold text-xs">
                  {schoolName ? schoolName.substring(0, 2).toUpperCase() : 'AE'}
                </span>
              </div>
            )}
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Separator */}
      <div className={`mx-auto bg-white/15 h-px ${collapsed ? 'w-10' : 'w-[calc(100%-32px)]'}`} />

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 px-3.5">
            <button
              onClick={() => setCollapsed(false)}
              className="w-11 h-11 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/70 transition-colors mb-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
            {menuItems.map((item) => {
              const isActive = item.path === ''
                ? pathname === `/${slug}`
                : pathname.startsWith(item.fullPath);
              return (
                <Link
                  key={item.fullPath}
                  href={item.fullPath}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/65 hover:bg-white/10 hover:text-white/90'
                  }`}
                  title={item.label}
                >
                  <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-3">
            {menuItems.map((item) => {
              const isActive = item.path === ''
                ? pathname === `/${slug}`
                : pathname.startsWith(item.fullPath);
              return (
                <Link
                  key={item.fullPath}
                  href={item.fullPath}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/65 hover:bg-white/10 hover:text-white/90'
                  }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="flex-1">{item.label}</span>
                  {item.path === '/alerts' && alertCounts.total > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      alertCounts.danger > 0
                        ? 'bg-red-400/30 text-white'
                        : 'bg-yellow-400/30 text-white'
                    }`}>
                      {alertCounts.total}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/15 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username || 'Admin'}</p>
              <p className="text-xs text-white/50">Administrateur</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              title="Déconnexion"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={logout}
              className="w-11 h-11 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors flex items-center justify-center"
              title="Déconnexion"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
