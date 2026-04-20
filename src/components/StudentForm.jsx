'use client';
import React, { useState, useEffect, useRef } from 'react';
import { LICENSE_TYPES, STUDENT_STATUSES, getTodayISO } from '@/utils/helpers';
import api from '@/utils/api';

function FormField({ label, name, required, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function StudentForm({ student, onSave, onCancel, isLoading = false }) {
  const [offers, setOffers] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', cin: '', birth_place: '', birth_date: '', phone: '', email: '', address: '',
    ville: '', autre_ville: '',
    license_type: 'B', registration_date: getTodayISO(), status: 'En formation',
    training_start_date: getTodayISO(), training_duration_days: 30, offer_id: '', total_price: 0,
    interested_licenses: [], reminder_date: '', internal_notes: '',
  });

  const [autreVilleEnabled, setAutreVilleEnabled] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [cinDocument, setCinDocument] = useState(null);
  const [cinDocumentPreview, setCinDocumentPreview] = useState(null);
  const [additionalDocs, setAdditionalDocs] = useState([]);

  const profileInputRef = useRef(null);
  const cinInputRef = useRef(null);
  const docsInputRef = useRef(null);

  useEffect(() => {
    loadOffers();
    if (student) {
      let interestedLicenses = student.interested_licenses || [];
      if (typeof interestedLicenses === 'string' && interestedLicenses) {
        interestedLicenses = interestedLicenses.split(',').map(l => l.trim());
      }
      if (student.autre_ville === 'Autre') setAutreVilleEnabled(true);
      setFormData({
        full_name: student.full_name || '', cin: student.cin || '', birth_place: student.birth_place || '',
        birth_date: student.birth_date || '', phone: student.phone || '', email: student.email || '',
        address: student.address || '', ville: student.ville || '', autre_ville: student.autre_ville || '',
        license_type: student.license_type || 'B',
        registration_date: student.registration_date || getTodayISO(), status: student.status || 'En formation',
        training_start_date: student.training_start_date || student.registration_date || getTodayISO(),
        training_duration_days: student.training_duration_days || 30, offer_id: student.offer_id || '',
        total_price: student.total_price || 0, interested_licenses: interestedLicenses,
        reminder_date: student.reminder_date || '', internal_notes: student.internal_notes || '',
      });
    }
  }, [student]);

  async function loadOffers() {
    try {
      const data = await api.offers.getAll();
      setOffers(data);
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  }

  function validateField(name, value) {
    let error = '';
    switch (name) {
      case 'full_name':
        if (!value.trim()) error = 'Le nom complet est requis';
        else if (value.trim().length < 3) error = 'Le nom doit contenir au moins 3 caractères';
        break;
      case 'cin':
        if (value && !/^[A-Z]{1,2}\d{5,6}$/i.test(value)) error = 'Format CIN invalide (ex: AB123456)';
        break;
      case 'phone':
        if (value && !/^(0[5-7]\d{8}|\+212[5-7]\d{8})$/.test(value.replace(/\s/g, ''))) error = 'Format téléphone invalide (ex: 0612345678)';
        break;
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Format email invalide';
        break;
      case 'total_price':
        if (value < 0) error = 'Le prix ne peut pas être négatif';
        break;
      case 'training_duration_days':
        if (value < 1) error = 'La durée doit être d\'au moins 1 jour';
        break;
    }
    return error;
  }

  function handleChange(e) {
    const { name, value, type } = e.target;
    const newValue = type === 'number' ? parseFloat(value) || 0 : value;
    setFormData((prev) => {
      const updated = { ...prev, [name]: newValue };
      if (name === 'license_type') {
        updated.interested_licenses = (prev.interested_licenses || []).filter(l => l !== newValue);
      }
      return updated;
    });
    if (newValue || submitted) {
      const error = validateField(name, newValue);
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (value) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  }

  function handleOfferChange(e) {
    const offerId = e.target.value;
    const selectedOffer = offers.find((o) => o.id === parseInt(offerId));
    setFormData((prev) => ({
      ...prev, offer_id: offerId,
      total_price: selectedOffer ? selectedOffer.price : prev.total_price,
      license_type: selectedOffer ? selectedOffer.license_type : prev.license_type,
    }));
  }

  function handleInterestedLicenseChange(license) {
    setFormData((prev) => {
      const currentLicenses = prev.interested_licenses || [];
      const isSelected = currentLicenses.includes(license);
      return { ...prev, interested_licenses: isSelected ? currentLicenses.filter((l) => l !== license) : [...currentLicenses, license] };
    });
  }

  function handleFileSelect(files, type) {
    if (type === 'profile') {
      const file = files[0];
      if (file && file.type.startsWith('image/')) {
        setProfileImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setProfileImagePreview(reader.result);
        reader.readAsDataURL(file);
      }
    } else if (type === 'cin') {
      const file = files[0];
      if (file) {
        setCinDocument(file);
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => setCinDocumentPreview(reader.result);
          reader.readAsDataURL(file);
        } else {
          setCinDocumentPreview('pdf');
        }
      }
    } else if (type === 'docs') {
      const newDocs = Array.from(files).map((file) => ({
        file, name: file.name, type: file.type.startsWith('image/') ? 'image' : 'document',
      }));
      setAdditionalDocs((prev) => [...prev, ...newDocs]);
    }
  }

  function validateForm() {
    const newErrors = {};
    const fullNameError = validateField('full_name', formData.full_name);
    if (fullNameError) newErrors.full_name = fullNameError;
    if (formData.cin) { const e = validateField('cin', formData.cin); if (e) newErrors.cin = e; }
    if (formData.phone) { const e = validateField('phone', formData.phone); if (e) newErrors.phone = e; }
    if (formData.email) { const e = validateField('email', formData.email); if (e) newErrors.email = e; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (!validateForm()) {
      const newErrors = {};
      const fullNameError = validateField('full_name', formData.full_name);
      if (fullNameError) newErrors.full_name = fullNameError;
      if (newErrors.full_name || errors.cin || errors.phone || errors.email) setActiveTab('info');
      return;
    }
    const dataToSave = {
      ...formData,
      interested_licenses: Array.isArray(formData.interested_licenses) ? formData.interested_licenses.join(',') : formData.interested_licenses,
    };
    onSave({ ...dataToSave, _files: { profileImage, cinDocument, additionalDocs } });
  }

  const tabs = [
    { id: 'info', label: 'Informations', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', hasError: !!(errors.full_name || errors.cin || errors.phone || errors.email) },
    { id: 'documents', label: 'Documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', hasError: false },
    { id: 'formation', label: 'Formation', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', hasError: false },
  ];

  const allInterestedLicenseOptions = [
    { value: 'A', label: 'Permis A (Moto)' }, { value: 'B', label: 'Permis B (Voiture)' },
    { value: 'C', label: 'Permis C (Camion)' }, { value: 'D', label: 'Permis D (Bus)' },
    { value: 'E', label: 'Permis E' },
    { value: 'EC', label: 'Permis EC (Remorque)' },
  ];
  const interestedLicenseOptions = allInterestedLicenseOptions.filter(
    (opt) => opt.value !== formData.license_type
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 md:space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.hasError && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <FormField label="Nom Complet" name="full_name" required error={errors.full_name}>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} onBlur={handleBlur} placeholder="Entrez le nom complet" className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.full_name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
            </FormField>
          </div>
          <FormField label="CIN" name="cin" error={errors.cin}>
            <input type="text" name="cin" value={formData.cin} onChange={handleChange} onBlur={handleBlur} placeholder="AB123456" className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.cin ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
          </FormField>
          <FormField label="Lieu de naissance" name="birth_place">
            <input type="text" name="birth_place" value={formData.birth_place} onChange={handleChange} placeholder="Lieu de naissance" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors border-gray-300" />
          </FormField>
          <FormField label="Date de naissance" name="birth_date">
            <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors border-gray-300" />
          </FormField>
          <FormField label="Téléphone" name="phone" error={errors.phone}>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur} placeholder="0612345678" className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
          </FormField>
          <FormField label="Email" name="email" error={errors.email}>
            <input type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder="email@exemple.com" className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
          </FormField>
          <FormField label="Adresse" name="address">
            <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Adresse complète" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
          </FormField>
          <FormField label="Ville" name="ville">
            <input type="text" name="ville" value={formData.ville} onChange={handleChange} placeholder="Ex: Agadir, Marrakech..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
          </FormField>
          <div className="flex items-center self-end pb-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${autreVilleEnabled ? 'bg-primary-500 border-primary-500' : 'border-gray-300 group-hover:border-primary-400'}`}>
                {autreVilleEnabled && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={autreVilleEnabled}
                onChange={(e) => {
                  setAutreVilleEnabled(e.target.checked);
                  setFormData((prev) => ({ ...prev, autre_ville: e.target.checked ? 'Autre' : '' }));
                }}
              />
              <span className="text-sm font-medium text-gray-700">Autre ville</span>
            </label>
          </div>
          <FormField label="Offre" name="offer_id">
            <select name="offer_id" value={formData.offer_id} onChange={handleOfferChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white">
              <option value="">-- Sélectionner --</option>
              {offers.map((o) => (<option key={o.id} value={o.id}>{o.name} - {o.price} MAD</option>))}
            </select>
          </FormField>
          <FormField label="Type de Permis" name="license_type" required>
            <select name="license_type" value={formData.license_type} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white" required>
              {LICENSE_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </FormField>
          <FormField label="Prix Total (MAD)" name="total_price" error={errors.total_price}>
            <input type="number" name="total_price" value={formData.total_price || ''} onChange={handleChange} min="0" placeholder="Ex: 3500" className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.total_price ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
          </FormField>
          <FormField label="Statut" name="status">
            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors bg-white">
              {STUDENT_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
            </select>
          </FormField>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Photo + CIN side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Photo de Profil */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Photo de Profil</span>
              </div>
              {profileImagePreview ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <img src={profileImagePreview} alt="Preview" className="w-10 h-10 rounded-full object-cover border-2 border-primary-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{profileImage?.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{(profileImage?.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" onClick={() => { setProfileImage(null); setProfileImagePreview(null); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <label className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e.target.files, 'profile')} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary-50 border-2 border-dashed border-primary-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Ajouter une photo</p>
                    <p className="text-[11px] text-gray-400">JPG, PNG · max 5 Mo</p>
                  </div>
                  <input ref={profileInputRef} type="file" accept="image/*" onChange={(e) => handleFileSelect(e.target.files, 'profile')} className="hidden" />
                </label>
              )}
            </div>

            {/* Copie CIN */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" /></svg>
                </div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Copie CIN</span>
              </div>
              {cinDocumentPreview ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cinDocumentPreview === 'pdf' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                    {cinDocumentPreview === 'pdf' ? (
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    ) : (
                      <img src={cinDocumentPreview} alt="CIN" className="w-full h-full object-cover rounded-lg" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{cinDocument?.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{(cinDocument?.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" onClick={() => { setCinDocument(null); setCinDocumentPreview(null); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <label className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect(e.target.files, 'cin')} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Ajouter la CIN</p>
                    <p className="text-[11px] text-gray-400">Image ou PDF</p>
                  </div>
                  <input ref={cinInputRef} type="file" accept="image/*,.pdf" onChange={(e) => handleFileSelect(e.target.files, 'cin')} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Documents Supplémentaires */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Documents Supplémentaires</span>
                {additionalDocs.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">{additionalDocs.length}</span>
                )}
              </div>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer border border-green-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Ajouter
                <input ref={docsInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => handleFileSelect(e.target.files, 'docs')} className="hidden" />
              </label>
            </div>

            {additionalDocs.length === 0 ? (
              <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-green-50 border-2 border-dashed border-green-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <p className="text-xs text-gray-400">Certificats, attestations, photos…</p>
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => handleFileSelect(e.target.files, 'docs')} className="hidden" />
              </label>
            ) : (
              <div className="divide-y divide-gray-100">
                {additionalDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.type === 'image' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                      <svg className={`w-4 h-4 ${doc.type === 'image' ? 'text-green-500' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {doc.type === 'image'
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        }
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{doc.name}</p>
                      <p className="text-[11px] text-gray-400">{(doc.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" onClick={() => setAdditionalDocs((prev) => prev.filter((_, idx) => idx !== i))} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'formation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Date d'inscription" name="registration_date">
              <input type="date" name="registration_date" value={formData.registration_date} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
            </FormField>
            <FormField label="Date début formation" name="training_start_date">
              <input type="date" name="training_start_date" value={formData.training_start_date} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
            </FormField>
            <FormField label="Durée formation (jours)" name="training_duration_days" error={errors.training_duration_days}>
              <input type="number" name="training_duration_days" value={formData.training_duration_days || ''} onChange={handleChange} min="1" placeholder="Ex: 30" className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${errors.training_duration_days ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
            </FormField>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Suivi Post-Permis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">Intéressé par</label>
                <div className="flex flex-wrap gap-3">
                  {interestedLicenseOptions.map((option) => (
                    <label key={option.value} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-all ${formData.interested_licenses?.includes(option.value) ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      <input type="checkbox" checked={formData.interested_licenses?.includes(option.value) || false} onChange={() => handleInterestedLicenseChange(option.value)} className="sr-only" />
                      <svg className={`w-5 h-5 ${formData.interested_licenses?.includes(option.value) ? 'text-primary-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {formData.interested_licenses?.includes(option.value) ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />)}
                      </svg>
                      <span className="font-medium text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <FormField label="Date de rappel" name="reminder_date">
                <input type="date" name="reminder_date" value={formData.reminder_date} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Notes internes" name="internal_notes">
                  <textarea name="internal_notes" value={formData.internal_notes} onChange={handleChange} rows={4} placeholder="Notes pour le suivi..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none" />
                </FormField>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
        <div className="flex flex-wrap gap-2">
          {profileImage && (<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Photo</span>)}
          {cinDocument && (<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>CIN</span>)}
          {additionalDocs.length > 0 && (<span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">{additionalDocs.length} document(s)</span>)}
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button type="button" onClick={onCancel} disabled={isLoading} className="flex-1 sm:flex-initial px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Annuler</button>
          <button type="submit" disabled={isLoading} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? (
              <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>Enregistrement...</span></>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{student ? 'Enregistrer' : 'Créer l\'étudiant'}</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

export default StudentForm;
