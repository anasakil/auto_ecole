'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import Modal from '@/components/Modal';
import ExportButton from '@/components/ExportButton';
import { formatDate, formatCurrency, PAYMENT_METHODS, getTodayISO } from '@/utils/helpers';
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

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.cin && payment.cin.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMethod = !filterMethod || payment.payment_method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  // Calculate totals
  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const cashAmount = filteredPayments
    .filter((p) => p.payment_method === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);
  const transferAmount = filteredPayments
    .filter((p) => p.payment_method === 'Transfer')
    .reduce((sum, p) => sum + p.amount, 0);

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
    { key: 'payment_method', label: 'Méthode', accessor: (p) => p.payment_method === 'Cash' ? 'Espèces' : 'Virement' },
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
        <div className="card">
          <p className="text-sm text-gray-500">Total des Paiements</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Espèces</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(cashAmount)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Virements</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(transferAmount)}</p>
        </div>
      </div>

      {/* Students with remaining balance */}
      {studentsWithDebt.length > 0 && (
        <div className="card mb-6">
          <h2 className="card-header">Étudiants avec Solde Impayé ({studentsWithDebt.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentsWithDebt.slice(0, 6).map((student) => {
              const paid = student.paid_amount || 0;
              const remaining = student.total_price - paid;
              return (
                <div key={student.id} className="p-3 bg-red-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link
                        href={`/${slug}/students/${student.id}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                      >
                        {student.full_name}
                      </Link>
                      <p className="text-sm text-gray-500">
                        Payé: {formatCurrency(paid)} / {formatCurrency(student.total_price)}
                      </p>
                    </div>
                    <span className="text-red-600 font-bold text-sm">
                      -{formatCurrency(remaining)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Rechercher par nom ou CIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="w-48">
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="form-select"
            >
              <option value="">Toutes les méthodes</option>
              <option value="Cash">Espèces</option>
              <option value="Transfer">Virement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Étudiant</th>
              <th>CIN</th>
              <th>Montant</th>
              <th>Méthode</th>
              <th>Facture</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  Aucun paiement trouvé
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => {
                const linkedInvoice = invoices.find(inv => inv.payment_id === payment.id);
                return (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td>
                      <Link
                        href={`/${slug}/students/${payment.student_id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {payment.full_name}
                      </Link>
                    </td>
                    <td>{payment.cin || '-'}</td>
                    <td className="font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                    <td>
                      <span className={`badge ${payment.payment_method === 'Cash' ? 'badge-success' : 'badge-info'}`}>
                        {payment.payment_method === 'Cash' ? 'Espèces' : 'Virement'}
                      </span>
                    </td>
                    <td>
                      {linkedInvoice ? (
                        <span className="text-xs font-mono font-medium text-primary-600">
                          {linkedInvoice.invoice_number}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="text-gray-500 max-w-xs truncate">{payment.notes || '-'}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(payment)}
                        className="btn btn-danger btn-sm"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
              value={formData.amount}
              onChange={(e) => {
                setFormData({ ...formData, amount: e.target.value });
                if (errors.amount) setErrors({ ...errors, amount: '' });
              }}
              className={`form-input ${errors.amount ? 'border-red-500 bg-red-50' : ''}`}
              min="0"
              step="0.01"
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
                          value={inst.amount}
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
