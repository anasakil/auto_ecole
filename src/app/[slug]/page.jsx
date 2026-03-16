'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import { Card, Badge } from '@/components/ui';
import { PageHeader } from '@/components/layout/index';
import { StatsCard, EmptyState } from '@/components/data';
import { formatDate, formatCurrency, formatDuration } from '@/utils/helpers';
import { useTenant } from '@/contexts/TenantContext';

function SkeletonValue({ width = 'w-16', height = 'h-8' }) {
  return <div className={`animate-pulse bg-surface-200 rounded-lg ${width} ${height}`} />;
}

function SkeletonText({ width = 'w-24', height = 'h-4' }) {
  return <div className={`animate-pulse bg-surface-200 rounded ${width} ${height}`} />;
}

function SkeletonListItem() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-surface-200 animate-pulse" />
        <div className="space-y-1.5">
          <SkeletonText width="w-32" />
          <SkeletonText width="w-24" height="h-3" />
        </div>
      </div>
      <SkeletonText width="w-20" height="h-6" />
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [timeStats, setTimeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const { slug } = useTenant();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(false);
      const [data, alertsData, timeStatsData, settingsData] = await Promise.all([
        api.dashboard.getStats(),
        api.alerts.getAll(),
        api.stages.getSessionTimeStats(),
        api.settings.get(),
      ]);
      if (data && !data.error) setStats(data);
      if (Array.isArray(alertsData)) setAlerts(alertsData.slice(0, 8));
      if (timeStatsData && !timeStatsData.error) setTimeStats(timeStatsData);
      if (settingsData && !settingsData.error) setSchoolName(settingsData.school_name || '');
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const alertsSeverityStyles = {
    danger: 'bg-red-50 border-l-4 border-accent-red text-accent-red',
    warning: 'bg-yellow-50 border-l-4 border-accent-yellow text-amber-700',
    info: 'bg-blue-50 border-l-4 border-accent-blue text-blue-700',
    success: 'bg-green-50 border-l-4 border-accent-green text-accent-green',
  };

  const alertIcons = {
    danger: (
      <div className="w-9 h-9 rounded-xl bg-accent-red/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
    ),
    warning: (
      <div className="w-9 h-9 rounded-xl bg-accent-yellow/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    info: (
      <div className="w-9 h-9 rounded-xl bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    success: (
      <div className="w-9 h-9 rounded-xl bg-accent-green/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
  };

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="mb-6">
        <p className="text-xs font-medium text-dark-muted tracking-wider uppercase">Tableau de bord</p>
        <h1 className="text-2xl font-bold text-dark">{schoolName || 'Dashboard'}</h1>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatsCard
          title="Total Étudiants"
          value={loading ? null : (stats?.totalStudents ?? 0)}
          loading={loading}
          color="primary"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatsCard
          title="En Formation"
          value={loading ? null : (stats?.activeStudents ?? 0)}
          loading={loading}
          color="success"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <StatsCard
          title="Permis Obtenus"
          value={loading ? null : (stats?.licensesObtained ?? 0)}
          loading={loading}
          color="warning"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
        />
        <StatsCard
          title="Présents Aujourd'hui"
          value={loading ? null : (stats?.todayAttendance ?? 0)}
          loading={loading}
          color="info"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
      </div>

      {/* Finance Cards - Gradient style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <StatsCard
          title="Revenus Totaux"
          value={loading ? null : formatCurrency(stats?.totalRevenue)}
          loading={loading}
          color="success"
          gradient
        />
        <StatsCard
          title="Revenus du Mois"
          value={loading ? null : formatCurrency(stats?.monthlyRevenue)}
          loading={loading}
          color="primary"
          gradient
        />
        <StatsCard
          title="Paiements en Attente"
          value={loading ? null : (stats?.pendingPayments ?? 0)}
          loading={loading}
          color="warning"
          gradient
        />
      </div>

      {/* Session Time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {[
          { label: "Temps Aujourd'hui", key: 'day', color: 'accent-green' },
          { label: 'Temps cette Semaine', key: 'week', color: 'primary-500' },
          { label: 'Temps ce Mois', key: 'month', color: 'accent-pink' },
        ].map(({ label, key, color }) => (
          <div key={key} className={`bg-white rounded-2xl shadow-soft p-5 border-l-4 border-${color}`}>
            <p className="text-sm text-dark-muted mb-2">{label}</p>
            {loading ? <SkeletonValue width="w-24" height="h-6" /> : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-bold text-${color}`}>
                    {formatDuration(timeStats?.[key]?.completed_minutes)}
                  </span>
                  <span className="text-sm text-dark-muted">terminé</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm font-medium text-primary-500">
                    {formatDuration(timeStats?.[key]?.planned_minutes)}
                  </span>
                  <span className="text-xs text-dark-muted">planifié</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <Card className="mb-6">
        <Card.Header
          title={
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-xl bg-accent-yellow/10 flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <span className="text-dark font-semibold">Alertes {!loading && `(${stats?.alertsCounts?.total || alerts.length})`}</span>
              {!loading && stats?.alertsCounts?.danger > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full font-medium bg-accent-red/10 text-accent-red">
                  {stats.alertsCounts.danger} urgentes
                </span>
              )}
            </div>
          }
          action={
            <Link href={`/${slug}/alerts`} className="text-sm text-primary-500 hover:text-primary-700 font-medium">
              Voir tout
            </Link>
          }
        />
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-200 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonText width="w-48" />
                    <SkeletonText width="w-64" height="h-3" />
                  </div>
                  <SkeletonText width="w-16" height="h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl ${alertsSeverityStyles[alert.severity]} animate-slideUp`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  {alertIcons[alert.severity]}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{alert.title}</span>
                    <p className="text-sm text-dark-light mt-0.5 truncate">{alert.message}</p>
                  </div>
                  <span className="text-xs text-dark-muted flex-shrink-0">{formatDate(alert.date)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-muted text-sm text-center py-6">Aucune alerte</p>
        )}
      </Card>

      {/* Today's Stages */}
      {!loading && stats?.todayStages && stats.todayStages.length > 0 && (
        <Card className="mb-6">
          <Card.Header
            title={
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-xl bg-accent-green/10 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-dark font-semibold">Séances Aujourd'hui ({stats.todayStages.length})</span>
              </div>
            }
            action={
              <Link href={`/${slug}/stages`} className="text-sm text-primary-500 hover:text-primary-700 font-medium">
                Gérer les stages
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.todayStages.map((stage) => (
              <div key={stage.id} className="p-4 bg-accent-green/5 rounded-xl border border-accent-green/10">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={stage.type === 'Examen' ? 'warning' : 'info'}>
                    {stage.type}
                  </Badge>
                  <span className="text-sm font-medium text-dark">{stage.scheduled_time || '--:--'}</span>
                </div>
                <h3 className="font-medium text-dark">{stage.title}</h3>
                <Link href={`/${slug}/students/${stage.student_id}`} className="text-sm text-primary-500 hover:underline">
                  {stage.full_name}
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Students */}
        <Card>
          <Card.Header
            title="Étudiants Récents"
            action={
              <Link href={`/${slug}/students`} className="text-sm text-primary-500 hover:text-primary-700 font-medium">
                Voir tout
              </Link>
            }
          />
          <div className="space-y-1">
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonListItem key={i} />)
            ) : stats?.recentStudents?.length === 0 ? (
              <p className="text-dark-muted text-sm text-center py-6">Aucun étudiant</p>
            ) : (
              stats?.recentStudents?.map((student) => (
                <Link
                  key={student.id}
                  href={`/${slug}/students/${student.id}`}
                  className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0 hover:bg-surface-50 -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-500/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary-500">
                        {student.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-dark">{student.full_name}</p>
                      <p className="text-xs text-dark-muted">Permis {student.license_type}</p>
                    </div>
                  </div>
                  <Badge variant={student.status === 'En formation' ? 'info' : student.status === 'Permis obtenu' ? 'success' : 'gray'}>
                    {student.status}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Recent Payments */}
        <Card>
          <Card.Header
            title="Paiements Récents"
            action={
              <Link href={`/${slug}/payments`} className="text-sm text-primary-500 hover:text-primary-700 font-medium">
                Voir tout
              </Link>
            }
          />
          <div className="space-y-1">
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonListItem key={i} />)
            ) : stats?.recentPayments?.length === 0 ? (
              <p className="text-dark-muted text-sm text-center py-6">Aucun paiement</p>
            ) : (
              stats?.recentPayments?.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent-green/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-dark">{payment.full_name}</p>
                      <p className="text-xs text-dark-muted">{formatDate(payment.payment_date)}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-accent-green">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Reminders */}
        {!loading && stats?.upcomingReminders?.length > 0 && (
          <Card className="lg:col-span-2">
            <Card.Header title="Rappels à Venir" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.upcomingReminders.map((student) => (
                <Link
                  key={student.id}
                  href={`/${slug}/students/${student.id}`}
                  className="flex items-center p-4 bg-accent-yellow/5 rounded-xl border border-accent-yellow/10 hover:bg-accent-yellow/10 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-accent-yellow/15 flex items-center justify-center mr-3 flex-shrink-0">
                    <svg className="w-5 h-5 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-dark">{student.full_name}</p>
                    <p className="text-sm text-dark-light">
                      Rappel: {formatDate(student.reminder_date)}
                      {student.interested_licenses && ` - Intéressé par: ${student.interested_licenses}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>

      {error && !loading && (
        <div className="mt-4">
          <EmptyState.Error
            message="Erreur de chargement des statistiques"
            onRetry={loadStats}
          />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
