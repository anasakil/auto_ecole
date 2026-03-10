'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import { Card, Badge } from '@/components/ui';
import { LoadingSpinner, Alert } from '@/components/feedback';
import { PageHeader } from '@/components/layout/index';
import { StatsCard, EmptyState } from '@/components/data';
import { formatDate, formatCurrency, formatDuration } from '@/utils/helpers';
import { DashboardSkeleton } from '@/components/skeletons';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [timeStats, setTimeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [data, alertsData, timeStatsData] = await Promise.all([
        api.dashboard.getStats(),
        api.alerts.getAll(),
        api.stages.getSessionTimeStats(),
      ]);
      setStats(data);
      setAlerts(alertsData.slice(0, 8)); // Show top 8 alerts
      setTimeStats(timeStatsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return (
      <EmptyState.Error
        message="Erreur de chargement des statistiques"
        onRetry={loadStats}
      />
    );
  }

  const alertsSeverityStyles = {
    danger: 'bg-red-50 border-red-400 text-red-700',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-700',
    info: 'bg-blue-50 border-blue-400 text-blue-700',
    success: 'bg-green-50 border-green-400 text-green-700',
  };

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre auto-école"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        }
      />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Étudiants"
          value={stats.totalStudents}
          color="primary"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatsCard
          title="En Formation"
          value={stats.activeStudents}
          color="success"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <StatsCard
          title="Permis Obtenus"
          value={stats.licensesObtained}
          color="warning"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
        />
        <StatsCard
          title="Présents Aujourd'hui"
          value={stats.todayAttendance}
          color="info"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
      </div>

      {/* Finance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-green-500">
          <p className="text-sm text-gray-500 mb-1">Revenus Totaux</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 mb-1">Revenus du Mois</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.monthlyRevenue)}</p>
        </Card>
        <Card className="border-l-4 border-orange-500">
          <p className="text-sm text-gray-500 mb-1">Paiements en Attente</p>
          <p className="text-2xl font-bold text-orange-600">{stats.pendingPayments}</p>
        </Card>
      </div>

      {/* Session Time Stats */}
      {timeStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-l-4 border-emerald-500">
            <p className="text-sm text-gray-500 mb-1">Temps Aujourd'hui</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-emerald-600">
                {formatDuration(timeStats.day?.completed_minutes)}
              </span>
              <span className="text-sm text-gray-400">terminé</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-medium text-blue-600">
                {formatDuration(timeStats.day?.planned_minutes)}
              </span>
              <span className="text-xs text-gray-400">planifié</span>
            </div>
          </Card>
          <Card className="border-l-4 border-indigo-500">
            <p className="text-sm text-gray-500 mb-1">Temps cette Semaine</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-indigo-600">
                {formatDuration(timeStats.week?.completed_minutes)}
              </span>
              <span className="text-sm text-gray-400">terminé</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-medium text-blue-600">
                {formatDuration(timeStats.week?.planned_minutes)}
              </span>
              <span className="text-xs text-gray-400">planifié</span>
            </div>
          </Card>
          <Card className="border-l-4 border-violet-500">
            <p className="text-sm text-gray-500 mb-1">Temps ce Mois</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-violet-600">
                {formatDuration(timeStats.month?.completed_minutes)}
              </span>
              <span className="text-sm text-gray-400">terminé</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-medium text-blue-600">
                {formatDuration(timeStats.month?.planned_minutes)}
              </span>
              <span className="text-xs text-gray-400">planifié</span>
            </div>
          </Card>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="mb-6">
          <Card.Header
            title={
              <div className="flex items-center">
                <svg className="w-6 h-6 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Alertes ({stats.alertsCounts?.total || alerts.length})</span>
                {stats.alertsCounts?.danger > 0 && (
                  <Badge variant="danger" size="sm" className="ml-2">
                    {stats.alertsCounts.danger} urgentes
                  </Badge>
                )}
              </div>
            }
            action={
              <Link href="/alerts" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Voir tout
              </Link>
            }
          />
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${alertsSeverityStyles[alert.severity]} animate-slideUp`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{alert.title}</span>
                    <span className="mx-2">-</span>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(alert.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Today's Stages */}
      {stats.todayStages && stats.todayStages.length > 0 && (
        <Card className="mb-6 border-l-4 border-green-500">
          <Card.Header
            title={
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Séances Aujourd'hui ({stats.todayStages.length})</span>
              </div>
            }
            action={
              <Link href="/stages" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Gérer les stages
              </Link>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.todayStages.map((stage) => (
              <div key={stage.id} className="p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={stage.type === 'Examen' ? 'warning' : 'info'}>
                    {stage.type}
                  </Badge>
                  <span className="text-sm font-medium">{stage.scheduled_time || '--:--'}</span>
                </div>
                <h3 className="font-medium text-gray-900">{stage.title}</h3>
                <Link href={`/students/${stage.student_id}`} className="text-sm text-primary-600 hover:underline">
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
              <Link href="/students" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Voir tout
              </Link>
            }
          />
          <div className="space-y-3">
            {stats.recentStudents.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Aucun étudiant</p>
            ) : (
              stats.recentStudents.map((student, index) => (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{student.full_name}</p>
                    <p className="text-sm text-gray-500">Permis {student.license_type}</p>
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
              <Link href="/payments" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Voir tout
              </Link>
            }
          />
          <div className="space-y-3">
            {stats.recentPayments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Aucun paiement</p>
            ) : (
              stats.recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{payment.full_name}</p>
                    <p className="text-sm text-gray-500">{formatDate(payment.payment_date)}</p>
                  </div>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Reminders */}
        {stats.upcomingReminders.length > 0 && (
          <Card className="lg:col-span-2">
            <Card.Header title="Rappels à Venir" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.upcomingReminders.map((student) => (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="flex items-center p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">{student.full_name}</p>
                    <p className="text-sm text-gray-600">
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
    </div>
  );
}

export default Dashboard;
