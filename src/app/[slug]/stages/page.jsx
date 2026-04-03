'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import Modal from '@/components/Modal';
import ExportButton from '@/components/ExportButton';
import { formatDate, getTodayISO, formatDuration } from '@/utils/helpers';
import { CardPageSkeleton } from '@/components/skeletons';
import { useTenant } from '@/contexts/TenantContext';

const STAGE_TYPES = [
  { value: 'Séance', label: 'Séance de conduite' },
  { value: 'Examen', label: 'Examen pratique' },
  { value: 'Code', label: 'Cours de code' },
];

const STAGE_STATUS = [
  { value: 'Planifié', label: 'Planifié', color: 'badge-info' },
  { value: 'Terminé', label: 'Terminé', color: 'badge-success' },
  { value: 'Annulé', label: 'Annulé', color: 'badge-gray' },
  { value: 'Réussi', label: 'Réussi', color: 'badge-success' },
  { value: 'Échoué', label: 'Échoué', color: 'badge-danger' },
];

function Stages() {
  const { slug } = useTenant();
  const [stages, setStages] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeStats, setTimeStats] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState('day');

  const [formData, setFormData] = useState({
    student_id: '',
    type: 'Séance',
    title: '',
    scheduled_date: getTodayISO(),
    scheduled_time: '09:00',
    duration_minutes: 60,
    status: 'Planifié',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [stagesData, studentsData, statsData] = await Promise.all([
        api.stages.getAll(),
        api.students.getAll(),
        api.stages.getSessionTimeStats(),
      ]);
      setStages(stagesData);
      setStudents(studentsData.filter(s => s.status === 'En formation'));
      setTimeStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(stage) {
    setEditingStage(stage);
    setFormData({
      student_id: stage.student_id,
      type: stage.type,
      title: stage.title,
      scheduled_date: stage.scheduled_date,
      scheduled_time: stage.scheduled_time || '09:00',
      duration_minutes: stage.duration_minutes || 60,
      status: stage.status,
      result: stage.result || '',
      notes: stage.notes || '',
    });
    setShowModal(true);
  }

  function handleNew() {
    setEditingStage(null);
    setFormData({
      student_id: '',
      type: 'Séance',
      title: '',
      scheduled_date: getTodayISO(),
      scheduled_time: '09:00',
      duration_minutes: 60,
      status: 'Planifié',
      notes: '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.student_id || !formData.title || !formData.scheduled_date) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingStage) {
        await api.stages.update(editingStage.id, formData);
      } else {
        await api.stages.create(formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving stage:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  }

  async function handleDelete(id) {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) {
      try {
        await api.stages.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting stage:', error);
      }
    }
  }

  const filteredStages = stages.filter((stage) => {
    const matchesSearch = stage.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stage.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || stage.type === filterType;
    const matchesStatus = !filterStatus || stage.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Group by date
  const todayStages = filteredStages.filter(s => s.scheduled_date === getTodayISO());
  const upcomingStages = filteredStages.filter(s => s.scheduled_date > getTodayISO() && s.status === 'Planifié');
  const pastStages = filteredStages.filter(s => s.scheduled_date < getTodayISO() || s.status !== 'Planifié');

  // Export columns
  const exportColumns = [
    { key: 'full_name', label: 'Étudiant' },
    { key: 'type', label: 'Type' },
    { key: 'title', label: 'Titre' },
    { key: 'scheduled_date', label: 'Date', accessor: (s) => formatDate(s.scheduled_date) },
    { key: 'scheduled_time', label: 'Heure' },
    { key: 'duration_minutes', label: 'Durée (min)' },
    { key: 'status', label: 'Statut' },
    { key: 'notes', label: 'Notes' },
  ];

  if (loading) {
    return <CardPageSkeleton cards={6} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stages & Examens</h1>
          <p className="text-gray-500">Gérer les séances de conduite et examens</p>
        </div>
        <div className="flex gap-3">
          <ExportButton
            data={filteredStages}
            columns={exportColumns}
            filename="stages-examens"
            title="Liste des Stages & Examens"
            subtitle={`Aujourd'hui: ${todayStages.length} | À venir: ${upcomingStages.length}`}
          />
          <button onClick={handleNew} className="btn btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Séance
          </button>
        </div>
      </div>

      {/* Time Stats */}
      {timeStats && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Statistiques de Temps</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'day', label: "Aujourd'hui" },
                { key: 'week', label: 'Semaine' },
                { key: 'month', label: 'Mois' },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setStatsPeriod(p.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    statsPeriod === p.key
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 mb-1">Temps Terminé</p>
              <p className="text-2xl font-bold text-green-700">
                {formatDuration(timeStats[statsPeriod]?.completed_minutes)}
              </p>
              <p className="text-xs text-green-500 mt-1">
                {timeStats[statsPeriod]?.completed_count || 0} séance(s)
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 mb-1">Temps Planifié</p>
              <p className="text-2xl font-bold text-blue-700">
                {formatDuration(timeStats[statsPeriod]?.planned_minutes)}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                {timeStats[statsPeriod]?.planned_count || 0} séance(s)
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-600 mb-1">Total Conduite</p>
              <p className="text-2xl font-bold text-orange-700">
                {formatDuration(timeStats[statsPeriod]?.seance_minutes)}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 mb-1">Total Code</p>
              <p className="text-2xl font-bold text-purple-700">
                {formatDuration(timeStats[statsPeriod]?.code_minutes)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Sessions */}
      {todayStages.length > 0 && (
        <div className="card mb-6 border-l-4 border-green-500">
          <h2 className="card-header text-green-700">Aujourd'hui ({todayStages.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayStages.map((stage) => (
              <div key={stage.id} className="p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className={`badge ${stage.type === 'Examen' ? 'badge-warning' : 'badge-info'}`}>
                      {stage.type}
                    </span>
                    <span className="ml-2 text-sm font-medium">{stage.scheduled_time}</span>
                  </div>
                  <span className={`badge ${STAGE_STATUS.find(s => s.value === stage.status)?.color}`}>
                    {stage.status}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900">{stage.title}</h3>
                <Link href={`/${slug}/students/${stage.student_id}`} className="text-sm text-primary-600 hover:underline">
                  {stage.full_name}
                </Link>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => handleEdit(stage)} className="btn btn-secondary btn-sm">
                    Modifier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="w-40">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-select">
              <option value="">Tous les types</option>
              {STAGE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-select">
              <option value="">Tous les statuts</option>
              {STAGE_STATUS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      {upcomingStages.length > 0 && (
        <div className="card mb-6">
          <h2 className="card-header">À venir ({upcomingStages.length})</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Type</th>
                  <th>Titre</th>
                  <th>Étudiant</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingStages.map((stage) => (
                  <tr key={stage.id}>
                    <td>{formatDate(stage.scheduled_date)}</td>
                    <td>{stage.scheduled_time || '-'}</td>
                    <td>
                      <span className={`badge ${stage.type === 'Examen' ? 'badge-warning' : 'badge-info'}`}>
                        {stage.type}
                      </span>
                    </td>
                    <td className="font-medium">{stage.title}</td>
                    <td>
                      <Link href={`/${slug}/students/${stage.student_id}`} className="text-primary-600 hover:underline">
                        {stage.full_name}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${STAGE_STATUS.find(s => s.value === stage.status)?.color}`}>
                        {stage.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(stage)} className="btn btn-secondary btn-sm">
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(stage.id)} className="btn btn-danger btn-sm">
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
        </div>
      )}

      {/* Past Sessions */}
      {pastStages.length > 0 && (
        <div className="card">
          <h2 className="card-header">Historique ({pastStages.length})</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Titre</th>
                  <th>Étudiant</th>
                  <th>Statut</th>
                  <th>Résultat</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastStages.slice(0, 20).map((stage) => (
                  <tr key={stage.id} className="opacity-75">
                    <td>{formatDate(stage.scheduled_date)}</td>
                    <td>
                      <span className={`badge ${stage.type === 'Examen' ? 'badge-warning' : 'badge-info'}`}>
                        {stage.type}
                      </span>
                    </td>
                    <td>{stage.title}</td>
                    <td>
                      <Link href={`/${slug}/students/${stage.student_id}`} className="text-primary-600 hover:underline">
                        {stage.full_name}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${STAGE_STATUS.find(s => s.value === stage.status)?.color}`}>
                        {stage.status}
                      </span>
                    </td>
                    <td>{stage.result || '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(stage)} className="btn btn-secondary btn-sm">
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(stage.id)} className="btn btn-danger btn-sm">
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
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingStage ? 'Modifier la Séance' : 'Nouvelle Séance'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Étudiant *</label>
            <select
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="form-select"
              required
            >
              <option value="">-- Sélectionner --</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} (Permis {student.license_type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="form-select"
                required
              >
                {STAGE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-select"
              >
                {STAGE_STATUS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Titre *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              placeholder="Ex: Séance de créneau, Examen code..."
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Heure</label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Durée (min)</label>
              <input
                type="number"
                value={formData.duration_minutes || ''}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                className="form-input"
                min="15"
                step="15"
                placeholder="Ex: 60"
              />
            </div>
          </div>

          {editingStage && formData.type === 'Examen' && (
            <div className="form-group">
              <label className="form-label">Résultat</label>
              <input
                type="text"
                value={formData.result || ''}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                className="form-input"
                placeholder="Note ou commentaire sur le résultat"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-input"
              rows="2"
              placeholder="Notes additionnelles..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              {editingStage ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Stages;
