'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

function StatCard({ title, value, icon, color }) {
  const gradients = {
    primary: 'from-primary-500 to-primary-400',
    success: 'from-accent-green to-emerald-300',
    info: 'from-accent-blue to-blue-300',
    warning: 'from-accent-yellow to-amber-300',
  };

  return (
    <div className={`bg-gradient-to-br ${gradients[color] || gradients.primary} rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow duration-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface-200 rounded-2xl h-[104px]" />
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-soft p-6">
        <div className="h-6 w-48 bg-surface-200 rounded mb-6" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 py-4 border-b border-surface-100">
            <div className="h-4 w-32 bg-surface-200 rounded" />
            <div className="h-4 w-24 bg-surface-200 rounded" />
            <div className="h-4 w-20 bg-surface-200 rounded" />
            <div className="h-4 w-16 bg-surface-200 rounded" />
            <div className="h-4 w-24 bg-surface-200 rounded" />
            <div className="h-4 w-16 bg-surface-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/super-admin/dashboard');
      if (!res.ok) throw new Error('Erreur lors du chargement des donnees');
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.message || 'Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="bg-accent-red/5 border border-accent-red/20 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent-red/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-accent-red font-medium">{error}</p>
        <button
          onClick={() => { setError(''); setLoading(true); fetchDashboard(); }}
          className="mt-4 px-5 py-2.5 bg-accent-red text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium"
        >
          Reessayer
        </button>
      </div>
    );
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-MA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0) + ' MAD';
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="mb-8">
        <p className="text-xs font-medium text-dark-muted tracking-wider uppercase">Administration</p>
        <h1 className="text-2xl font-bold text-dark">Tableau de bord</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total Auto-Ecoles"
          value={data.totalAutoEcoles || 0}
          color="primary"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          title="Auto-Ecoles Actives"
          value={data.activeAutoEcoles || 0}
          color="success"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Total Etudiants"
          value={data.totalStudents || 0}
          color="info"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          title="Revenu Total"
          value={formatCurrency(data.totalRevenue)}
          color="warning"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Auto-Ecoles Table */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark">Auto-ecoles</h2>
          <Link
            href="/super-admin/ecoles"
            className="text-sm text-primary-500 hover:text-primary-700 font-medium"
          >
            Voir tout
          </Link>
        </div>

        {data.autoEcoles && data.autoEcoles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Etudiants</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Revenu</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Date de creation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {data.autoEcoles.map((ecole) => (
                  <tr key={ecole.id} className="hover:bg-surface-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary-500">{ecole.name?.charAt(0)}</span>
                        </div>
                        <Link href={`/super-admin/ecoles/${ecole.id}`} className="font-medium text-primary-500 hover:text-primary-700">
                          {ecole.name}
                        </Link>
                        <Link
                          href={`/${ecole.slug}`}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors"
                          title="Voir le tableau de bord"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <code className="bg-surface-100 px-2 py-1 rounded-lg text-xs text-dark-light">{ecole.slug}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-light">{ecole.admin_username || '-'}</td>
                    <td className="px-6 py-4 text-sm text-dark font-medium">{ecole.student_count || 0}</td>
                    <td className="px-6 py-4 text-sm text-dark">{formatCurrency(ecole.revenue)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        ecole.active
                          ? 'bg-accent-green/10 text-accent-green'
                          : 'bg-accent-red/10 text-accent-red'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${ecole.active ? 'bg-accent-green' : 'bg-accent-red'}`} />
                        {ecole.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-muted">{formatDate(ecole.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-dark-muted mb-4">Aucune auto-ecole enregistree</p>
            <Link
              href="/super-admin/ecoles/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium shadow-purple"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Creer une auto-ecole
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
