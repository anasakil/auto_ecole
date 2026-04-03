'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/utils/api';
import Modal from '@/components/Modal';
import StudentForm from '@/components/StudentForm';
import ExportButton from '@/components/ExportButton';
import { Button, Badge, Card } from '@/components/ui';
import { LoadingSpinner, Alert } from '@/components/feedback';
import { PageHeader, SearchInput, FilterBar } from '@/components/layout/index';
import { DataTable, EmptyState, StatsCard, Pagination } from '@/components/data';
import { usePagination } from '@/hooks/usePagination';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/contexts/ConfirmContext';
import { formatDate, formatCurrency, calculateRemainingDays } from '@/utils/helpers';
import { TablePageSkeleton } from '@/components/skeletons';
import { useTenant } from '@/contexts/TenantContext';

function Students() {
  const [students, setStudents] = useState([]);
  const [studentImages, setStudentImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToast();
  const { confirmDelete } = useConfirmDialog();
  const router = useRouter();
  const { slug } = useTenant();

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const data = await api.students.getAll();
      if (data.error) throw new Error(data.error);
      setStudents(Array.isArray(data) ? data : []);

      // Load profile images in parallel
      const imagePromises = data
        .filter(s => s.profile_image)
        .map(async (student) => {
          try {
            const imageData = await api.files.getBase64(student.profile_image);
            return { id: student.id, data: imageData };
          } catch (err) {
            console.error('Error loading image for student:', student.id, err);
            return null;
          }
        });
      const imageResults = await Promise.allSettled(imagePromises);
      const images = {};
      imageResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value && result.value.data) {
          images[result.value.id] = result.value.data;
        }
      });
      setStudentImages(images);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Erreur lors du chargement des étudiants');
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingStudent(null);
    setShowModal(true);
  }

  function handleEdit(student) {
    setEditingStudent(student);
    setShowModal(true);
  }

  async function handleDelete(student) {
    const confirmed = await confirmDelete(student.full_name);
    if (confirmed) {
      try {
        await api.students.delete(student.id);
        toast.success('Étudiant supprimé avec succès');
        loadStudents();
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  }

  async function handleSave(studentData) {
    setIsSaving(true);
    try {
      // Extract files from data
      const { _files, ...data } = studentData;
      let studentId;

      if (editingStudent) {
        await api.students.update(editingStudent.id, data);
        studentId = editingStudent.id;
        toast.success('Étudiant modifié avec succès');
      } else {
        const result = await api.students.create(data);
        studentId = result.id;

        // Auto-generate contract PDF
        try {
          const contractResult = await api.contracts.generate(studentId);
          if (contractResult.success) {
            toast.success('Étudiant ajouté et contrat généré avec succès');
          } else {
            toast.success('Étudiant ajouté avec succès');
            console.error('Contract generation failed:', contractResult.error);
          }
        } catch (contractErr) {
          toast.success('Étudiant ajouté avec succès');
          console.error('Contract generation error:', contractErr);
        }
      }

      // Handle file uploads if any
      if (_files && studentId) {
        // Upload profile image
        if (_files.profileImage) {
          try {
            const uploadResult = await api.files.upload(_files.profileImage, 'profiles');
            if (uploadResult.filePath) {
              await api.students.updateImage(studentId, 'profile_image', uploadResult.filePath);
            }
          } catch (err) {
            console.error('Error uploading profile image:', err);
          }
        }

        // Upload CIN document
        if (_files.cinDocument) {
          try {
            const uploadResult = await api.files.upload(_files.cinDocument, 'documents');
            if (uploadResult.filePath) {
              await api.students.updateImage(studentId, 'cin_document', uploadResult.filePath);
            }
          } catch (err) {
            console.error('Error uploading CIN document:', err);
          }
        }

        // Upload additional documents
        if (_files.additionalDocs && _files.additionalDocs.length > 0) {
          for (const doc of _files.additionalDocs) {
            if (doc.file) {
              try {
                const uploadResult = await api.files.upload(doc.file, 'documents');
                if (uploadResult.filePath) {
                  const fileExt = doc.name.split('.').pop().toLowerCase();
                  await api.documents.create({
                    student_id: studentId,
                    type: ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) ? 'Image' : 'PDF',
                    name: doc.name,
                    file_path: uploadResult.filePath,
                    file_type: fileExt,
                    file_size: doc.file.size,
                  });
                }
              } catch (err) {
                console.error('Error uploading document:', err);
              }
            }
          }
        }
      }

      setShowModal(false);
      loadStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      const errorMessage = error.message || 'Erreur lors de l\'enregistrement';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.cin && student.cin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.phone && student.phone.includes(searchTerm));
    const matchesStatus = !filterStatus || student.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const { page: studentsPage, setPage: setStudentsPage, totalPages: studentsTotalPages, paginatedData: paginatedStudents } = usePagination(filteredStudents, 20);

  // Stats calculation
  const stats = {
    total: students.length,
    enFormation: students.filter(s => s.status === 'En formation').length,
    permisObtenu: students.filter(s => s.status === 'Permis obtenu').length,
    inactif: students.filter(s => s.status === 'Inactif').length,
  };

  // Export columns definition
  const exportColumns = [
    { key: 'full_name', label: 'Nom Complet' },
    { key: 'cin', label: 'CIN' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'license_type', label: 'Permis', accessor: (s) => `Permis ${s.license_type}` },
    { key: 'status', label: 'Statut' },
    { key: 'registration_date', label: 'Date Inscription', accessor: (s) => formatDate(s.registration_date) },
    { key: 'training_duration_days', label: 'Durée (jours)' },
    { key: 'remaining_days', label: 'Jours Restants', accessor: (s) => calculateRemainingDays(s.training_start_date, s.training_duration_days) },
    { key: 'total_price', label: 'Prix Total', accessor: (s) => formatCurrency(s.total_price) },
    { key: 'paid_amount', label: 'Payé', accessor: (s) => formatCurrency(s.paid_amount || 0) },
    { key: 'remaining', label: 'Restant', accessor: (s) => formatCurrency(s.total_price - (s.paid_amount || 0)) },
  ];

  // Table columns definition
  const tableColumns = [
    {
      key: 'photo',
      header: 'Photo',
      sortable: false,
      width: '60px',
      render: (_, student) => (
        <Link href={`/${slug}/students/${student.id}`}>
          {studentImages[student.id] ? (
            <img
              src={studentImages[student.id]}
              alt={student.full_name}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 hover:border-primary-400 transition-colors"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center border-2 border-gray-200">
              <span className="text-primary-600 font-semibold text-sm">
                {student.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </Link>
      ),
    },
    {
      key: 'full_name',
      header: 'Nom Complet',
      render: (value, student) => (
        <Link
          href={`/${slug}/students/${student.id}`}
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          {value}
        </Link>
      ),
    },
    {
      key: 'cin',
      header: 'CIN',
      render: (value) => value || '-',
    },
    {
      key: 'phone',
      header: 'Téléphone',
      render: (value) => value || '-',
    },
    {
      key: 'license_type',
      header: 'Permis / Statut',
      render: (value, student) => {
        const statusVariant = student.status === 'En formation' ? 'primary' : student.status === 'Permis obtenu' ? 'success' : 'gray';
        return (
          <div className="flex flex-wrap gap-1 items-center">
            <Badge variant="info">Permis {value}</Badge>
            <Badge variant={statusVariant}>{student.status}</Badge>
          </div>
        );
      },
    },
    {
      key: 'remaining',
      header: 'Jours Restants',
      render: (_, student) => {
        if (student.status !== 'En formation') return '-';
        const remaining = calculateRemainingDays(student.training_start_date, student.training_duration_days);
        return (
          <span className={remaining > 0 ? 'text-green-600' : 'text-red-600'}>
            {remaining} jours
          </span>
        );
      },
    },
    {
      key: 'payment',
      header: 'Paiement',
      render: (_, student) => {
        const paidAmount = student.paid_amount || 0;
        const remaining = student.total_price - paidAmount;
        return (
          <div className="text-sm">
            <span className="text-green-600">{formatCurrency(paidAmount)}</span>
            {remaining > 0 && (
              <span className="text-red-600 ml-1">
                ({formatCurrency(remaining)} restant)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_, student) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/${slug}/students/${student.id}`)}
            title="Voir détails"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(student)}
            title="Modifier"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(student)}
            title="Supprimer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      ),
    },
  ];

  // Filter options
  const filterOptions = [
    {
      key: 'status',
      label: 'Statut',
      type: 'select',
      value: filterStatus,
      onChange: setFilterStatus,
      options: [
        { value: '', label: 'Tous les statuts' },
        { value: 'En formation', label: 'En formation' },
        { value: 'Permis obtenu', label: 'Permis obtenu' },
        { value: 'Inactif', label: 'Inactif' },
      ],
    },
  ];

  if (loading) {
    return <TablePageSkeleton columns={8} rows={10} />;
  }

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <PageHeader
        title="Étudiants"
        subtitle="Gestion des étudiants de l'auto-école"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        actions={
          <>
            <ExportButton
              data={filteredStudents}
              columns={exportColumns}
              filename="etudiants"
              title="Liste des Étudiants"
              subtitle={filterStatus ? `Filtre: ${filterStatus}` : 'Tous les étudiants'}
            />
            <Button onClick={handleAdd} icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }>
              Ajouter un étudiant
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Étudiants"
          value={stats.total}
          color="primary"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatsCard
          title="En Formation"
          value={stats.enFormation}
          color="info"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <StatsCard
          title="Permis Obtenu"
          value={stats.permisObtenu}
          color="success"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Inactif"
          value={stats.inactif}
          color="gray"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom, CIN ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="relative sm:w-52">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all appearance-none"
            >
              <option value="">Tous les statuts</option>
              <option value="En formation">En formation</option>
              <option value="Permis obtenu">Permis obtenu</option>
              <option value="Inactif">Inactif</option>
            </select>
          </div>
          {(searchTerm || filterStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('');
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </Card>

      {/* Students Table */}
      <Card padding="none">
        <DataTable
          columns={tableColumns}
          data={paginatedStudents}
          loading={loading}
          emptyState={
            <EmptyState.NoStudents onAction={handleAdd} />
          }
          onRowClick={(student) => router.push(`/${slug}/students/${student.id}`)}
          striped
          hoverable
        />
      </Card>

      {/* Pagination */}
      {filteredStudents.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={studentsPage}
            totalPages={studentsTotalPages}
            onPageChange={setStudentsPage}
            totalItems={filteredStudents.length}
            pageSize={20}
          />
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => !isSaving && setShowModal(false)}
        title={editingStudent ? 'Modifier l\'étudiant' : 'Ajouter un étudiant'}
        size="lg"
      >
        <StudentForm
          student={editingStudent}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
          isLoading={isSaving}
        />
      </Modal>
    </div>
  );
}

export default Students;
