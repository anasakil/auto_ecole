'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import ExportButton from '@/components/ExportButton';
import { formatDate } from '@/utils/helpers';
import { CardPageSkeleton } from '@/components/skeletons';

const SEVERITY_STYLES = {
  danger: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-700', icon: 'text-red-500' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', icon: 'text-yellow-500' },
  info: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', icon: 'text-blue-500' },
  success: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', icon: 'text-green-500' },
};

const ALERT_ICONS = {
  payment_overdue: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  payment_upcoming: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  training_ending: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  training_expired: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  exam_upcoming: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  session_upcoming: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  stage_today: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  reminder: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
};

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const data = await api.alerts.getAll();
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = !filterSeverity || alert.severity === filterSeverity;
    const matchesType = !filterType || alert.type.includes(filterType);
    return matchesSeverity && matchesType;
  });

  const dangerCount = alerts.filter(a => a.severity === 'danger').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  // Export columns
  const exportColumns = [
    { key: 'severity', label: 'Sévérité', accessor: (a) => a.severity === 'danger' ? 'Urgent' : a.severity === 'warning' ? 'Avertissement' : 'Info' },
    { key: 'full_name', label: 'Étudiant' },
    { key: 'message', label: 'Message' },
    { key: 'details', label: 'Détails' },
  ];

  if (loading) {
    return <CardPageSkeleton cards={8} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertes & Notifications</h1>
          <p className="text-gray-500">Paiements, formations et séances à surveiller</p>
        </div>
        <div className="flex gap-3">
          <ExportButton
            data={filteredAlerts}
            columns={exportColumns}
            filename="alertes"
            title="Liste des Alertes"
            subtitle={`Urgentes: ${dangerCount} | Avertissements: ${warningCount}`}
          />
          <button onClick={loadAlerts} className="btn btn-secondary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-red-50 border-l-4 border-red-500">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm text-red-600">Urgentes</p>
              <p className="text-2xl font-bold text-red-700">{dangerCount}</p>
            </div>
          </div>
        </div>
        <div className="card bg-yellow-50 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-yellow-600">Avertissements</p>
              <p className="text-2xl font-bold text-yellow-700">{warningCount}</p>
            </div>
          </div>
        </div>
        <div className="card bg-blue-50 border-l-4 border-blue-500">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-600">Informations</p>
              <p className="text-2xl font-bold text-blue-700">{infoCount}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gray-50 border-l-4 border-gray-400">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-700">{alerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="w-48">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="form-select"
            >
              <option value="">Toutes les priorités</option>
              <option value="danger">Urgentes</option>
              <option value="warning">Avertissements</option>
              <option value="info">Informations</option>
            </select>
          </div>
          <div className="w-48">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="form-select"
            >
              <option value="">Tous les types</option>
              <option value="payment">Paiements</option>
              <option value="training">Formations</option>
              <option value="exam">Examens</option>
              <option value="session">Séances</option>
              <option value="reminder">Rappels</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">Aucune alerte</h3>
          <p className="text-gray-500">Tout est en ordre !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert, index) => {
            const styles = SEVERITY_STYLES[alert.severity];
            const icon = ALERT_ICONS[alert.type] || ALERT_ICONS.reminder;

            return (
              <div
                key={`${alert.type}-${alert.student_id}-${index}`}
                className={`card ${styles.bg} border-l-4 ${styles.border}`}
              >
                <div className="flex items-start">
                  <svg className={`w-6 h-6 ${styles.icon} mr-4 mt-0.5 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${styles.text}`}>{alert.title}</h3>
                      <span className="text-sm text-gray-500">{formatDate(alert.date)}</span>
                    </div>
                    <p className="text-gray-600 mt-1">{alert.message}</p>
                    {alert.student_id && (
                      <Link
                        href={`/students/${alert.student_id}`}
                        className="inline-block mt-2 text-sm text-primary-600 hover:text-primary-700"
                      >
                        Voir le profil
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Alerts;
