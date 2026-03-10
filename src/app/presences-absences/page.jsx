'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import ExportButton from '@/components/ExportButton';
import { TablePageSkeleton } from '@/components/skeletons';

function PresencesAbsences() {
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'history'

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // First cleanup any duplicate attendance records
      await api.attendance.cleanupDuplicates();

      const [studentsData, todayAttendance] = await Promise.all([
        api.students.getAll(),
        api.attendance.getToday()
      ]);
      // Show students who are actively in training (not completed/cancelled)
      const activeStudents = studentsData.filter(s =>
        s.status === 'En formation' ||
        s.status === 'En cours' ||
        s.status === 'Actif' ||
        s.status === 'Active' ||
        !s.status // Include students without status
      );
      setStudents(activeStudents.length > 0 ? activeStudents : studentsData);
      setAttendanceRecords(todayAttendance);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Get attendance status for each student (returns the most recent record)
  function getStudentAttendance(studentId) {
    return attendanceRecords.find(a => a.student_id === studentId);
  }

  // Calculate statistics - count UNIQUE students who have attendance today
  const uniquePresentStudentIds = [...new Set(attendanceRecords.map(a => a.student_id))];
  const presentCount = uniquePresentStudentIds.filter(id =>
    students.some(s => s.id === id)
  ).length;
  const absentCount = Math.max(0, students.length - presentCount);

  const filteredStudents = students.filter((student) => {
    return (
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.cin && student.cin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.phone && student.phone.includes(searchTerm))
    );
  });

  // Separate present and absent students
  const presentStudents = filteredStudents.filter(s => getStudentAttendance(s.id));
  const absentStudents = filteredStudents.filter(s => !getStudentAttendance(s.id));

  // Export columns for attendance records
  const exportColumns = [
    { key: 'full_name', label: 'Étudiant' },
    { key: 'qr_code', label: 'Code QR' },
    { key: 'date', label: 'Date', accessor: (a) => formatDate(a.date) },
    { key: 'time_in', label: 'Entrée' },
    { key: 'time_out', label: 'Sortie' },
    { key: 'status', label: 'Statut' },
  ];

  // Export columns for daily presence list
  const exportDailyColumns = [
    { key: 'full_name', label: 'Étudiant' },
    { key: 'cin', label: 'CIN' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'status', label: 'Statut', accessor: (s) => getStudentAttendance(s.id) ? 'Présent' : 'Absent' },
    { key: 'time_in', label: 'Entrée', accessor: (s) => getStudentAttendance(s.id)?.time_in || '-' },
    { key: 'time_out', label: 'Sortie', accessor: (s) => getStudentAttendance(s.id)?.time_out || '-' },
  ];

  if (loading) {
    return <TablePageSkeleton statsCount={0} columns={5} rows={8} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Présences & Absences</h1>
          <p className="text-gray-500">Suivi des présences des étudiants en formation</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={viewMode === 'history' ? attendanceRecords : filteredStudents}
            columns={viewMode === 'history' ? exportColumns : exportDailyColumns}
            filename={viewMode === 'history' ? 'historique-presences' : 'presences-jour'}
            title={viewMode === 'history' ? 'Historique des Présences' : 'Présences du Jour'}
            subtitle={`Présents: ${presentCount} | Absents: ${absentCount}`}
          />
          <Link href="/attendance" className="btn btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Scanner QR
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-600 text-sm font-medium">Total Étudiants</div>
              <div className="text-2xl font-bold text-blue-800">{students.length}</div>
            </div>
            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div className="card bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-600 text-sm font-medium">Présents Aujourd'hui</div>
              <div className="text-2xl font-bold text-green-800">{presentCount}</div>
            </div>
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="card bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-600 text-sm font-medium">Absents Aujourd'hui</div>
              <div className="text-2xl font-bold text-red-800">{absentCount}</div>
            </div>
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="card bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-yellow-600 text-sm font-medium">Taux de Présence</div>
              <div className="text-2xl font-bold text-yellow-800">
                {students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%
              </div>
            </div>
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Rechercher par nom, CIN ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('daily')}
              className={`btn ${viewMode === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Vue Journalière
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`btn ${viewMode === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Historique
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'daily' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Present Students */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-green-700">
                <span className="inline-flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Présents ({presentStudents.length})
                </span>
              </h2>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {presentStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun étudiant présent</p>
              ) : (
                presentStudents.map((student) => {
                  const attendance = getStudentAttendance(student.id);
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                          <span className="text-green-700 font-semibold">
                            {student.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <Link
                            href={`/students/${student.id}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                          >
                            {student.full_name}
                          </Link>
                          <div className="text-xs text-gray-500">
                            Permis {student.license_type}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-700">
                          {attendance?.time_in || '-'}
                        </div>
                        {attendance?.time_out && (
                          <div className="text-xs text-gray-500">
                            Sorti: {attendance.time_out}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Absent Students */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-red-700">
                <span className="inline-flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Absents ({absentStudents.length})
                </span>
              </h2>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {absentStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Tous les étudiants sont présents</p>
              ) : (
                absentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center">
                        <span className="text-red-700 font-semibold">
                          {student.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <Link
                          href={`/students/${student.id}`}
                          className="font-medium text-gray-900 hover:text-primary-600"
                        >
                          {student.full_name}
                        </Link>
                        <div className="text-xs text-gray-500">
                          Permis {student.license_type}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {student.phone && (
                        <div className="text-xs text-gray-500">{student.phone}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* History View */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Date</th>
                <th>Heure d'entrée</th>
                <th>Heure de sortie</th>
                <th>Statut</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    Aucun enregistrement de présence aujourd'hui
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((record) => {
                  const duration = record.time_in && record.time_out
                    ? calculateDuration(record.time_in, record.time_out)
                    : '-';
                  return (
                    <tr key={record.id}>
                      <td>
                        <Link
                          href={`/students/${record.student_id}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {record.full_name}
                        </Link>
                      </td>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.time_in || '-'}</td>
                      <td>{record.time_out || '-'}</td>
                      <td>
                        <span className={`badge ${record.status === 'Présent' ? 'badge-success' : 'badge-warning'}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>{duration}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function calculateDuration(timeIn, timeOut) {
  if (!timeIn || !timeOut) return '-';
  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;
  const diff = outMinutes - inMinutes;
  if (diff < 0) return '-';
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${hours}h ${minutes}min`;
}

export default PresencesAbsences;
