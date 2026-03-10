'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import Modal from '@/components/Modal';
import ExportButton from '@/components/ExportButton';
import { formatDate, formatCurrency, getTodayISO } from '@/utils/helpers';
import { TablePageSkeleton } from '@/components/skeletons';

const INVOICE_STATUS = [
  { value: 'Émise', label: 'Émise', color: 'badge-info' },
  { value: 'Payée', label: 'Payée', color: 'badge-success' },
  { value: 'Annulée', label: 'Annulée', color: 'badge-gray' },
];

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState({
    student_id: '',
    amount: 0,
    issue_date: getTodayISO(),
    due_date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [invoicesData, studentsData, settingsData, paymentsData] = await Promise.all([
        api.invoices.getAll(),
        api.students.getAll(),
        api.settings.get(),
        api.payments.getAll(),
      ]);
      setInvoices(invoicesData);
      setStudents(studentsData);
      setSettings(settingsData);
      setAllPayments(paymentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleStudentChange(studentId) {
    const student = students.find(s => s.id === parseInt(studentId));
    if (student) {
      const paid = student.paid_amount || 0;
      const remaining = student.total_price - paid;
      setFormData({
        ...formData,
        student_id: studentId,
        amount: remaining > 0 ? remaining : student.total_price,
      });
    } else {
      setFormData({ ...formData, student_id: studentId });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.student_id || !formData.amount) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await api.invoices.create(formData);
      setShowModal(false);
      setFormData({
        student_id: '',
        amount: 0,
        issue_date: getTodayISO(),
        due_date: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Erreur lors de la création de la facture');
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      await api.invoices.updateStatus(id, newStatus);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async function handleDelete(id) {
    if (window.confirm('Supprimer cette facture ?')) {
      try {
        await api.invoices.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
  }

  function printInvoice(invoice) {
    const student = students.find(s => s.id === invoice.student_id);
    const schoolName = settings?.school_name || 'Auto-École Maroc';
    const schoolAddress = settings?.address || '';
    const schoolPhone = settings?.phone || '';
    const schoolEmail = settings?.email || '';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Facture ${invoice.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: bold; color: #1e40af; }
            .logo-subtitle { font-size: 12px; color: #666; margin-top: 5px; }
            .invoice-info { text-align: right; }
            .invoice-number { font-size: 24px; font-weight: bold; color: #1e40af; }
            .invoice-date { color: #666; margin-top: 5px; }
            .client-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .section { margin-bottom: 30px; }
            .section-title { font-weight: bold; color: #1e40af; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            .info-row { margin-bottom: 8px; }
            .info-label { color: #666; font-size: 12px; }
            .info-value { font-weight: 500; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background: #f8fafc; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; color: #64748b; }
            .items-table td { padding: 15px 12px; border-bottom: 1px solid #e2e8f0; }
            .items-table .amount { text-align: right; font-weight: 600; }
            .total-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .total-box { background: #1e40af; color: white; padding: 20px 40px; border-radius: 8px; }
            .total-label { font-size: 14px; opacity: 0.9; }
            .total-amount { font-size: 28px; font-weight: bold; }
            .footer { margin-top: 60px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .status-emise { background: #dbeafe; color: #1e40af; }
            .status-payee { background: #dcfce7; color: #166534; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">${schoolName}</div>
              <div class="logo-subtitle">${schoolAddress}</div>
              <div class="logo-subtitle">${schoolPhone} ${schoolEmail ? '| ' + schoolEmail : ''}</div>
            </div>
            <div class="invoice-info">
              <div class="invoice-number">${invoice.invoice_number}</div>
              <div class="invoice-date">Date: ${formatDate(invoice.issue_date)}</div>
              <div style="margin-top: 10px;">
                <span class="status-badge ${invoice.status === 'Payée' ? 'status-payee' : 'status-emise'}">${invoice.status}</span>
              </div>
            </div>
          </div>

          <div class="client-section">
            <div>
              <div class="section-title">Facturé à</div>
              <div class="info-row">
                <div class="info-value" style="font-size: 18px; font-weight: 600;">${student?.full_name || invoice.full_name}</div>
              </div>
              <div class="info-row">
                <div class="info-label">CIN</div>
                <div class="info-value">${student?.cin || invoice.cin || '-'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Téléphone</div>
                <div class="info-value">${student?.phone || '-'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Adresse</div>
                <div class="info-value">${student?.address || '-'}</div>
              </div>
            </div>
            <div>
              <div class="section-title">Détails de la facture</div>
              <div class="info-row">
                <div class="info-label">Numéro de facture</div>
                <div class="info-value">${invoice.invoice_number}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Date d'émission</div>
                <div class="info-value">${formatDate(invoice.issue_date)}</div>
              </div>
              ${invoice.due_date ? `
              <div class="info-row">
                <div class="info-label">Date d'échéance</div>
                <div class="info-value">${formatDate(invoice.due_date)}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Détails</th>
                <th style="text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Formation Permis ${student?.license_type || 'B'}</strong></td>
                <td>Formation complète pour l'obtention du permis de conduire</td>
                <td class="amount">${formatCurrency(invoice.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-box">
              <div class="total-label">Total à payer</div>
              <div class="total-amount">${formatCurrency(invoice.amount)}</div>
            </div>
          </div>

          ${invoice.notes ? `
          <div class="section">
            <div class="section-title">Notes</div>
            <p>${invoice.notes}</p>
          </div>
          ` : ''}

          <div class="footer">
            <p>Merci pour votre confiance!</p>
            <p style="margin-top: 5px;">${schoolName} - ${schoolAddress}</p>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = inv.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.cin && inv.cin.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !filterStatus || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalInvoices = filteredInvoices.length;
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = filteredInvoices.filter(inv => inv.status === 'Payée').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = filteredInvoices.filter(inv => inv.status === 'Émise').reduce((sum, inv) => sum + inv.amount, 0);

  // Export columns
  const exportColumns = [
    { key: 'invoice_number', label: 'N° Facture' },
    { key: 'full_name', label: 'Client' },
    { key: 'issue_date', label: 'Date Émission', accessor: (i) => formatDate(i.issue_date) },
    { key: 'due_date', label: 'Date Échéance', accessor: (i) => formatDate(i.due_date) },
    { key: 'amount', label: 'Montant', accessor: (i) => formatCurrency(i.amount) },
    { key: 'status', label: 'Statut' },
  ];

  if (loading) {
    return <TablePageSkeleton statsCount={3} columns={7} rows={8} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-gray-500">Gestion des factures clients</p>
        </div>
        <div className="flex gap-3">
          <ExportButton
            data={filteredInvoices}
            columns={exportColumns}
            filename="factures"
            title="Liste des Factures"
            subtitle={`Total: ${formatCurrency(totalAmount)}`}
          />
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Facture
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Total Factures</p>
          <p className="text-2xl font-bold text-gray-900">{totalInvoices}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Montant Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="card bg-green-50">
          <p className="text-sm text-green-600">Payées</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(paidAmount)}</p>
        </div>
        <div className="card bg-blue-50">
          <p className="text-sm text-blue-600">En attente</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(pendingAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Rechercher par nom, CIN ou numéro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="w-40">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-select"
            >
              <option value="">Tous les statuts</option>
              {INVOICE_STATUS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>N° Facture</th>
              <th>Date</th>
              <th>Client</th>
              <th>CIN</th>
              <th>Montant</th>
              <th>Paiement</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  Aucune facture trouvée
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => {
                const linkedPayment = invoice.payment_id
                  ? allPayments.find(p => p.id === invoice.payment_id)
                  : null;
                return (
                  <tr key={invoice.id}>
                    <td className="font-mono font-medium">{invoice.invoice_number}</td>
                    <td>{formatDate(invoice.issue_date)}</td>
                    <td>
                      <Link
                        href={`/students/${invoice.student_id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {invoice.full_name}
                      </Link>
                    </td>
                    <td>{invoice.cin || '-'}</td>
                    <td className="font-medium">{formatCurrency(invoice.amount)}</td>
                    <td>
                      {linkedPayment ? (
                        <span className={`badge ${linkedPayment.payment_method === 'Cash' ? 'badge-success' : 'badge-info'}`}>
                          {linkedPayment.payment_method === 'Cash' ? 'Espèces' : 'Virement'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Manuelle</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={invoice.status}
                        onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                        className={`text-sm rounded px-2 py-1 border-0 ${
                          invoice.status === 'Payée' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'Annulée' ? 'bg-gray-100 text-gray-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {INVOICE_STATUS.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => printInvoice(invoice)}
                          className="btn btn-secondary btn-sm"
                          title="Imprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="btn btn-danger btn-sm"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvelle Facture"
        size="sm"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Client *</label>
            <select
              value={formData.student_id}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="form-select"
              required
            >
              <option value="">-- Sélectionner un client --</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} ({student.cin || 'Sans CIN'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Montant (MAD) *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="form-input"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Date d'émission</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date d'échéance</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-input"
              rows="2"
              placeholder="Notes optionnelles..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Créer la facture
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Invoices;
