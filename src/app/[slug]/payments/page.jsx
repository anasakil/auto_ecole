'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import Modal from '@/components/Modal';
import ExportButton from '@/components/ExportButton';
import { formatDate, formatCurrency, PAYMENT_METHODS, getTodayISO } from '@/utils/helpers';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/data/Pagination';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/contexts/ConfirmContext';
import { TablePageSkeleton } from '@/components/skeletons';
import { useTenant } from '@/contexts/TenantContext';

function Payments() {
  const { slug } = useTenant();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [overduePayments, setOverduePayments] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const toast = useToast();
  const { confirmDelete } = useConfirmDialog();

  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    payment_method: 'Cash',
    payment_date: getTodayISO(),
    notes: '',
    schedule_id: null,
  });

  const [scheduleForm, setScheduleForm] = useState({
    student_id: '',
    num_installments: 3,
    installments: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [paymentsData, studentsData, overdueData, upcomingData, invoicesData] = await Promise.all([
        api.payments.getAll(),
        api.students.getAll(),
        api.paymentSchedules.getOverdue(),
        api.paymentSchedules.getUpcoming(14),
        api.invoices.getAll(),
      ]);
      setPayments(paymentsData);
      setStudents(studentsData);
      setOverduePayments(overdueData);
      setUpcomingPayments(upcomingData);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function validatePaymentForm() {
    const newErrors = {};

    if (!formData.student_id) {
      newErrors.student_id = 'Veuillez sélectionner un étudiant';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Le montant doit être supérieur à 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validatePaymentForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await api.payments.create({ ...formData, amount: parseFloat(formData.amount) || 0 });
      // If payment is linked to a schedule, mark it as paid
      if (formData.schedule_id && result.id) {
        await api.paymentSchedules.markPaid(formData.schedule_id, result.id);
      }
      // Auto-create invoice linked to this payment
      await api.invoices.create({
        student_id: parseInt(formData.student_id),
        payment_id: result.id,
        amount: parseFloat(formData.amount) || 0,
        issue_date: formData.payment_date,
        status: 'Payée',
        notes: formData.notes || null,
      });
      toast.success('Paiement et facture enregistrés avec succès');
      setShowModal(false);
      setErrors({});
      setFormData({
        student_id: '',
        amount: '',
        payment_method: 'Cash',
        payment_date: getTodayISO(),
        notes: '',
        schedule_id: null,
      });
      loadData();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Erreur lors de l\'enregistrement du paiement');
    } finally {
      setIsSaving(false);
    }
  }

  function generateInstallments(studentId, numInstallments) {
    const student = students.find(s => s.id === parseInt(studentId));
    if (!student) return [];

    const paid = student.paid_amount || 0;
    const remaining = student.total_price - paid;
    const amountPerInstallment = Math.ceil(remaining / numInstallments);

    const installments = [];
    const today = new Date();

    for (let i = 0; i < numInstallments; i++) {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + (i * 15)); // Every 15 days
      installments.push({
        amount: i === numInstallments - 1
          ? remaining - (amountPerInstallment * (numInstallments - 1))
          : amountPerInstallment,
        due_date: dueDate.toISOString().split('T')[0],
      });
    }

    return installments;
  }

  function handleScheduleStudentChange(studentId) {
    const installments = generateInstallments(studentId, scheduleForm.num_installments);
    setScheduleForm({
      ...scheduleForm,
      student_id: studentId,
      installments,
    });
  }

  function handleNumInstallmentsChange(num) {
    const installments = generateInstallments(scheduleForm.student_id, num);
    setScheduleForm({
      ...scheduleForm,
      num_installments: num,
      installments,
    });
  }

  function updateInstallment(index, field, value) {
    const newInstallments = [...scheduleForm.installments];
    newInstallments[index] = { ...newInstallments[index], [field]: value };
    setScheduleForm({ ...scheduleForm, installments: newInstallments });
  }

  async function handleScheduleSubmit(e) {
    e.preventDefault();
    if (!scheduleForm.student_id || scheduleForm.installments.length === 0) {
      toast.error('Veuillez sélectionner un étudiant et configurer les échéances');
      return;
    }

    setIsSaving(true);
    try {
      await api.paymentSchedules.create(scheduleForm.student_id, scheduleForm.installments);
      toast.success('Plan de paiement créé avec succès');
      setShowScheduleModal(false);
      setScheduleForm({ student_id: '', num_installments: 3, installments: [] });
      loadData();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Erreur lors de la création du plan de paiement');
    } finally {
      setIsSaving(false);
    }
  }

  function handlePaySchedule(schedule) {
    setFormData({
      student_id: schedule.student_id.toString(),
      amount: schedule.amount,
      payment_method: 'Cash',
      payment_date: getTodayISO(),
      notes: `Échéance ${schedule.installment_number}`,
      schedule_id: schedule.id,
    });
    setShowModal(true);
  }

  async function handleDelete(payment) {
    const confirmed = await confirmDelete(`le paiement de ${payment.full_name}`);
    if (confirmed) {
      try {
        await api.payments.delete(payment.id);
        toast.success('Paiement supprimé avec succès');
        loadData();
      } catch (error) {
        console.error('Error deleting payment:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  }

  const availableYears = [...new Set(payments.map(p => p.payment_date ? new Date(p.payment_date).getFullYear() : null).filter(Boolean))].sort((a,b) => b-a);

  const filteredPayments = payments
    .filter((payment) => {
      const matchesSearch =
        payment.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment.cin && payment.cin.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesMethod = !filterMethod || payment.payment_method === filterMethod;
      const matchMonth = !filterMonth || (payment.payment_date && new Date(payment.payment_date).getMonth() + 1 === parseInt(filterMonth));
      const matchYear = !filterYear || (payment.payment_date && new Date(payment.payment_date).getFullYear() === parseInt(filterYear));
      return matchesSearch && matchesMethod && matchMonth && matchYear;
    })
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

  const { page: paymentsPage, setPage: setPaymentsPage, totalPages: paymentsTotalPages, paginatedData: paginatedPayments } = usePagination(filteredPayments, 20);

  // Calculate totals
  const totalAmount = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const cashAmount = filteredPayments
    .filter((p) => p.payment_method === 'Cash')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const transferAmount = filteredPayments
    .filter((p) => p.payment_method === 'Transfer')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const chequeAmount = filteredPayments
    .filter((p) => p.payment_method === 'Cheque')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const tpeAmount = filteredPayments
    .filter((p) => p.payment_method === 'TPE')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  // Get students with remaining balance
  const studentsWithDebt = students.filter((s) => {
    const paid = s.paid_amount || 0;
    return s.total_price > paid;
  });

  // Export columns definition
  const exportColumns = [
    { key: 'payment_date', label: 'Date', accessor: (p) => formatDate(p.payment_date) },
    { key: 'full_name', label: 'Étudiant' },
    { key: 'cin', label: 'CIN' },
    { key: 'amount', label: 'Montant', accessor: (p) => formatCurrency(p.amount) },
    { key: 'payment_method', label: 'Méthode', accessor: (p) => PAYMENT_METHODS.find(m => m.value === p.payment_method)?.label || p.payment_method },
    { key: 'notes', label: 'Notes' },
  ];

  if (loading) {
    return <TablePageSkeleton statsCount={3} columns={8} rows={8} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-500">Gestion des paiements des étudiants</p>
        </div>
        <div className="flex gap-3">
          <ExportButton
            data={filteredPayments}
            columns={exportColumns}
            filename="paiements"
            title="Liste des Paiements"
            subtitle={`Total: ${formatCurrency(totalAmount)}`}
          />
          <button onClick={() => setShowScheduleModal(true)} className="btn btn-secondary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Plan de Paiement
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Paiement
          </button>
        </div>
      </div>

      {/* Overdue Payments Alert */}
      {overduePayments.length > 0 && (
        <div className="card mb-6 bg-red-50 border-l-4 border-red-500">
          <h2 className="card-header text-red-700">Paiements en Retard ({overduePayments.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overduePayments.map((schedule) => (
              <div key={schedule.id} className="p-4 bg-white rounded-lg shadow-sm border border-red-200">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/${slug}/students/${schedule.student_id}`} className="font-medium text-gray-900 hover:text-primary-600">
                    {schedule.full_name}
                  </Link>
                  <span className="text-red-600 font-bold">{formatCurrency(schedule.amount)}</span>
                </div>
                <p className="text-sm text-red-600 mb-2">
                  Échéance {schedule.installment_number} - Due: {formatDate(schedule.due_date)}
                </p>
                <button
                  onClick={() => handlePaySchedule(schedule)}
                  className="btn btn-primary btn-sm w-full"
                >
                  Payer maintenant
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <div className="card mb-6 bg-yellow-50 border-l-4 border-yellow-500">
          <h2 className="card-header text-yellow-700">Échéances à Venir ({upcomingPayments.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingPayments.slice(0, 6).map((schedule) => (
              <div key={schedule.id} className="p-4 bg-white rounded-lg shadow-sm border border-yellow-200">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/${slug}/students/${schedule.student_id}`} className="font-medium text-gray-900 hover:text-primary-600">
                    {schedule.full_name}
                  </Link>
                  <span className="text-yellow-600 font-bold">{formatCurrency(schedule.amount)}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Échéance {schedule.installment_number} - {formatDate(schedule.due_date)}
                </p>
                <button
                  onClick={() => handlePaySchedule(schedule)}
                  className="btn btn-secondary btn-sm w-full"
                >
                  Enregistrer le paiement
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card bg-gradient-to-br from-gray-50 to-white border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 rounded-xl">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total des Paiements</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-white border border-green-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Espèces</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(cashAmount)}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-white border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Virements</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(transferAmount)}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-white border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-xl">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chèques</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(chequeAmount)}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-white border border-orange-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-xl">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">TPE</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(tpeAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Students with remaining balance */}
      {studentsWithDebt.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Solde Impayé
            </h2>
            <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              {studentsWithDebt.length} étudiant{studentsWithDebt.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {studentsWithDebt.slice(0, 6).map((student) => {
              const paid = parseFloat(student.paid_amount) || 0;
              const total = parseFloat(student.total_price) || 0;
              const remaining = total - paid;
              const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
              return (
                <div key={student.id} className="p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <Link
                      href={`/${slug}/students/${student.id}`}
                      className="font-medium text-sm text-gray-900 hover:text-primary-600 transition-colors"
                    >
                      {student.full_name}
                    </Link>
                    <span className="text-red-600 font-semibold text-sm whitespace-nowrap ml-2">
                      -{formatCurrency(remaining)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(paid)} / {formatCurrency(total)} ({percentage}%)
                  </p>
                </div>
              );
            })}
          </div>
          {studentsWithDebt.length > 6 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              + {studentsWithDebt.length - 6} autre{studentsWithDebt.length - 6 > 1 ? 's' : ''} étudiant{studentsWithDebt.length - 6 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Filters & Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom ou CIN..."
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
          {/* Month filter */}
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary-400 outline-none transition-all appearance-none sm:w-36">
            <option value="">Tous les mois</option>
            {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          {/* Year filter */}
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary-400 outline-none transition-all appearance-none sm:w-28">
            <option value="">Toutes années</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Method filter */}
          <div className="relative sm:w-52">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all appearance-none"
            >
              <option value="">Toutes les méthodes</option>
              <option value="Cash">Espèces</option>
              <option value="Transfer">Virement</option>
              <option value="Cheque">Chèque</option>
              <option value="TPE">TPE</option>
            </select>
          </div>
          {/* Count badge */}
          <div className="flex items-center">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-xl whitespace-nowrap">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {filteredPayments.length} paiement{filteredPayments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Payments Table */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">Aucun paiement trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Étudiant</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">CIN</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Montant</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Méthode</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Facture</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Notes</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedPayments.map((payment) => {
                  const linkedInvoice = invoices.find(inv => inv.payment_id === payment.id);
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="text-sm text-gray-600">{formatDate(payment.payment_date)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/${slug}/students/${payment.student_id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors"
                        >
                          {payment.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-500 font-mono">{payment.cin || '-'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(payment.amount)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          payment.payment_method === 'Cash'
                            ? 'bg-green-50 text-green-700'
                            : payment.payment_method === 'Cheque'
                            ? 'bg-purple-50 text-purple-700'
                            : payment.payment_method === 'TPE'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {payment.payment_method === 'Cash' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          ) : payment.payment_method === 'Cheque' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          ) : payment.payment_method === 'TPE' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                          )}
                          {PAYMENT_METHODS.find(m => m.value === payment.payment_method)?.label || payment.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {linkedInvoice ? (
                          <span className="text-xs font-mono font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded">
                            {linkedInvoice.invoice_number}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-500 max-w-[200px] truncate block">{payment.notes || '-'}</span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <button
                          onClick={() => handleDelete(payment)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filteredPayments.length > 0 && (
          <div className="mt-4 px-2">
            <Pagination
              currentPage={paymentsPage}
              totalPages={paymentsTotalPages}
              onPageChange={setPaymentsPage}
              totalItems={filteredPayments.length}
              pageSize={20}
            />
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => !isSaving && setShowModal(false)}
        title="Nouveau Paiement"
        size="sm"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Étudiant *</label>
            <select
              value={formData.student_id}
              onChange={(e) => {
                setFormData({ ...formData, student_id: e.target.value, schedule_id: null });
                if (errors.student_id) setErrors({ ...errors, student_id: '' });
              }}
              className={`form-select ${errors.student_id ? 'border-red-500 bg-red-50' : ''}`}
              required
              disabled={formData.schedule_id}
            >
              <option value="">-- Sélectionner un étudiant --</option>
              {students.map((student) => {
                const paid = student.paid_amount || 0;
                const remaining = student.total_price - paid;
                return (
                  <option key={student.id} value={student.id}>
                    {student.full_name} {remaining > 0 && `(${formatCurrency(remaining)} restant)`}
                  </option>
                );
              })}
            </select>
            {errors.student_id && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.student_id}
              </p>
            )}
          </div>

          {formData.schedule_id && (
            <div className="p-3 bg-blue-50 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                Ce paiement sera lié à l'échéance planifiée
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Montant (MAD) *</label>
            <input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => {
                setFormData({ ...formData, amount: e.target.value });
                if (errors.amount) setErrors({ ...errors, amount: '' });
              }}
              className={`form-input ${errors.amount ? 'border-red-500 bg-red-50' : ''}`}
              min="0"
              step="0.01"
              placeholder="Ex: 500"
              required
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.amount}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Méthode de Paiement</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="form-select"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-input"
              placeholder="Notes optionnelles..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              disabled={isSaving}
              className="btn btn-secondary disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => !isSaving && setShowScheduleModal(false)}
        title="Plan de Paiement (Échelonné)"
        size="md"
      >
        <form onSubmit={handleScheduleSubmit}>
          <div className="form-group">
            <label className="form-label">Étudiant *</label>
            <select
              value={scheduleForm.student_id}
              onChange={(e) => handleScheduleStudentChange(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Sélectionner un étudiant --</option>
              {studentsWithDebt.map((student) => {
                const paid = student.paid_amount || 0;
                const remaining = student.total_price - paid;
                return (
                  <option key={student.id} value={student.id}>
                    {student.full_name} - Reste: {formatCurrency(remaining)}
                  </option>
                );
              })}
            </select>
          </div>

          {scheduleForm.student_id && (
            <>
              <div className="form-group">
                <label className="form-label">Nombre d'échéances</label>
                <select
                  value={scheduleForm.num_installments}
                  onChange={(e) => handleNumInstallmentsChange(parseInt(e.target.value))}
                  className="form-select"
                >
                  <option value={2}>2 échéances</option>
                  <option value={3}>3 échéances</option>
                  <option value={4}>4 échéances</option>
                  <option value={5}>5 échéances</option>
                  <option value={6}>6 échéances</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Configuration des échéances</label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {scheduleForm.installments.map((inst, index) => (
                    <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-500 w-8">
                        #{index + 1}
                      </span>
                      <div className="flex-1">
                        <input
                          type="number"
                          value={inst.amount || ''}
                          onChange={(e) => updateInstallment(index, 'amount', parseFloat(e.target.value) || 0)}
                          className="form-input"
                          placeholder="Montant"
                          min="0"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="date"
                          value={inst.due_date}
                          onChange={(e) => updateInstallment(index, 'due_date', e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Total: {formatCurrency(scheduleForm.installments.reduce((sum, i) => sum + i.amount, 0))}
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              disabled={isSaving}
              className="btn btn-secondary disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!scheduleForm.student_id || isSaving}
              className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Création...
                </>
              ) : (
                'Créer le plan'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Payments;
