'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import api from '@/utils/api';
import Modal from '@/components/Modal';
import DocumentViewer from '@/components/DocumentViewer';
import {
  formatDate,
  formatCurrency,
  getStatusBadgeClass,
  calculateRemainingDays,
  LICENSE_TYPES,
  PAYMENT_METHODS,
  getTodayISO,
  formatDuration,
} from '@/utils/helpers';
import { DetailPageSkeleton } from '@/components/skeletons';
import { useTenant } from '@/contexts/TenantContext';

function StudentDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { slug } = useTenant();
  const qrCanvasRef = useRef(null);
  const profileFileRef = useRef(null);
  const cinFileRef = useRef(null);
  const docFileRef = useRef(null);

  const [student, setStudent] = useState(null);
  const [stages, setStages] = useState([]);
  const [paymentSchedules, setPaymentSchedules] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [profileImageData, setProfileImageData] = useState(null);
  const [cinDocumentData, setCinDocumentData] = useState(null);
  const [cinDocumentVisible, setCinDocumentVisible] = useState(false);
  const [loadingCin, setLoadingCin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCin, setUploadingCin] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [studentTimeStats, setStudentTimeStats] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendancePeriod, setAttendancePeriod] = useState('all');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showContractInfoModal, setShowContractInfoModal] = useState(false);
  const [contractType, setContractType] = useState('contrat'); // 'contrat', 'demande15', or 'contratAvancement'
  const [contractData, setContractData] = useState(null);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    payment_date: getTodayISO(),
    notes: '',
  });

  const [stageForm, setStageForm] = useState({
    type: 'Séance',
    title: '',
    scheduled_date: getTodayISO(),
    scheduled_time: '09:00',
    duration_minutes: 60,
    notes: '',
  });

  const [licenseForm, setLicenseForm] = useState({
    license_type: 'B',
    date_obtained: getTodayISO(),
  });

  const [followUpForm, setFollowUpForm] = useState({
    interested_licenses: '',
    reminder_date: '',
    internal_notes: '',
  });

  const [incidentForm, setIncidentForm] = useState({
    type: 'Comportement',
    severity: 'Avertissement',
    description: '',
    date: getTodayISO(),
  });

  useEffect(() => {
    loadStudent();
  }, [id]);

  useEffect(() => {
    if (!student?.qr_code) return;
    let cancelled = false;
    const attempt = async (retries = 5) => {
      if (cancelled) return;
      if (qrCanvasRef.current) {
        try {
          await QRCode.toCanvas(qrCanvasRef.current, student.qr_code, {
            width: 200,
            margin: 2,
            color: { dark: '#1e40af', light: '#ffffff' },
          });
          if (!cancelled) setQrCodeGenerated(true);
        } catch (err) {
          console.error('QR Code generation error:', err);
        }
      } else if (retries > 0) {
        setTimeout(() => attempt(retries - 1), 100);
      }
    };
    const timer = setTimeout(() => attempt(), 50);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [student?.qr_code]);

  async function loadStudent() {
    try {
      const [data, stagesData, schedulesData, docsData, invoicesData, incidentsData, timeStatsData] = await Promise.all([
        api.students.getById(parseInt(id)),
        api.stages.getByStudent(parseInt(id)),
        api.paymentSchedules.getByStudent(parseInt(id)),
        api.documents.getByStudent(parseInt(id)),
        api.invoices.getByStudent(parseInt(id)),
        api.incidents.getByStudent(parseInt(id)),
        api.stages.getStudentSessionTimeStats(parseInt(id)),
      ]);
      if (data) {
        setStudent(data);
        setStages(stagesData || []);
        setPaymentSchedules(schedulesData || []);
        setDocuments(docsData || []);
        setInvoices(invoicesData || []);
        setIncidents(incidentsData || []);
        setStudentTimeStats(timeStatsData);
        setLicenseForm((prev) => ({
          ...prev,
          license_type: data.license_type,
        }));
        setFollowUpForm({
          interested_licenses: data.interested_licenses || '',
          reminder_date: data.reminder_date || '',
          internal_notes: data.internal_notes || '',
        });

        // Load profile image if exists
        if (data.profile_image) {
          api.files.getBase64(data.profile_image).then(imgData => {
            if (imgData) setProfileImageData(imgData);
          });
        } else {
          setProfileImageData(null);
        }
        // CIN document: not auto-loaded, user clicks to view
        setCinDocumentData(null);
        setCinDocumentVisible(false);
      } else {
        router.push(`/${slug}/students`);
      }
    } catch (error) {
      console.error('Error loading student:', error);
      router.push(`/${slug}/students`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(paymentForm.amount) || 0;
      const paymentResult = await api.payments.create({
        student_id: student.id,
        ...paymentForm,
        amount: parsedAmount,
      });
      // Auto-create invoice linked to this payment
      await api.invoices.create({
        student_id: student.id,
        payment_id: paymentResult.id,
        amount: parsedAmount,
        issue_date: paymentForm.payment_date,
        status: 'Payée',
        notes: paymentForm.notes || null,
      });
      setShowPaymentModal(false);
      setPaymentForm({
        amount: '',
        payment_method: 'Cash',
        payment_date: getTodayISO(),
        notes: '',
      });
      loadStudent();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Erreur lors de l\'ajout du paiement');
    }
  }

  async function handleDeletePayment(paymentId) {
    if (window.confirm('Supprimer ce paiement ?')) {
      try {
        await api.payments.delete(paymentId);
        loadStudent();
      } catch (error) {
        console.error('Error deleting payment:', error);
      }
    }
  }

  async function handleMarkLicenseObtained(e) {
    e.preventDefault();
    try {
      await api.students.markLicenseObtained(
        student.id,
        licenseForm.license_type,
        licenseForm.date_obtained
      );
      setShowLicenseModal(false);
      loadStudent();
    } catch (error) {
      console.error('Error marking license obtained:', error);
      alert('Erreur lors de la mise à jour');
    }
  }

  function startEditing() {
    setEditForm({
      full_name: student.full_name || '',
      cin: student.cin || '',
      phone: student.phone || '',
      address: student.address || '',
      birth_place: student.birth_place || '',
      birth_date: student.birth_date || '',
      license_type: student.license_type || 'B',
      registration_date: student.registration_date || '',
      status: student.status || 'En formation',
      training_start_date: student.training_start_date || '',
      training_duration_days: student.training_duration_days || 30,
      total_price: student.total_price || 0,
      offer_id: student.offer_id || null,
      interested_licenses: student.interested_licenses || '',
      reminder_date: student.reminder_date || '',
      internal_notes: student.internal_notes || '',
    });
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    try {
      await api.students.update(student.id, editForm);
      setIsEditing(false);
      loadStudent();
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Erreur lors de la mise à jour');
    }
  }

  async function handleUpdateFollowUp(e) {
    e.preventDefault();
    try {
      await api.students.updateFollowUp(student.id, followUpForm);
      setShowFollowUpModal(false);
      loadStudent();
    } catch (error) {
      console.error('Error updating follow-up:', error);
      alert('Erreur lors de la mise à jour');
    }
  }

  async function handleAddStage(e) {
    e.preventDefault();
    try {
      await api.stages.create({
        student_id: student.id,
        ...stageForm,
        status: 'Planifié',
      });
      setShowStageModal(false);
      setStageForm({
        type: 'Séance',
        title: '',
        scheduled_date: getTodayISO(),
        scheduled_time: '09:00',
        duration_minutes: 60,
        notes: '',
      });
      loadStudent();
    } catch (error) {
      console.error('Error adding stage:', error);
      alert('Erreur lors de l\'ajout de la séance');
    }
  }

  async function handleDeleteStage(stageId) {
    if (window.confirm('Supprimer cette séance ?')) {
      try {
        await api.stages.delete(stageId);
        loadStudent();
      } catch (error) {
        console.error('Error deleting stage:', error);
      }
    }
  }

  const getStageStatusBadge = (status) => {
    const badges = {
      'Planifié': 'badge-info',
      'Terminé': 'badge-success',
      'Annulé': 'badge-gray',
      'Réussi': 'badge-success',
      'Échoué': 'badge-danger',
    };
    return badges[status] || 'badge-gray';
  };

  // ==================== IMAGE UPLOAD ====================
  function handleUploadProfileImage() {
    profileFileRef.current?.click();
  }

  async function handleProfileFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Instant local preview
    const reader = new FileReader();
    reader.onload = (ev) => setProfileImageData(ev.target.result);
    reader.readAsDataURL(file);
    try {
      setUploadingProfile(true);
      const uploadResult = await api.files.upload(file, 'profiles');
      if (uploadResult.filePath) {
        // Clear old cached image so next load fetches fresh
        if (student.profile_image) api.files.clearCache(student.profile_image);
        await api.students.updateImage(student.id, 'profile_image', uploadResult.filePath);
        // Cache the new image immediately
        if (uploadResult.base64) {
          api.files.clearCache(uploadResult.filePath);
          setProfileImageData(uploadResult.base64);
        }
      } else {
        alert(uploadResult.error || 'Erreur lors du téléchargement');
      }
    } catch (err) {
      console.error('Error uploading profile:', err);
      alert('Erreur lors du téléchargement');
    } finally {
      setUploadingProfile(false);
      e.target.value = '';
    }
  }

  function handleUploadCinDocument() {
    cinFileRef.current?.click();
  }

  async function handleCinFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCin(true);
      const uploadResult = await api.files.upload(file, 'documents');
      if (uploadResult.filePath) {
        await api.students.updateImage(student.id, 'cin_document', uploadResult.filePath);
        // After upload, reset so user can click to view
        setCinDocumentData(null);
        setCinDocumentVisible(false);
        // Update student state to reflect cin_document exists
        setStudent(prev => ({ ...prev, cin_document: uploadResult.filePath }));
      } else {
        alert(uploadResult.error || 'Erreur lors du téléchargement du document');
      }
    } catch (error) {
      console.error('Error uploading CIN:', error);
      alert('Erreur lors du téléchargement');
    } finally {
      setUploadingCin(false);
      e.target.value = '';
    }
  }

  // ==================== DOCUMENTS ====================
  function handleUploadDocument() {
    docFileRef.current?.click();
  }

  async function handleDocFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingDoc(true);
      const uploadResult = await api.files.upload(file, 'documents');
      if (uploadResult.filePath) {
        const fileExt = file.name.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
        await api.documents.create({
          student_id: student.id,
          type: isImage ? 'Image' : 'PDF',
          name: file.name,
          file_path: uploadResult.filePath,
          file_type: fileExt,
          file_size: file.size,
          file_content: uploadResult.base64 || null,
        });
        // Optimistic: add to list instantly with base64 thumbnail from upload response
        if (uploadResult.base64) {
          setDocuments(prev => [{
            id: Date.now(), // temp id until reload
            name: file.name,
            file_path: uploadResult.filePath,
            file_type: fileExt,
            file_size: file.size,
            file_content: uploadResult.base64,
            type: isImage ? 'Image' : 'PDF',
          }, ...prev]);
        }
        loadStudent();
      } else {
        alert(uploadResult.error || 'Erreur lors du téléchargement');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors du téléchargement');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  }

  async function handleDeleteDocument(docId) {
    if (window.confirm('Supprimer ce document ?')) {
      try {
        await api.documents.delete(docId);
        loadStudent();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  }

  function handleViewDocument(doc) {
    setSelectedDocument(doc);
    setShowDocumentViewer(true);
  }

  // ==================== INCIDENTS (RÈGLEMENT INTÉRIEUR) ====================
  async function handleAddIncident(e) {
    e.preventDefault();
    try {
      await api.incidents.create({
        student_id: student.id,
        ...incidentForm,
      });
      setShowIncidentModal(false);
      setIncidentForm({
        type: 'Comportement',
        severity: 'Avertissement',
        description: '',
        date: getTodayISO(),
      });
      loadStudent();
    } catch (error) {
      console.error('Error adding incident:', error);
      alert('Erreur lors de l\'ajout de l\'incident');
    }
  }

  async function handleResolveIncident(incidentId) {
    const notes = prompt('Notes de résolution (optionnel):');
    if (notes !== null) {
      try {
        await api.incidents.resolve(incidentId, notes);
        loadStudent();
      } catch (error) {
        console.error('Error resolving incident:', error);
      }
    }
  }

  async function handleDeleteIncident(incidentId) {
    if (window.confirm('Supprimer cet incident ?')) {
      try {
        await api.incidents.delete(incidentId);
        loadStudent();
      } catch (error) {
        console.error('Error deleting incident:', error);
      }
    }
  }

  const getIncidentSeverityBadge = (severity) => {
    const badges = {
      'Avertissement': 'badge-warning',
      'Grave': 'badge-danger',
      'Mineur': 'badge-info',
    };
    return badges[severity] || 'badge-gray';
  };

  // ==================== INVOICES ====================
  async function handleCreateInvoice() {
    try {
      const result = await api.invoices.create({
        student_id: student.id,
        amount: student.total_price || student.offer_price || 0,
        issue_date: getTodayISO(),
      });
      if (result.invoice_number) {
        loadStudent();
        alert(`Facture ${result.invoice_number} créée`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Erreur lors de la création de la facture');
    }
  }

  async function printInvoice(invoice) {
    const settings = await api.settings.get().catch(() => ({})) || {};
    const schoolName = settings.school_name || 'Auto-École';
    const schoolAddress = settings.address || '';
    const schoolPhone = settings.phone || '';
    const schoolEmail = settings.email || '';
    const capital = settings.capital || '';
    const rc = settings.commercial_register || '';
    const tp = settings.tp || '';
    const taxId = settings.tax_register || '';
    const cnss = settings.cnss || '';
    const ice = settings.ice || '';
    const gsm = settings.gsm || '';
    const fax = settings.fax || '';
    const city = settings.city || '';

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
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px; }
            .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; }
            .meta-box-title { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px; }
            .client-name { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
            .meta-row { margin-bottom: 4px; color: #475569; font-size: 12px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .items-table thead tr { background: #1e40af; color: white; }
            .items-table th { padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
            .items-table th:last-child { text-align: right; }
            .items-table td { padding: 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            .items-table td:last-child { text-align: right; font-weight: 700; font-size: 14px; color: #1e40af; }
            .total-section { display: flex; justify-content: flex-end; margin-bottom: 32px; }
            .total-box { background: #1e40af; color: white; padding: 18px 36px; border-radius: 10px; text-align: right; }
            .total-label { font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.8px; }
            .total-amount { font-size: 30px; font-weight: 800; margin-top: 4px; }
            .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px; font-size: 12px; color: #92400e; }
            .footer { border-top: 2px solid #e2e8f0; padding-top: 16px; text-align: center; color: #64748b; font-size: 11px; line-height: 1.8; }
            .footer .thank-you { font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 6px; }
            @media print { body { padding: 20px 28px; } }
          </style>
        </head>
        <body>
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

          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-box-title">Facturé à</div>
              <div class="client-name">${student.full_name}</div>
              ${student.phone ? `<div class="meta-row">Tél : ${student.phone}</div>` : ''}
              ${student.address ? `<div class="meta-row">Adresse : ${student.address}</div>` : ''}
            </div>
            <div class="meta-box">
              <div class="meta-box-title">Détails de la facture</div>
              <div class="meta-row">N° : <strong>${invoice.invoice_number}</strong></div>
              <div class="meta-row">Date d'émission : ${formatDate(invoice.issue_date)}</div>
              ${invoice.due_date ? `<div class="meta-row">Échéance : ${formatDate(invoice.due_date)}</div>` : ''}
            </div>
          </div>

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
                <td><strong>Formation Permis ${student.license_type}</strong></td>
                <td style="color:#64748b;">Formation complète pour l'obtention du permis de conduire</td>
                <td>${formatCurrency(invoice.amount)}</td>
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
          <div class="notes-box">
            <strong>Notes :</strong> ${invoice.notes}
          </div>
          ` : ''}

          <div class="footer">
            <div class="thank-you">Merci pour votre confiance !</div>
            ${capitalLine ? `<div>${capitalLine}</div>` : ''}
            ${regLine ? `<div>${regLine}</div>` : ''}
            ${schoolAddress ? `<div>${schoolAddress}${city ? ' – ' + city : ''}</div>` : ''}
            ${contactLine ? `<div>${contactLine}</div>` : ''}
          </div>

          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function printImage(dataUrl, title) {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background: #fff; padding: 20px; }
      h3 { margin-bottom: 16px; color: #1e40af; font-size: 16px; }
      img { max-width: 100%; max-height: 85vh; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; }
      @media print { body { padding: 0; } }
    </style></head><body>
      <h3>${title}</h3>
      <img src="${dataUrl}" />
      <script>window.onload = function(){ window.print(); }<\/script>
    </body></html>`);
    win.document.close();
  }

  function printQRCode() {
    const printWindow = window.open('', '_blank');
    const canvas = qrCanvasRef.current;
    const imageData = canvas.toDataURL('image/png');

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${student.full_name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: Arial, sans-serif;
            }
            .qr-container { text-align: center; }
            h2 { margin-bottom: 10px; }
            p { color: #666; margin: 5px 0; }
            img { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>${student.full_name}</h2>
            <p>Permis ${student.license_type}</p>
            <img src="${imageData}" />
            <p><strong>${student.qr_code}</strong></p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!student) {
    return (
      <div className="text-center text-red-500">Étudiant non trouvé</div>
    );
  }

  const paidAmount = student.paid_amount || 0;
  const totalPrice = student.total_price || student.offer_price || 0;
  const remainingAmount = Math.max(0, totalPrice - paidAmount);
  const remainingDays = calculateRemainingDays(
    student.training_start_date,
    student.training_duration_days
  );

  return (
    <div>
      {/* Hidden file inputs for uploads */}
      <input ref={profileFileRef} type="file" accept="image/*" onChange={handleProfileFileChange} className="hidden" />
      <input ref={cinFileRef} type="file" accept="image/*,.pdf" onChange={handleCinFileChange} className="hidden" />
      <input ref={docFileRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleDocFileChange} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/${slug}/students`} className="btn btn-secondary">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
            <p className="text-gray-500">Code: {student.qr_code}</p>
          </div>
        </div>
        <span className={`badge ${getStatusBadgeClass(student.status)}`}>
          {student.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">Informations Personnelles</h2>
              {!isEditing ? (
                <button onClick={startEditing} className="btn btn-secondary btn-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm">Annuler</button>
                  <button onClick={handleSaveEdit} className="btn btn-primary btn-sm">Enregistrer</button>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nom complet</p>
                  <p className="font-medium">{student.full_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CIN</p>
                  <p className="font-medium">{student.cin || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <p className="font-medium">{student.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lieu de naissance</p>
                  <p className="font-medium">{student.birth_place || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date de naissance</p>
                  <p className="font-medium">{student.birth_date || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type de permis</p>
                  <p className="font-medium">Permis {student.license_type}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Adresse</p>
                  <p className="font-medium">{student.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date d'inscription</p>
                  <p className="font-medium">{formatDate(student.registration_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <span className={`badge ${getStatusBadgeClass(student.status)}`}>{student.status}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Nom complet</label>
                  <input type="text" value={editForm.full_name} onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} className="form-input text-sm" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">CIN</label>
                  <input type="text" value={editForm.cin} onChange={(e) => setEditForm(prev => ({ ...prev, cin: e.target.value }))} className="form-input text-sm" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Téléphone</label>
                  <input type="text" value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="form-input text-sm" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Lieu de naissance</label>
                  <input type="text" value={editForm.birth_place} onChange={(e) => setEditForm(prev => ({ ...prev, birth_place: e.target.value }))} className="form-input text-sm" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Date de naissance</label>
                  <input type="text" value={editForm.birth_date} onChange={(e) => setEditForm(prev => ({ ...prev, birth_date: e.target.value }))} className="form-input text-sm" placeholder="JJ/MM/AAAA" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Type de permis</label>
                  <select value={editForm.license_type} onChange={(e) => setEditForm(prev => ({ ...prev, license_type: e.target.value }))} className="form-input text-sm">
                    {LICENSE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0 md:col-span-2">
                  <label className="form-label text-xs">Adresse</label>
                  <input type="text" value={editForm.address} onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))} className="form-input text-sm" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Date d'inscription</label>
                  <input type="date" value={editForm.registration_date} onChange={(e) => setEditForm(prev => ({ ...prev, registration_date: e.target.value }))} className="form-input text-sm" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Statut</label>
                  <select value={editForm.status} onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))} className="form-input text-sm">
                    <option value="En formation">En formation</option>
                    <option value="En attente">En attente</option>
                    <option value="Permis obtenu">Permis obtenu</option>
                    <option value="Abandonné">Abandonné</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Date début formation</label>
                  <input type="date" value={editForm.training_start_date} onChange={(e) => setEditForm(prev => ({ ...prev, training_start_date: e.target.value }))} className="form-input text-sm" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Durée formation (jours)</label>
                  <input type="number" value={editForm.training_duration_days || ''} onChange={(e) => setEditForm(prev => ({ ...prev, training_duration_days: parseInt(e.target.value) || 30 }))} className="form-input text-sm" placeholder="Ex: 30" />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Prix total</label>
                  <input type="number" value={editForm.total_price || ''} onChange={(e) => setEditForm(prev => ({ ...prev, total_price: parseFloat(e.target.value) || 0 }))} className="form-input text-sm" placeholder="Ex: 3500" />
                </div>
              </div>
            )}
          </div>

          {/* Training Info */}
          <div className="card">
            <h2 className="card-header">Formation</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date début</p>
                <p className="font-medium">{formatDate(student.training_start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Durée</p>
                <p className="font-medium">{student.training_duration_days} jours</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Jours restants</p>
                <p className={`font-medium ${remainingDays > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remainingDays} jours
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Statut formation</p>
                <span className={`badge ${remainingDays > 0 ? 'badge-info' : 'badge-success'}`}>
                  {remainingDays > 0 ? 'En cours' : 'Terminé'}
                </span>
              </div>
            </div>

            {!student.license_obtained && (
              <button
                onClick={() => setShowLicenseModal(true)}
                className="btn btn-success mt-4"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Marquer Permis Obtenu
              </button>
            )}

            {student.license_obtained === 1 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-green-800 font-medium">
                  Permis {student.license_obtained_type} obtenu le {formatDate(student.license_obtained_date)}
                </p>
              </div>
            )}
          </div>

          {/* Payments & Invoices */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">Paiements & Factures</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary btn-sm">
                  + Paiement
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-lg font-bold">{formatCurrency(totalPrice)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Payé</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(paidAmount)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500">Restant</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(remainingAmount)}</p>
              </div>
            </div>

            {/* Progress bar */}
            {totalPrice > 0 && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{Math.round((paidAmount / totalPrice) * 100)}% payé</span>
                  <span>{formatCurrency(paidAmount)} / {formatCurrency(totalPrice)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      paidAmount >= totalPrice ? 'bg-green-500' : paidAmount > 0 ? 'bg-primary-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${Math.min((paidAmount / totalPrice) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Unified payments + invoices table */}
            {student.payments && student.payments.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Méthode</th>
                    <th>Facture</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {student.payments.map((payment) => {
                    const linkedInvoice = invoices.find(inv => inv.payment_id === payment.id);
                    return (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.payment_date)}</td>
                        <td className="font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                        <td>
                          <span className={`badge ${payment.payment_method === 'Cash' ? 'badge-success' : payment.payment_method === 'Cheque' ? 'badge-warning' : payment.payment_method === 'TPE' ? 'badge-orange' : 'badge-info'}`}>
                            {PAYMENT_METHODS.find(m => m.value === payment.payment_method)?.label || payment.payment_method}
                          </span>
                        </td>
                        <td>
                          {linkedInvoice ? (
                            <button
                              onClick={() => printInvoice(linkedInvoice)}
                              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 text-xs font-medium"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              {linkedInvoice.invoice_number}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="text-gray-500 text-sm">{payment.notes || '-'}</td>
                        <td>
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-600 hover:text-red-800"
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
            ) : (
              <p className="text-gray-500 text-center py-4">Aucun paiement enregistré</p>
            )}

          </div>

          {/* Stages / Sessions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">Stages & Séances</h2>
              <button onClick={() => setShowStageModal(true)} className="btn btn-primary btn-sm">
                Planifier séance
              </button>
            </div>

            {stages.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Heure</th>
                    <th>Type</th>
                    <th>Titre</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stages.slice(0, 10).map((stage) => (
                    <tr key={stage.id}>
                      <td>{formatDate(stage.scheduled_date)}</td>
                      <td>{stage.scheduled_time || '-'}</td>
                      <td>
                        <span className={`badge ${stage.type === 'Examen' ? 'badge-warning' : 'badge-info'}`}>
                          {stage.type}
                        </span>
                      </td>
                      <td>{stage.title}</td>
                      <td>
                        <span className={`badge ${getStageStatusBadge(stage.status)}`}>
                          {stage.status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-center py-4">Aucune séance planifiée</p>
            )}
          </div>

          {/* Payment Schedule */}
          {paymentSchedules.length > 0 && (
            <div className="card">
              <h2 className="card-header">Plan de Paiement</h2>
              <div className="space-y-3">
                {paymentSchedules.map((schedule) => {
                  const isOverdue = !schedule.paid && schedule.due_date < getTodayISO();
                  return (
                    <div
                      key={schedule.id}
                      className={`p-3 rounded-lg border ${
                        schedule.paid
                          ? 'bg-green-50 border-green-200'
                          : isOverdue
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Échéance {schedule.installment_number}</span>
                          <span className="mx-2">-</span>
                          <span className={schedule.paid ? 'text-green-600' : isOverdue ? 'text-red-600' : ''}>
                            {formatCurrency(schedule.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">
                            {formatDate(schedule.due_date)}
                          </span>
                          {schedule.paid ? (
                            <span className="badge badge-success">Payé</span>
                          ) : isOverdue ? (
                            <span className="badge badge-danger">En retard</span>
                          ) : (
                            <span className="badge badge-info">En attente</span>
                          )}
                        </div>
                      </div>
                      {schedule.paid && schedule.paid_date && (
                        <p className="text-sm text-green-600 mt-1">
                          Payé le {formatDate(schedule.paid_date)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attendance History */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">Historique de Présence</h2>
              {student.attendance && student.attendance.length > 0 && (
                <button
                  onClick={() => setShowAttendanceModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Voir détails
                </button>
              )}
            </div>
            {student.attendance && student.attendance.length > 0 ? (
              <>
                {/* Presence time summary */}
                {(() => {
                  const today = getTodayISO();
                  const now = new Date();
                  const dayOfWeek = now.getDay();
                  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const monday = new Date(now);
                  monday.setDate(now.getDate() - diffToMonday);
                  const weekStart = monday.toISOString().split('T')[0];
                  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

                  const calcMinutes = (timeIn, timeOut) => {
                    if (!timeIn || !timeOut) return 0;
                    const [hIn, mIn] = timeIn.split(':').map(Number);
                    const [hOut, mOut] = timeOut.split(':').map(Number);
                    const diff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
                    return diff > 0 ? diff : 0;
                  };

                  let todayMin = 0, weekMin = 0, monthMin = 0, totalMin = 0;
                  student.attendance.forEach((r) => {
                    const mins = calcMinutes(r.time_in, r.time_out);
                    totalMin += mins;
                    if (r.date >= monthStart) monthMin += mins;
                    if (r.date >= weekStart) weekMin += mins;
                    if (r.date === today) todayMin += mins;
                  });

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-500">Aujourd'hui</p>
                        <p className="text-lg font-bold text-green-700">{formatDuration(todayMin)}</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-500">Semaine</p>
                        <p className="text-lg font-bold text-blue-700">{formatDuration(weekMin)}</p>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-xs text-gray-500">Mois</p>
                        <p className="text-lg font-bold text-indigo-700">{formatDuration(monthMin)}</p>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-bold text-gray-700">{formatDuration(totalMin)}</p>
                      </div>
                    </div>
                  );
                })()}
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Entrée</th>
                      <th>Sortie</th>
                      <th>Durée</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.attendance.slice(0, 5).map((record) => {
                      let durationMin = 0;
                      if (record.time_in && record.time_out) {
                        const [hIn, mIn] = record.time_in.split(':').map(Number);
                        const [hOut, mOut] = record.time_out.split(':').map(Number);
                        durationMin = (hOut * 60 + mOut) - (hIn * 60 + mIn);
                        if (durationMin < 0) durationMin = 0;
                      }
                      return (
                        <tr key={record.id}>
                          <td>{formatDate(record.date)}</td>
                          <td>{record.time_in || '-'}</td>
                          <td>{record.time_out || '-'}</td>
                          <td className="font-medium text-primary-600">
                            {record.time_in && record.time_out ? formatDuration(durationMin) : '-'}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {student.attendance.length > 5 && (
                  <button
                    onClick={() => setShowAttendanceModal(true)}
                    className="w-full mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium py-2 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    Voir les {student.attendance.length} enregistrements
                  </button>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">Aucune présence enregistrée</p>
            )}
          </div>

          {/* Incidents - Règlement Intérieur */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Règlement Intérieur
                </span>
              </h2>
              <button onClick={() => setShowIncidentModal(true)} className="btn btn-danger btn-sm">
                + Signaler incident
              </button>
            </div>

            {incidents.length > 0 ? (
              <div className="space-y-3">
                {incidents.slice(0, 5).map((incident) => (
                  <div
                    key={incident.id}
                    className={`p-3 rounded-lg border ${
                      incident.resolved
                        ? 'bg-gray-50 border-gray-200'
                        : incident.severity === 'Grave'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-yellow-50 border-yellow-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`badge ${getIncidentSeverityBadge(incident.severity)}`}>
                            {incident.severity}
                          </span>
                          <span className="text-xs text-gray-500">{incident.type}</span>
                          {incident.resolved && (
                            <span className="badge badge-success">Résolu</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{incident.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(incident.date)}</p>
                        {incident.resolved && incident.resolved_notes && (
                          <p className="text-xs text-green-600 mt-1">
                            Résolution: {incident.resolved_notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        {!incident.resolved && (
                          <button
                            onClick={() => handleResolveIncident(incident.id)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Marquer résolu"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteIncident(incident.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {incidents.filter(i => !i.resolved).length > 0 && (
                  <div className="p-3 bg-red-100 rounded-lg text-center">
                    <p className="text-red-700 font-medium">
                      ⚠️ {incidents.filter(i => !i.resolved).length} incident(s) non résolu(s)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <svg className="w-12 h-12 text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-600 font-medium">Aucun incident signalé</p>
                <p className="text-gray-500 text-sm">Étudiant respecte le règlement intérieur</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Profile, QR Code & Follow-up */}
        <div className="space-y-6">
          {/* Profile Image */}
          <div className="card text-center">
            <h2 className="card-header">Photo de Profil</h2>
            <div className="mb-4">
              {profileImageData ? (
                <img
                  src={profileImageData}
                  alt="Profile"
                  className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-primary-200 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(profileImageData, '_blank')}
                />
              ) : (
                <div className="w-32 h-32 rounded-full mx-auto bg-gray-200 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUploadProfileImage}
                disabled={uploadingProfile}
                className="btn btn-secondary btn-sm flex-1"
              >
                {uploadingProfile ? 'Chargement...' : profileImageData ? 'Changer' : 'Ajouter photo'}
              </button>
              {profileImageData && (
                <button
                  onClick={() => printImage(profileImageData, `Photo – ${student.full_name}`)}
                  className="btn btn-secondary btn-sm px-2"
                  title="Imprimer la photo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* CIN Document */}
          <div className="card">
            <h2 className="card-header">Copie CIN</h2>
            {student.cin_document ? (
              <>
                {cinDocumentVisible && cinDocumentData ? (
                  <div className="mb-3">
                    {(cinDocumentData.startsWith('data:image') || (cinDocumentData.startsWith('http') && !cinDocumentData.includes('.pdf'))) ? (
                      <img
                        src={cinDocumentData}
                        alt="CIN"
                        className="w-full rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(cinDocumentData, '_blank')}
                      />
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <iframe
                          src={cinDocumentData}
                          className="w-full"
                          style={{ height: '300px', border: 'none' }}
                          title="CIN PDF"
                        />
                        <div className="flex gap-2 p-2 bg-gray-50 border-t border-gray-200">
                          <button
                            onClick={() => {
                              const win = window.open('', '_blank');
                              win.document.write(`<!DOCTYPE html><html><head><title>CIN</title><style>body{margin:0}iframe{width:100vw;height:100vh;border:none}</style></head><body><iframe src="${cinDocumentData}"></iframe></body></html>`);
                              win.document.close();
                            }}
                            className="btn btn-secondary btn-sm flex-1"
                          >
                            Ouvrir PDF
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = cinDocumentData;
                              link.download = `CIN-${student.full_name}.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="btn btn-secondary btn-sm flex-1"
                          >
                            Télécharger
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 rounded-lg text-center mb-3 border border-blue-200">
                    <svg className="w-10 h-10 text-blue-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-blue-600 font-medium mb-2">Document CIN disponible</p>
                    <button
                      onClick={async () => {
                        setLoadingCin(true);
                        try {
                          const cinData = await api.files.getBase64(student.cin_document);
                          if (cinData) { setCinDocumentData(cinData); setCinDocumentVisible(true); }
                        } finally { setLoadingCin(false); }
                      }}
                      disabled={loadingCin}
                      className="btn btn-sm"
                      style={{ backgroundColor: '#3b82f6', color: 'white' }}
                    >
                      {loadingCin ? 'Chargement...' : 'Voir le document'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center mb-3 border border-dashed border-gray-200">
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-400">Aucun document CIN</p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleUploadCinDocument}
                disabled={uploadingCin}
                className="btn btn-secondary btn-sm flex-1"
              >
                {uploadingCin ? 'Chargement...' : student.cin_document ? 'Remplacer' : 'Ajouter CIN'}
              </button>
              {cinDocumentVisible && cinDocumentData && (cinDocumentData.startsWith('data:image') || (cinDocumentData.startsWith('http') && !cinDocumentData.includes('.pdf'))) && (
                <button
                  onClick={() => printImage(cinDocumentData, `CIN – ${student.full_name}`)}
                  className="btn btn-secondary btn-sm px-2"
                  title="Imprimer le CIN"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="card text-center">
            <h2 className="card-header">Code QR</h2>
            {student.qr_code ? (
              <>
                <div className="flex justify-center mb-4 bg-white p-4 rounded-lg border">
                  <canvas
                    ref={qrCanvasRef}
                    id="qr-canvas"
                    style={{ display: 'block' }}
                  />
                </div>
                <p className="text-sm font-mono text-gray-600 mb-4 bg-gray-100 py-2 px-3 rounded">
                  {student.qr_code}
                </p>
                <button onClick={printQRCode} className="btn btn-secondary w-full">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimer QR Code
                </button>
              </>
            ) : (
              <p className="text-red-500 py-4">QR Code non disponible</p>
            )}
          </div>

          {/* Follow-up */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">Suivi Post-Permis</h2>
              <button
                onClick={() => setShowFollowUpModal(true)}
                className="text-primary-600 hover:text-primary-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Intéressé par</p>
                <p className="font-medium">
                  {student.interested_licenses
                    ? student.interested_licenses.split(',').map((l) => `Permis ${l}`).join(', ')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date de rappel</p>
                <p className="font-medium">{student.reminder_date ? formatDate(student.reminder_date) : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-sm">{student.internal_notes || '-'}</p>
              </div>
            </div>
          </div>

          {/* Offer Info */}
          {student.offer_name && (
            <div className="card">
              <h2 className="card-header">Offre</h2>
              <p className="font-medium">{student.offer_name}</p>
              <p className="text-primary-600 font-bold">{formatCurrency(student.offer_price)}</p>
            </div>
          )}

          {/* Formulaires Administratifs */}
          <div className="card">
            <h2 className="card-header">Formulaires Administratifs</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  const settings = await api.settings.get();
                  const today = new Date();
                  const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const regDate = student.registration_date
                    ? new Date(student.registration_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : dateStr;
                  setContractData({
                    school_name: settings?.school_name || '',
                    address: settings?.address || '',
                    phone: settings?.phone || '',
                    email: settings?.email || '',
                    fax: settings?.fax || '',
                    tax_register: settings?.tax_register || '',
                    commercial_register: settings?.commercial_register || '',
                    city: settings?.city || (settings?.address ? settings.address.split(',').pop().trim() : ''),
                    full_name: student.full_name || '',
                    cin: student.cin || '',
                    birth_place: student.birth_place || '',
                    birth_date: student.birth_date || '',
                    student_address: student.address || '',
                    web_reference: student.web_reference || '',
                    license_type: student.license_type || 'B',
                    registration_date: regDate,
                    contract_date: dateStr,
                    contract_number: '1',
                  });
                  setContractType('contrat');
                  setShowContractInfoModal(true);
                }}
                className="btn btn-sm"
                style={{ backgroundColor: '#8b5cf6', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                Contrat PDF
              </button>
              <button
                onClick={async () => {
                  const settings = await api.settings.get();
                  const today = new Date();
                  const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const nameParts = (student.full_name || '').split(' ');
                  setContractData({
                    school_name: settings?.school_name || '',
                    address: settings?.address || '',
                    phone: settings?.phone || '',
                    city: settings?.city || '',
                    contract_date: dateStr,
                    nom: nameParts.length > 1 ? nameParts.slice(-1).join(' ') : (student.full_name || ''),
                    prenom: nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '',
                    cin: student.cin || '',
                    exam_date: '',
                    requested_date: '',
                  });
                  setContractType('demande15');
                  setShowContractInfoModal(true);
                }}
                className="btn btn-sm"
                style={{ backgroundColor: '#f59e0b', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                Demande 15 Jours
              </button>
              <button
                onClick={async () => {
                  const settings = await api.settings.get();
                  const today = new Date();
                  const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  setContractData({
                    school_name: settings?.school_name || '',
                    address: settings?.address || '',
                    phone: settings?.phone || '',
                    city: settings?.city || '',
                    full_name: student.full_name || '',
                    cin: student.cin || '',
                    birth_date: student.birth_date || '',
                    birth_place: student.birth_place || '',
                    student_address: student.address || '',
                    license_type: student.license_type || 'B',
                    web_reference: student.web_reference || '',
                    contract_date: dateStr,
                    exam_code_date: '',
                    exam_conduit_date: '',
                    requested_code_date: '',
                    requested_conduit_date: '',
                    motif: '',
                  });
                  setContractType('contratAvancement');
                  setShowContractInfoModal(true);
                }}
                className="btn btn-sm"
                style={{ backgroundColor: '#10b981', color: 'white', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                Contrat Avancement
              </button>
            </div>
          </div>

          {/* Documents */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-header mb-0">Documents</h2>
              <div className="flex gap-2">
                <button onClick={handleUploadDocument} disabled={uploadingDoc} className="btn btn-secondary btn-sm">
                  {uploadingDoc ? 'Chargement...' : '+ Ajouter'}
                </button>
              </div>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const ext = doc.file_type?.toLowerCase() || doc.name?.split('.').pop()?.toLowerCase();
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
                  const isPdf = ext === 'pdf';
                  const isDoc = ['doc', 'docx', 'odt', 'odf'].includes(ext);

                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                      <div
                        className="flex items-center flex-1 cursor-pointer min-w-0"
                        onClick={() => handleViewDocument(doc)}
                      >
                        {isImage ? (
                          doc.file_content ? (
                            <img src={doc.file_content} alt={doc.name} className="w-10 h-10 rounded object-cover mr-3 border border-gray-200 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-green-50 border border-green-200 flex items-center justify-center mr-3 flex-shrink-0">
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )
                        ) : isPdf ? (
                          <div className="w-10 h-10 rounded bg-red-50 border border-red-200 flex items-center justify-center mr-3 flex-shrink-0">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 flex items-center justify-center mr-3 flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{doc.name}</span>
                          <span className="text-xs text-gray-400 uppercase">{ext}{doc.file_size ? ` · ${Math.round(doc.file_size / 1024)}Ko` : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                          title="Voir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">Aucun document</p>
            )}
          </div>

        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Ajouter un paiement"
        size="sm"
      >
        <form onSubmit={handleAddPayment}>
          <div className="form-group">
            <label className="form-label">Montant (MAD)</label>
            <input
              type="number"
              value={paymentForm.amount || ''}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="form-input"
              min="0"
              step="0.01"
              placeholder="Ex: 500"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Méthode de paiement</label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
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
              value={paymentForm.payment_date}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* License Obtained Modal */}
      <Modal
        isOpen={showLicenseModal}
        onClose={() => setShowLicenseModal(false)}
        title="Marquer Permis Obtenu"
        size="sm"
      >
        <form onSubmit={handleMarkLicenseObtained}>
          <div className="form-group">
            <label className="form-label">Type de permis obtenu</label>
            <select
              value={licenseForm.license_type}
              onChange={(e) => setLicenseForm({ ...licenseForm, license_type: e.target.value })}
              className="form-select"
            >
              {LICENSE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date d'obtention</label>
            <input
              type="date"
              value={licenseForm.date_obtained}
              onChange={(e) => setLicenseForm({ ...licenseForm, date_obtained: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowLicenseModal(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="btn btn-success">
              Confirmer
            </button>
          </div>
        </form>
      </Modal>

      {/* Follow-up Modal */}
      <Modal
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        title="Suivi Post-Permis"
        size="sm"
      >
        <form onSubmit={handleUpdateFollowUp}>
          <div className="form-group">
            <label className="form-label">Intéressé par (autres permis)</label>
            <select
              value={followUpForm.interested_licenses}
              onChange={(e) => setFollowUpForm({ ...followUpForm, interested_licenses: e.target.value })}
              className="form-select"
            >
              <option value="">-- Aucun --</option>
              <option value="A">Permis A (Moto)</option>
              <option value="C">Permis C (Camion)</option>
              <option value="D">Permis D (Bus)</option>
              <option value="A,C">Permis A + C</option>
              <option value="A,D">Permis A + D</option>
              <option value="C,D">Permis C + D</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date de rappel</label>
            <input
              type="date"
              value={followUpForm.reminder_date}
              onChange={(e) => setFollowUpForm({ ...followUpForm, reminder_date: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notes internes</label>
            <textarea
              value={followUpForm.internal_notes}
              onChange={(e) => setFollowUpForm({ ...followUpForm, internal_notes: e.target.value })}
              className="form-textarea"
              rows="3"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowFollowUpModal(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Stage Modal */}
      <Modal
        isOpen={showStageModal}
        onClose={() => setShowStageModal(false)}
        title="Planifier une Séance"
        size="sm"
      >
        <form onSubmit={handleAddStage}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              value={stageForm.type}
              onChange={(e) => setStageForm({ ...stageForm, type: e.target.value })}
              className="form-select"
            >
              <option value="Séance">Séance de conduite</option>
              <option value="Examen">Examen pratique</option>
              <option value="Code">Cours de code</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Titre</label>
            <input
              type="text"
              value={stageForm.title}
              onChange={(e) => setStageForm({ ...stageForm, title: e.target.value })}
              className="form-input"
              placeholder="Ex: Séance créneau, Examen code..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                value={stageForm.scheduled_date}
                onChange={(e) => setStageForm({ ...stageForm, scheduled_date: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Heure</label>
              <input
                type="time"
                value={stageForm.scheduled_time}
                onChange={(e) => setStageForm({ ...stageForm, scheduled_time: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Durée (minutes)</label>
            <input
              type="number"
              value={stageForm.duration_minutes || ''}
              onChange={(e) => setStageForm({ ...stageForm, duration_minutes: parseInt(e.target.value) || 60 })}
              className="form-input"
              min="15"
              step="15"
              placeholder="Ex: 60"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              value={stageForm.notes}
              onChange={(e) => setStageForm({ ...stageForm, notes: e.target.value })}
              className="form-textarea"
              rows="2"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowStageModal(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Planifier
            </button>
          </div>
        </form>
      </Modal>

      {/* Incident Modal */}
      <Modal
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        title="Signaler un Incident"
        size="sm"
      >
        <form onSubmit={handleAddIncident}>
          <div className="form-group">
            <label className="form-label">Type d'incident</label>
            <select
              value={incidentForm.type}
              onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}
              className="form-select"
            >
              <option value="Comportement">Comportement inapproprié</option>
              <option value="Retard">Retards répétés</option>
              <option value="Absence">Absence non justifiée</option>
              <option value="Matériel">Dégradation de matériel</option>
              <option value="Paiement">Non-respect des échéances</option>
              <option value="Sécurité">Non-respect des règles de sécurité</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Gravité</label>
            <select
              value={incidentForm.severity}
              onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
              className="form-select"
            >
              <option value="Mineur">Mineur</option>
              <option value="Avertissement">Avertissement</option>
              <option value="Grave">Grave</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date de l'incident</label>
            <input
              type="date"
              value={incidentForm.date}
              onChange={(e) => setIncidentForm({ ...incidentForm, date: e.target.value })}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={incidentForm.description}
              onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
              className="form-textarea"
              rows="3"
              placeholder="Décrivez l'incident en détail..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowIncidentModal(false)} className="btn btn-secondary">
              Annuler
            </button>
            <button type="submit" className="btn btn-danger">
              Signaler
            </button>
          </div>
        </form>
      </Modal>

      {/* Attendance Details Modal */}
      <Modal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        title="Détails de Présence"
        subtitle={student?.full_name}
        size="xl"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        iconColor="primary"
      >
        {student?.attendance && student.attendance.length > 0 && (() => {
          const today = getTodayISO();
          const now = new Date();
          const dayOfWeek = now.getDay();
          const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const monday = new Date(now);
          monday.setDate(now.getDate() - diffToMonday);
          const weekStart = monday.toISOString().split('T')[0];
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

          const calcMinutes = (timeIn, timeOut) => {
            if (!timeIn || !timeOut) return 0;
            const [hIn, mIn] = timeIn.split(':').map(Number);
            const [hOut, mOut] = timeOut.split(':').map(Number);
            const diff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
            return diff > 0 ? diff : 0;
          };

          // Compute per-record durations
          const records = student.attendance.map((r) => ({
            ...r,
            durationMin: calcMinutes(r.time_in, r.time_out),
          }));

          // Period totals
          let todayMin = 0, weekMin = 0, monthMin = 0, totalMin = 0;
          let todayCount = 0, weekCount = 0, monthCount = 0;
          records.forEach((r) => {
            totalMin += r.durationMin;
            if (r.date >= monthStart) { monthMin += r.durationMin; monthCount++; }
            if (r.date >= weekStart) { weekMin += r.durationMin; weekCount++; }
            if (r.date === today) { todayMin += r.durationMin; todayCount++; }
          });

          // Average per day (only days with attendance)
          const uniqueDays = new Set(records.map(r => r.date)).size;
          const avgPerDay = uniqueDays > 0 ? Math.round(totalMin / uniqueDays) : 0;

          // Filter records by selected period
          const filteredRecords = records.filter((r) => {
            if (attendancePeriod === 'day') return r.date === today;
            if (attendancePeriod === 'week') return r.date >= weekStart;
            if (attendancePeriod === 'month') return r.date >= monthStart;
            return true;
          });

          // Daily chart data (last 14 days for week/all, last 30 for month)
          const chartDays = attendancePeriod === 'day' ? 1 : attendancePeriod === 'week' ? 7 : attendancePeriod === 'month' ? 30 : 14;
          const chartData = [];
          for (let i = chartDays - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayRecords = records.filter(r => r.date === dateStr);
            const mins = dayRecords.reduce((sum, r) => sum + r.durationMin, 0);
            const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            chartData.push({ date: dateStr, label: dayLabel, minutes: mins, count: dayRecords.length });
          }
          const maxChartMin = Math.max(...chartData.map(d => d.minutes), 1);

          // Filtered totals
          const filteredMin = filteredRecords.reduce((sum, r) => sum + r.durationMin, 0);
          const filteredCount = filteredRecords.length;

          const periodLabels = {
            day: "Aujourd'hui",
            week: 'Cette semaine',
            month: 'Ce mois',
            all: 'Tout le temps',
          };

          return (
            <div>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <button
                  onClick={() => setAttendancePeriod('day')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    attendancePeriod === 'day'
                      ? 'bg-green-50 border-green-400 shadow-sm ring-2 ring-green-200'
                      : 'bg-green-50 border-green-100 hover:border-green-300'
                  }`}
                >
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Aujourd'hui</p>
                  <p className="text-xl font-bold text-green-700 mt-1">{formatDuration(todayMin)}</p>
                  <p className="text-xs text-green-500 mt-0.5">{todayCount} visite(s)</p>
                </button>
                <button
                  onClick={() => setAttendancePeriod('week')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    attendancePeriod === 'week'
                      ? 'bg-blue-50 border-blue-400 shadow-sm ring-2 ring-blue-200'
                      : 'bg-blue-50 border-blue-100 hover:border-blue-300'
                  }`}
                >
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Semaine</p>
                  <p className="text-xl font-bold text-blue-700 mt-1">{formatDuration(weekMin)}</p>
                  <p className="text-xs text-blue-500 mt-0.5">{weekCount} visite(s)</p>
                </button>
                <button
                  onClick={() => setAttendancePeriod('month')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    attendancePeriod === 'month'
                      ? 'bg-indigo-50 border-indigo-400 shadow-sm ring-2 ring-indigo-200'
                      : 'bg-indigo-50 border-indigo-100 hover:border-indigo-300'
                  }`}
                >
                  <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Mois</p>
                  <p className="text-xl font-bold text-indigo-700 mt-1">{formatDuration(monthMin)}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">{monthCount} visite(s)</p>
                </button>
                <button
                  onClick={() => setAttendancePeriod('all')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    attendancePeriod === 'all'
                      ? 'bg-gray-100 border-gray-400 shadow-sm ring-2 ring-gray-300'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total</p>
                  <p className="text-xl font-bold text-gray-700 mt-1">{formatDuration(totalMin)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{records.length} visite(s)</p>
                </button>
                <div className="p-3 rounded-xl border-2 bg-amber-50 border-amber-100 text-left">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Moy/Jour</p>
                  <p className="text-xl font-bold text-amber-700 mt-1">{formatDuration(avgPerDay)}</p>
                  <p className="text-xs text-amber-500 mt-0.5">{uniqueDays} jour(s)</p>
                </div>
              </div>

              {/* Bar Chart */}
              {chartData.length > 1 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Temps de présence par jour
                  </h3>
                  <div className="flex items-end gap-1" style={{ height: '160px' }}>
                    {chartData.map((d, i) => {
                      const heightPct = maxChartMin > 0 ? (d.minutes / maxChartMin) * 100 : 0;
                      const isToday = d.date === today;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          {/* Tooltip */}
                          {d.minutes > 0 && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              {formatDuration(d.minutes)} ({d.count})
                            </div>
                          )}
                          {/* Bar */}
                          <div
                            className={`w-full rounded-t-md transition-all duration-300 ${
                              isToday ? 'bg-primary-500' : d.minutes > 0 ? 'bg-primary-300 group-hover:bg-primary-400' : 'bg-gray-200'
                            }`}
                            style={{ height: `${Math.max(heightPct, d.minutes > 0 ? 4 : 2)}%`, minHeight: '2px' }}
                          />
                          {/* Label */}
                          <span className={`text-[9px] mt-1 ${isToday ? 'font-bold text-primary-700' : 'text-gray-400'} ${chartData.length > 14 ? 'hidden md:block' : ''}`}>
                            {d.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Count summary */}
              <div className="flex items-center justify-end mb-3">
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-700">{filteredCount}</span> enregistrement(s)
                  <span className="mx-1.5 text-gray-300">|</span>
                  <span className="font-semibold text-primary-600">{formatDuration(filteredMin)}</span> total
                </div>
              </div>

              {/* Full table */}
              {filteredRecords.length > 0 ? (
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entrée</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sortie</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durée</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRecords.map((record, idx) => (
                        <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${record.date === today ? 'bg-primary-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{formatDate(record.date)}</span>
                            {record.date === today && (
                              <span className="ml-2 text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
                                Aujourd'hui
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-400"></span>
                              <span className="font-mono text-gray-700">{record.time_in || '-'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-400"></span>
                              <span className="font-mono text-gray-700">{record.time_out || '-'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {record.durationMin > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg font-semibold text-xs">
                                {formatDuration(record.durationMin)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${getStatusBadgeClass(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Table footer with totals */}
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td className="px-4 py-3 font-semibold text-gray-700" colSpan={3}>
                          Total ({periodLabels[attendancePeriod]})
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 bg-primary-100 text-primary-800 rounded-lg font-bold text-xs">
                            {formatDuration(filteredMin)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {filteredCount} visite(s)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>Aucune présence pour cette période</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Contract Info Modal */}
      <Modal
        isOpen={showContractInfoModal}
        onClose={() => setShowContractInfoModal(false)}
        title={contractType === 'contrat' ? 'Informations du Contrat' : contractType === 'demande15' ? 'Informations - Demande 15 Jours' : "Informations - Contrat d'Avancement"}
        size="lg"
      >
        {contractData && (
          <div>
            {contractType === 'contrat' ? (
              <>
                {/* === CONTRAT FORM === */}
                {/* School Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Informations Auto-École
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Nom de l'Auto-École</label>
                      <input type="text" value={contractData.school_name} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, school_name: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Adresse</label>
                      <input type="text" value={contractData.address} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, address: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Téléphone</label>
                      <input type="text" value={contractData.phone} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, phone: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Email</label>
                      <input type="text" value={contractData.email} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, email: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Ville</label>
                      <input type="text" value={contractData.city} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, city: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">الفاكس - Fax</label>
                      <input type="text" value={contractData.fax} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, fax: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">السجل الضريبي - Registre fiscal</label>
                      <input type="text" value={contractData.tax_register} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, tax_register: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">السجل التجاري - Registre commerce</label>
                      <input type="text" value={contractData.commercial_register} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, commercial_register: v })); }} className="form-input text-sm" />
                    </div>
                  </div>
                </div>

                <hr className="my-4 border-gray-200" />

                {/* Student Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Informations du Candidat
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-group mb-0 md:col-span-2">
                      <label className="form-label text-xs">Nom Complet</label>
                      <input type="text" value={contractData.full_name} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, full_name: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">CIN</label>
                      <input type="text" value={contractData.cin} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, cin: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Lieu de Naissance</label>
                      <input type="text" value={contractData.birth_place} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, birth_place: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date de Naissance</label>
                      <input type="text" value={contractData.birth_date} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, birth_date: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Adresse du Candidat</label>
                      <input type="text" value={contractData.student_address} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, student_address: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">المرجع على الويب - Référence web</label>
                      <input type="text" value={contractData.web_reference} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, web_reference: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Type de Permis</label>
                      <select value={contractData.license_type} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, license_type: v })); }} className="form-input text-sm">
                        {LICENSE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date d'Inscription</label>
                      <input type="text" value={contractData.registration_date} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, registration_date: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">N° du Contrat</label>
                      <input type="text" value={contractData.contract_number} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, contract_number: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date du Document</label>
                      <input type="text" value={contractData.contract_date} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, contract_date: v })); }} className="form-input text-sm" />
                    </div>
                  </div>
                </div>
              </>
            ) : contractType === 'demande15' ? (
              <>
                {/* === DEMANDE 15 JOURS FORM === */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Auto-Ecole
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Nom de l'Auto-Ecole</label>
                      <input type="text" value={contractData.school_name || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, school_name: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Adresse</label>
                      <input type="text" value={contractData.address || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, address: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Telephone</label>
                      <input type="text" value={contractData.phone || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, phone: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Ville</label>
                      <input type="text" value={contractData.city || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, city: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date du Document</label>
                      <input type="text" value={contractData.contract_date || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, contract_date: v })); }} className="form-input text-sm" />
                    </div>
                  </div>
                </div>

                <hr className="my-4 border-gray-200" />

                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Candidat
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Nom</label>
                      <input type="text" value={contractData.nom || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, nom: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Prenom</label>
                      <input type="text" value={contractData.prenom || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, prenom: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">CINE N°</label>
                      <input type="text" value={contractData.cin || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, cin: v })); }} className="form-input text-sm" />
                    </div>
                  </div>
                </div>

                <hr className="my-4 border-gray-200" />

                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Dates d'Examen
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date examen prevue</label>
                      <input type="text" value={contractData.exam_date || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, exam_date: v })); }} className="form-input text-sm" placeholder="JJ/MM/AAAA" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date demandee</label>
                      <input type="text" value={contractData.requested_date || ''} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, requested_date: v })); }} className="form-input text-sm" placeholder="JJ/MM/AAAA" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* === CONTRAT D'AVANCEMENT FORM === */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Auto-École
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Nom de l'Auto-École</label>
                      <input type="text" value={contractData.school_name} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, school_name: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Adresse</label>
                      <input type="text" value={contractData.address} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, address: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Téléphone</label>
                      <input type="text" value={contractData.phone} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, phone: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Ville</label>
                      <input type="text" value={contractData.city} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, city: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date du Document</label>
                      <input type="text" value={contractData.contract_date} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, contract_date: v })); }} className="form-input text-sm" />
                    </div>
                  </div>
                </div>

                <hr className="my-4 border-gray-200" />

                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Informations du Candidat
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-group mb-0 md:col-span-2">
                      <label className="form-label text-xs">Nom Complet</label>
                      <input type="text" value={contractData.full_name} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, full_name: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">CIN</label>
                      <input type="text" value={contractData.cin} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, cin: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date de Naissance</label>
                      <input type="text" value={contractData.birth_date} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, birth_date: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Lieu de Naissance</label>
                      <input type="text" value={contractData.birth_place} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, birth_place: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Adresse du Candidat</label>
                      <input type="text" value={contractData.student_address} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, student_address: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Réf. Web</label>
                      <input type="text" value={contractData.web_reference} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, web_reference: v })); }} className="form-input text-sm" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Type de Permis</label>
                      <select value={contractData.license_type} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, license_type: v })); }} className="form-input text-sm">
                        {LICENSE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="my-4 border-gray-200" />

                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Dates d'Examen
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date examen Code (prévue)</label>
                      <input type="text" value={contractData.exam_code_date} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, exam_code_date: v })); }} className="form-input text-sm" placeholder="JJ/MM/AAAA" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date Code demandée</label>
                      <input type="text" value={contractData.requested_code_date} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, requested_code_date: v })); }} className="form-input text-sm" placeholder="JJ/MM/AAAA" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date examen Conduite (prévue)</label>
                      <input type="text" value={contractData.exam_conduit_date} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, exam_conduit_date: v })); }} className="form-input text-sm" placeholder="JJ/MM/AAAA" />
                    </div>
                    <div className="form-group mb-0">
                      <label className="form-label text-xs">Date Conduite demandée</label>
                      <input type="text" value={contractData.requested_conduit_date} onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, requested_conduit_date: v })); }} className="form-input text-sm" placeholder="JJ/MM/AAAA" />
                    </div>
                  </div>
                </div>

                <hr className="my-4 border-gray-200" />

                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Motif</h3>
                  <div className="form-group mb-0">
                    <textarea
                      value={contractData.motif}
                      onChange={(e) => { const v = e.target.value; setContractData(prev => ({ ...prev, motif: v })); }}
                      className="form-input text-sm"
                      rows={3}
                      placeholder="Motif de la demande d'avancement..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* Generate Button */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowContractInfoModal(false)}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={generatingContract}
                onClick={async () => {
                  setGeneratingContract(true);
                  try {
                    let result;
                    if (contractType === 'contrat') {
                      result = await api.contracts.generate(parseInt(id), contractData);
                    } else if (contractType === 'demande15') {
                      result = await api.demande15.generate(parseInt(id), contractData);
                    } else {
                      result = await api.contratAvancement.generate(parseInt(id), contractData);
                    }
                    if (result.success) {
                      alert(contractType === 'contrat'
                        ? 'Contrat généré avec succès'
                        : contractType === 'demande15'
                        ? 'Demande 15 jours générée avec succès'
                        : "Contrat d'avancement généré avec succès");
                      const docsData = await api.documents.getByStudent(parseInt(id));
                      setDocuments(docsData || []);
                      setShowContractInfoModal(false);
                    } else {
                      alert('Erreur: ' + (result.error || 'Échec de génération'));
                    }
                  } catch (err) {
                    console.error('Generation error:', err);
                    alert('Erreur lors de la génération');
                  } finally {
                    setGeneratingContract(false);
                  }
                }}
                className="btn btn-primary flex items-center gap-2"
                style={{
                  backgroundColor: contractType === 'contrat' ? '#8b5cf6' : contractType === 'demande15' ? '#f59e0b' : '#10b981',
                }}
              >
                {generatingContract ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Génération...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Générer {contractType === 'contrat' ? 'le Contrat' : contractType === 'demande15' ? 'la Demande' : "le Contrat d'Avancement"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Document Viewer */}
      <DocumentViewer
        isOpen={showDocumentViewer}
        onClose={() => {
          setShowDocumentViewer(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        filePath={selectedDocument?.file_path}
      />
    </div>
  );
}

export default StudentDetail;
