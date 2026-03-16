'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useConfirmDialog } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-40 bg-surface-200 rounded mb-2" />
          <div className="h-4 w-64 bg-surface-200 rounded" />
        </div>
        <div className="h-10 w-48 bg-surface-200 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl shadow-soft p-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 py-4 border-b border-surface-100">
            <div className="h-4 w-36 bg-surface-200 rounded" />
            <div className="h-4 w-24 bg-surface-200 rounded" />
            <div className="h-4 w-28 bg-surface-200 rounded" />
            <div className="h-4 w-16 bg-surface-200 rounded" />
            <div className="h-4 w-20 bg-surface-200 rounded" />
            <div className="h-4 w-24 bg-surface-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EcolesPage() {
  const [ecoles, setEcoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toast = useToast();
  const { confirmDelete } = useConfirmDialog();

  useEffect(() => {
    fetchEcoles();
  }, []);

  async function fetchEcoles() {
    try {
      const res = await fetch('/api/super-admin/ecoles');
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const data = await res.json();
      setEcoles(data);
    } catch (err) {
      console.error('Error fetching ecoles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(ecole) {
    const confirmed = await confirmDelete(ecole.name);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/super-admin/ecoles?id=${ecole.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      toast.success(`Auto-ecole "${ecole.name}" supprimee avec succes`);
      setEcoles((prev) => prev.filter((e) => e.id !== ecole.id));
    } catch (err) {
      console.error('Error deleting ecole:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  }

  if (loading) return <TableSkeleton />;

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
          onClick={() => { setError(''); setLoading(true); fetchEcoles(); }}
          className="mt-4 px-5 py-2.5 bg-accent-red text-white rounded-xl hover:opacity-90 transition-opacity text-sm font-medium"
        >
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-medium text-dark-muted tracking-wider uppercase">Gestion</p>
          <h1 className="text-2xl font-bold text-dark">Auto-ecoles</h1>
        </div>
        <Link
          href="/super-admin/ecoles/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all text-sm font-medium shadow-purple"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle Auto-Ecole
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        {ecoles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Etudiants</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-primary-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {ecoles.map((ecole) => (
                  <tr key={ecole.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary-500">{ecole.name?.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-dark">{ecole.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-surface-100 px-2 py-1 rounded-lg text-xs text-dark-light">{ecole.slug}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-light">{ecole.admin_username || '-'}</td>
                    <td className="px-6 py-4 text-sm text-dark font-medium">{ecole.student_count || 0}</td>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/${ecole.slug}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors"
                          title="Voir le tableau de bord"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                        <Link
                          href={`/super-admin/ecoles/${ecole.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-100 text-dark-light hover:bg-surface-200 transition-colors"
                          title="Modifier"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(ecole)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-accent-red text-white hover:opacity-90 transition-opacity"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
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

      {ecoles.length > 0 && (
        <div className="mt-4 text-sm text-dark-muted text-center">
          {ecoles.length} auto-ecole{ecoles.length > 1 ? 's' : ''} enregistree{ecoles.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
