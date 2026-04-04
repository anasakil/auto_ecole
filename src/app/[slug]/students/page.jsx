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
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
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
                    file_content: uploadResult.base64 || null,
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

  const availableYears = [...new Set(students.map(s => s.registration_date ? new Date(s.registration_date).getFullYear() : null).filter(Boolean))].sort((a,b) => b-a);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.cin && student.cin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.phone && student.phone.includes(searchTerm));
    const matchesStatus = !filterStatus || student.status === filterStatus;
    const matchMonth = !filterMonth || (student.registration_date && new Date(student.registration_date).getMonth() + 1 === parseInt(filterMonth));
    const matchYear = !filterYear || (student.registration_date && new Date(student.registration_date).getFullYear() === parseInt(filterYear));
    return matchesSearch && matchesStatus && matchMonth && matchYear;
  });

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortKey) return 0;
    let va = a[sortKey], vb = b[sortKey];
    if (sortKey === 'payment') { va = (a.paid_amount || 0); vb = (b.paid_amount || 0); }
    if (sortKey === 'remaining') { va = calculateRemainingDays(a.training_start_date, a.training_duration_days); vb = calculateRemainingDays(b.training_start_date, b.training_duration_days); }
    if (va == null) return 1; if (vb == null) return -1;
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? va - vb : vb - va;
  });

  const { page: studentsPage, setPage: setStudentsPage, totalPages: studentsTotalPages, paginatedData: paginatedStudents } = usePagination(sortedStudents, 20);

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

  function SortIcon({ colKey }) {
    if (sortKey !== colKey) return <svg className="w-3.5 h-3.5 text-gray-300 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    return sortDir === 'asc'
      ? <svg className="w-3.5 h-3.5 text-primary-500 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
      : <svg className="w-3.5 h-3.5 text-primary-500 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
  }

  // Table columns definition
  const tableColumns = [
    {
      key: 'photo',
      header: '',
      sortable: false,
      width: '52px',
      render: (_, student) => (
        <Link href={`/${slug}/students/${student.id}`}>
          {studentImages[student.id] ? (
            <img src={studentImages[student.id]} alt={student.full_name} className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 hover:border-primary-400 transition-colors" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center border-2 border-gray-100">
              <span className="text-primary-600 font-bold text-sm">{student.full_name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </Link>
      ),
    },
    {
      key: 'full_name',
      header: <button onClick={() => handleSort('full_name')} className="flex items-center font-semibold hover:text-primary-600 transition-colors">Nom Complet<SortIcon colKey="full_name" /></button>,
      render: (value, student) => (
        <Link href={`/${slug}/students/${student.id}`} className="font-medium text-gray-800 hover:text-primary-600 transition-colors">{value}</Link>
      ),
    },
    {
      key: 'cin',
      header: <button onClick={() => handleSort('cin')} className="flex items-center font-semibold hover:text-primary-600 transition-colors">CIN<SortIcon colKey="cin" /></button>,
      render: (value) => <span className="font-mono text-sm text-gray-600">{value || '—'}</span>,
    },
    {
      key: 'phone',
      header: <button onClick={() => handleSort('phone')} className="flex items-center font-semibold hover:text-primary-600 transition-colors">Téléphone<SortIcon colKey="phone" /></button>,
      render: (value) => <span className="text-gray-600">{value || '—'}</span>,
    },
    {
      key: 'license_type',
      header: <button onClick={() => handleSort('status')} className="flex items-center font-semibold hover:text-primary-600 transition-colors">Permis / Statut<SortIcon colKey="status" /></button>,
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
      header: <button onClick={() => handleSort('remaining')} className="flex items-center font-semibold hover:text-primary-600 transition-colors">Jours Restants<SortIcon colKey="remaining" /></button>,
      render: (_, student) => {
        if (student.status !== 'En formation') return <span className="text-gray-400">—</span>;
        const remaining = calculateRemainingDays(student.training_start_date, student.training_duration_days);
        return (
          <span className={`font-medium ${remaining > 0 ? 'text-green-600' : 'text-red-500'}`}>{remaining}j</span>
        );
      },
    },
    {
      key: 'payment',
      header: <button onClick={() => handleSort('payment')} className="flex items-center font-semibold hover:text-primary-600 transition-colors">Paiement<SortIcon colKey="payment" /></button>,
      render: (_, student) => {
        const paid = student.paid_amount || 0;
        const rem = student.total_price - paid;
        return (
          <div className="text-sm leading-tight">
            <span className="text-green-600 font-medium">{formatCurrency(paid)}</span>
            {rem > 0 && <div className="text-red-500 text-xs">{formatCurrency(rem)} restant</div>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (_, student) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); router.push(`/${slug}/students/${student.id}`); }} title="Voir" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleEdit(student); }} title="Modifier" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(student); }} title="Supprimer" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      ),
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom, CIN ou téléphone..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setStudentsPage(1); }}
              className="w-full pl-10 pr-9 h-10 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all placeholder-gray-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Month picker */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="month"
              value={filterYear && filterMonth ? `${filterYear}-${String(filterMonth).padStart(2,'0')}` : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m] = e.target.value.split('-');
                  setFilterYear(y); setFilterMonth(String(parseInt(m))); setStudentsPage(1);
                } else {
                  setFilterYear(''); setFilterMonth('');
                }
              }}
              className={`h-10 pl-9 pr-3 text-sm border rounded-xl outline-none transition-all cursor-pointer ${
                filterMonth || filterYear ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            />
          </div>

          {/* Status */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setStudentsPage(1); }}
              className={`h-10 pl-9 pr-8 text-sm border rounded-xl outline-none transition-all appearance-none cursor-pointer ${
                filterStatus ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <option value="">Tous les statuts</option>
              <option value="En formation">En formation</option>
              <option value="Permis obtenu">Permis obtenu</option>
              <option value="Inactif">Inactif</option>
            </select>
          </div>

          {/* Reset */}
          {(searchTerm || filterStatus || filterMonth || filterYear) && (
            <button
              onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterMonth(''); setFilterYear(''); }}
              className="inline-flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

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
