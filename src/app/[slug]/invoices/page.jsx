'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import Modal from '@/components/Modal';
import ExportButton from '@/components/ExportButton';
import { formatDate, formatCurrency, getTodayISO, PAYMENT_METHODS } from '@/utils/helpers';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/data/Pagination';
import { TablePageSkeleton } from '@/components/skeletons';
import { useTenant } from '@/contexts/TenantContext';

const INVOICE_STATUS = [
  { value: 'Émise', label: 'Émise', color: 'badge-info' },
  { value: 'Payée', label: 'Payée', color: 'badge-success' },
  { value: 'Annulée', label: 'Annulée', color: 'badge-gray' },
];

function Invoices() {
  const { slug } = useTenant();
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

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
    // Optimistic update — instant UI response
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
    try {
      await api.invoices.updateStatus(id, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      loadData(); // revert on error
    }
  }

  async function handleDelete(id) {
    if (window.confirm('Supprimer cette facture ?')) {
      // Optimistic remove
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      try {
        await api.invoices.delete(id);
      } catch (error) {
        console.error('Error deleting invoice:', error);
        loadData(); // revert on error
      }
    }
  }

  function printInvoice(invoice) {
    const student = students.find(s => s.id === invoice.student_id);
    const schoolName = settings?.school_name || 'Auto-École';
    const schoolAddress = settings?.address || '';
    const schoolPhone = settings?.phone || '';
    const schoolEmail = settings?.email || '';
    const capital = settings?.capital || '';
    const rc = settings?.commercial_register || '';
    const tp = settings?.tp || '';
    const taxId = settings?.tax_register || '';
    const cnss = settings?.cnss || '';
    const ice = settings?.ice || '';
    const gsm = settings?.gsm || '';
    const fax = settings?.fax || '';
    const city = settings?.city || '';

    // Legal identity line (top header)
    const capitalLine = capital ? `SARL au Capital de ${capital}` : '';
    const regParts = [];
    if (rc) regParts.push(`RC : ${rc}`);
    if (tp) regParts.push(`T.P : ${tp}`);
    if (taxId) regParts.push(`I.F : ${taxId}`);
    if (cnss) regParts.push(`CNSS : ${cnss}`);
    if (ice) regParts.push(`ICE : ${ice}`);
    const regLine = regParts.join(' – ');
    const contactParts = [];
    if (schoolPhone) contactParts.push(`Tél./Fax : ${schoolPhone}`);
    if (fax && fax !== schoolPhone) contactParts.push(`Fax : ${fax}`);
    if (gsm) contactParts.push(`GSM : ${gsm}`);
    const contactLine = contactParts.join(' – ');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Facture ${invoice.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 36px 44px; max-width: 820px; margin: 0 auto; color: #1a1a2e; font-size: 13px; }

            /* ── TOP HEADER ── */
            .top-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 3px solid #1e40af; margin-bottom: 28px; }
            .school-block { flex: 1; }
            .school-name { font-size: 22px; font-weight: 800; color: #1e40af; letter-spacing: 0.5px; text-transform: uppercase; }
            .school-legal { font-size: 10.5px; color: #555; margin-top: 5px; line-height: 1.7; }
            .school-legal strong { color: #1e40af; }
            .invoice-badge { text-align: right; flex-shrink: 0; margin-left: 30px; }
            .invoice-badge .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
            .invoice-badge .number { font-size: 26px; font-weight: 800; color: #1e40af; line-height: 1; margin: 4px 0; }
            .invoice-badge .date { font-size: 12px; color: #555; }
            .status-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 6px; }
            .status-emise { background: #dbeafe; color: #1e40af; }
            .status-payee { background: #dcfce7; color: #166534; }
            .status-annulee { background: #f1f5f9; color: #64748b; }

            /* ── CLIENT + INVOICE META ── */
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; }
            .meta-box-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px; }
            .client-name { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
            .meta-row { margin-bottom: 4px; color: #475569; font-size: 12px; }

            /* ── ITEMS TABLE ── */
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .items-table thead tr { background: #1e40af; color: white; }
            .items-table th { padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
            .items-table th:last-child { text-align: right; }
            .items-table td { padding: 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            .items-table td:last-child { text-align: right; font-weight: 700; font-size: 14px; color: #1e40af; }
            .items-table tbody tr:last-child td { border-bottom: none; }

            /* ── TOTAL ── */
            .total-section { display: flex; justify-content: flex-end; margin-bottom: 32px; }
            .total-box { background: #1e40af; color: white; padding: 18px 36px; border-radius: 10px; text-align: right; }
            .total-label { font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.8px; }
            .total-amount { font-size: 30px; font-weight: 800; margin-top: 4px; }

            /* ── NOTES ── */
            .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px; font-size: 12px; color: #92400e; }

            /* ── FOOTER ── */
            .footer { border-top: 2px solid #e2e8f0; padding-top: 16px; text-align: center; color: #64748b; font-size: 11px; line-height: 1.8; }
            .footer .thank-you { font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 6px; }

            @media print { body { padding: 20px 28px; } }
          </style>
        </head>
        <body>
          <!-- TOP HEADER -->
          <div class="top-header">
            <div class="school-block">
              <div class="school-name">${schoolName}</div>
              <div class="school-legal">
                ${capitalLine ? `<div><strong>${capitalLine}</strong></div>` : ''}
                ${regLine ? `<div>${regLine}</div>` : ''}
                ${schoolAddress ? `<div>${schoolAddress}${city ? ' – ' + city : ''}</div>` : ''}
                ${contactLine ? `<div>${contactLine}</div>` : ''}
                ${schoolEmail ? `<div>${schoolEmail}</div>` : ''}
              </div>
            </div>
            <div class="invoice-badge">
              <div class="label">Facture</div>
              <div class="number">${invoice.invoice_number}</div>
              <div class="date">Date : ${formatDate(invoice.issue_date)}</div>
              <span class="status-badge ${invoice.status === 'Payée' ? 'status-payee' : invoice.status === 'Annulée' ? 'status-annulee' : 'status-emise'}">${invoice.status}</span>
            </div>
          </div>

          <!-- CLIENT + META -->
          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-box-title">Facturé à</div>
              <div class="client-name">${student?.full_name || invoice.full_name || '-'}</div>
              ${(student?.phone) ? `<div class="meta-row">Tél : ${student.phone}</div>` : ''}
              ${(student?.address) ? `<div class="meta-row">Adresse : ${student.address}</div>` : ''}
            </div>
            <div class="meta-box">
              <div class="meta-box-title">Détails de la facture</div>
              <div class="meta-row">N° : <strong>${invoice.invoice_number}</strong></div>
              <div class="meta-row">Date d'émission : ${formatDate(invoice.issue_date)}</div>
              ${invoice.due_date ? `<div class="meta-row">Échéance : ${formatDate(invoice.due_date)}</div>` : ''}
            </div>
          </div>

          <!-- ITEMS -->
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Détails</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Formation Permis ${student?.license_type || 'B'}</strong></td>
                <td style="color:#64748b;">Formation complète pour l'obtention du permis de conduire</td>
                <td>${formatCurrency(invoice.amount)}</td>
              </tr>
            </tbody>
          </table>

          <!-- TOTAL -->
          <div class="total-section">
            <div class="total-box">
              <div class="total-label">Total à payer</div>
              <div class="total-amount">${formatCurrency(invoice.amount)}</div>
            </div>
          </div>

          ${invoice.notes ? `
          <div class="notes-box">
            <strong>Notes :</strong> ${invoice.notes}
          </div>
          ` : ''}

          <!-- FOOTER -->
          <div class="footer">
            <div class="thank-you">Merci pour votre confiance !</div>
            ${capitalLine ? `<div>${capitalLine}</div>` : ''}
            ${regLine ? `<div>${regLine}</div>` : ''}
            ${schoolAddress ? `<div>${schoolAddress}${city ? ' – ' + city : ''}</div>` : ''}
            ${contactLine ? `<div>${contactLine}</div>` : ''}
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const availableYears = [...new Set(invoices.map(i => i.issue_date ? new Date(i.issue_date).getFullYear() : null).filter(Boolean))].sort((a,b) => b-a);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = inv.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.cin && inv.cin.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !filterStatus || inv.status === filterStatus;
    const matchMonth = !filterMonth || (inv.issue_date && new Date(inv.issue_date).getMonth() + 1 === parseInt(filterMonth));
    const matchYear = !filterYear || (inv.issue_date && new Date(inv.issue_date).getFullYear() === parseInt(filterYear));
    return matchesSearch && matchesStatus && matchMonth && matchYear;
  });

  const { page: invoicesPage, setPage: setInvoicesPage, totalPages: invoicesTotalPages, paginatedData: paginatedInvoices } = usePagination(filteredInvoices, 20);

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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom, CIN ou numéro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 h-10 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all placeholder-gray-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Month picker — native input type="month" */}
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
                  setFilterYear(y);
                  setFilterMonth(String(parseInt(m)));
                } else {
                  setFilterYear('');
                  setFilterMonth('');
                }
              }}
              className={`h-10 pl-9 pr-3 text-sm border rounded-xl outline-none transition-all cursor-pointer ${
                filterMonth || filterYear
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
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
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`h-10 pl-9 pr-8 text-sm border rounded-xl outline-none transition-all appearance-none cursor-pointer ${
                filterStatus ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <option value="">Tous les statuts</option>
              {INVOICE_STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
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
              paginatedInvoices.map((invoice) => {
                const linkedPayment = invoice.payment_id
                  ? allPayments.find(p => p.id === invoice.payment_id)
                  : null;
                return (
                  <tr key={invoice.id}>
                    <td className="font-mono font-medium">{invoice.invoice_number}</td>
                    <td>{formatDate(invoice.issue_date)}</td>
                    <td>
                      <Link
                        href={`/${slug}/students/${invoice.student_id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {invoice.full_name}
                      </Link>
                    </td>
                    <td>{invoice.cin || '-'}</td>
                    <td className="font-medium">{formatCurrency(invoice.amount)}</td>
                    <td>
                      {linkedPayment ? (
                        <span className={`badge ${linkedPayment.payment_method === 'Cash' ? 'badge-success' : linkedPayment.payment_method === 'Cheque' ? 'badge-warning' : linkedPayment.payment_method === 'TPE' ? 'badge-orange' : 'badge-info'}`}>
                          {PAYMENT_METHODS.find(m => m.value === linkedPayment.payment_method)?.label || linkedPayment.payment_method}
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

      {filteredInvoices.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={invoicesPage}
            totalPages={invoicesTotalPages}
            onPageChange={setInvoicesPage}
            totalItems={filteredInvoices.length}
            pageSize={20}
          />
        </div>
      )}

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
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="form-input"
              min="0"
              step="0.01"
              placeholder="Ex: 1000"
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
