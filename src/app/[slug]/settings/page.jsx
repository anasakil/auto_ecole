'use client';

import React, { useState, useEffect } from 'react';
import api from '@/utils/api';
import { FormPageSkeleton } from '@/components/skeletons';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/contexts/ToastContext';

function Settings() {
  const [settings, setSettings] = useState({
    school_name: '',
    address: '',
    phone: '',
    gsm: '',
    email: '',
    default_training_days: 30,
    tax_register: '',
    commercial_register: '',
    tp: '',
    cnss: '',
    ice: '',
    capital: '',
    city: '',
    fax: '',
    logo: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const { slug } = useTenant();
  const toast = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await api.settings.get();
      if (data) {
        setSettings({
          school_name: data.school_name || '',
          address: data.address || '',
          phone: data.phone || '',
          gsm: data.gsm || '',
          email: data.email || '',
          default_training_days: data.default_training_days || 30,
          tax_register: data.tax_register || '',
          commercial_register: data.commercial_register || '',
          tp: data.tp || '',
          cnss: data.cnss || '',
          ice: data.ice || '',
          capital: data.capital || '',
          city: data.city || '',
          fax: data.fax || '',
          logo: data.logo || '',
        });
        if (data.logo) {
          try {
            const imgData = await api.files.getBase64(data.logo);
            if (imgData) setLogoPreview(imgData);
          } catch {}
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let updatedSettings = { ...settings };
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('subfolder', 'logos');
        const uploadRes = await fetch('/api/files', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          updatedSettings.logo = uploadData.path;
          setSettings(prev => ({ ...prev, logo: uploadData.path }));
        }
      }
      await api.settings.update(updatedSettings);
      setLogoFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setSaving(false);
    }
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleChange(e) {
    const { name, value, type } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
  }

  if (loading) {
    return <FormPageSkeleton fields={10} />;
  }

  const loginUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${slug}/login`
    : `/${slug}/login`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Configuration de l'auto-école</p>
      </div>

      {/* Direct login link */}
      <div className="card mb-6 bg-blue-50 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-800">Lien de connexion direct</p>
            <p className="text-xs text-blue-600 mt-0.5 font-mono break-all">{loginUrl}</p>
          </div>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(loginUrl); toast.success('Lien copié !'); }}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copier le lien
          </button>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          {/* School Information */}
          <div className="card mb-6">
            <h2 className="card-header">Informations de l'Auto-École</h2>
            <div className="form-group">
              <label className="form-label">Nom de l'Auto-École</label>
              <input type="text" name="school_name" value={settings.school_name} onChange={handleChange} className="form-input" placeholder="Ex: Auto-École Excellence" />
            </div>
            <div className="form-group">
              <label className="form-label">Adresse</label>
              <input type="text" name="address" value={settings.address} onChange={handleChange} className="form-input" placeholder="Ex: N°1136 Lot Afaq 02, Saada – Marrakech" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Tél / Fax</label>
                <input type="tel" name="phone" value={settings.phone} onChange={handleChange} className="form-input" placeholder="Ex: 06 64 54 53 43" />
              </div>
              <div className="form-group">
                <label className="form-label">GSM</label>
                <input type="tel" name="gsm" value={settings.gsm || ''} onChange={handleChange} className="form-input" placeholder="Ex: 06 55 80 76 29" />
              </div>
              <div className="form-group">
                <label className="form-label">Fax</label>
                <input type="text" name="fax" value={settings.fax || ''} onChange={handleChange} className="form-input" placeholder="Ex: 05 24 XX XX XX" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" name="email" value={settings.email} onChange={handleChange} className="form-input" placeholder="Ex: contact@autoecole.ma" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ville</label>
              <input type="text" name="city" value={settings.city} onChange={handleChange} className="form-input" placeholder="Ex: Marrakech" />
            </div>
          </div>

          {/* Logo */}
          <div className="card mb-6">
            <h2 className="card-header">Logo</h2>
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded-xl object-contain border border-gray-200 bg-gray-50 p-1" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <label className="btn btn-secondary cursor-pointer">
                  {logoPreview ? 'Changer le logo' : 'Choisir un logo'}
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
                <p className="text-xs text-gray-400 mt-2">PNG, JPG ou SVG. Max 2 Mo.</p>
                {logoPreview && (
                  <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); setSettings(prev => ({ ...prev, logo: '' })); }} className="text-xs text-red-500 hover:text-red-700 mt-1 block">
                    Supprimer le logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Legal Information */}
          <div className="card mb-6">
            <h2 className="card-header">Informations Légales</h2>
            <p className="text-sm text-gray-500 mb-4">Ces informations apparaissent sur les contrats et documents officiels.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Capital (SARL)</label>
                <input type="text" name="capital" value={settings.capital || ''} onChange={handleChange} className="form-input" placeholder="Ex: 10.000,00 Dhs" />
              </div>
              <div className="form-group">
                <label className="form-label">RC (Registre de commerce)</label>
                <input type="text" name="commercial_register" value={settings.commercial_register} onChange={handleChange} className="form-input" placeholder="Ex: 100775" />
              </div>
              <div className="form-group">
                <label className="form-label">T.P (Taxe professionnelle)</label>
                <input type="text" name="tp" value={settings.tp || ''} onChange={handleChange} className="form-input" placeholder="Ex: 47940305" />
              </div>
              <div className="form-group">
                <label className="form-label">I.F (Identifiant fiscal)</label>
                <input type="text" name="tax_register" value={settings.tax_register} onChange={handleChange} className="form-input" placeholder="Ex: 39405279" />
              </div>
              <div className="form-group">
                <label className="form-label">CNSS</label>
                <input type="text" name="cnss" value={settings.cnss || ''} onChange={handleChange} className="form-input" placeholder="Ex: 1817556" />
              </div>
              <div className="form-group">
                <label className="form-label">ICE</label>
                <input type="text" name="ice" value={settings.ice || ''} onChange={handleChange} className="form-input" placeholder="Ex: 002347009000081" />
              </div>
            </div>
          </div>

          {/* Training Settings */}
          <div className="card mb-6">
            <h2 className="card-header">Paramètres de Formation</h2>
            <div className="form-group">
              <label className="form-label">Durée de formation par défaut (jours)</label>
              <input type="number" name="default_training_days" value={settings.default_training_days || ''} onChange={handleChange} className="form-input" min="1" max="365" placeholder="Ex: 30" />
              <p className="text-sm text-gray-500 mt-1">Cette durée sera appliquée par défaut aux nouveaux étudiants</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enregistrement...
                </>
              ) : 'Enregistrer les paramètres'}
            </button>
            {saved && (
              <span className="text-green-600 flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Paramètres enregistrés
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;
