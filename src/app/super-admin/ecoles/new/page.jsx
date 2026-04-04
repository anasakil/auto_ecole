'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function NewEcolePage() {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    gsm: '',
    email: '',
    fax: '',
    city: '',
    tax_register: '',
    commercial_register: '',
    tp: '',
    cnss: '',
    ice: '',
    capital: '',
    web_reference: '',
    adminUsername: '',
    adminPassword: '',
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  function handleNameChange(value) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugManuallyEdited ? prev.slug : slugify(value),
    }));
    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
  }

  function handleSlugChange(value) {
    const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setForm((prev) => ({ ...prev, slug: cleanSlug }));
    setSlugManuallyEdited(true);
    if (errors.slug) setErrors((prev) => ({ ...prev, slug: '' }));
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez selectionner une image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas depasser 2 Mo");
      return;
    }
    setLogo(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function validate() {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.slug.trim()) {
      newErrors.slug = 'Le slug est requis';
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) {
      newErrors.slug = 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets';
    }
    if (!form.adminUsername.trim()) newErrors.adminUsername = "Le nom d'utilisateur admin est requis";
    if (!form.adminPassword) {
      newErrors.adminPassword = 'Le mot de passe est requis';
    } else if (form.adminPassword.length < 6) {
      newErrors.adminPassword = 'Le mot de passe doit contenir au moins 6 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setSubmitting(true);

    try {
      // Upload logo if provided
      let logoPath = null;
      if (logo) {
        const formData = new FormData();
        formData.append('file', logo);
        formData.append('subfolder', 'logos');
        const uploadRes = await fetch('/api/files', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          logoPath = uploadData.filePath;
        }
      }

      // Create everything in one call
      const res = await fetch('/api/super-admin/ecoles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          address: form.address,
          phone: form.phone,
          gsm: form.gsm,
          email: form.email,
          fax: form.fax,
          city: form.city,
          tax_register: form.tax_register,
          commercial_register: form.commercial_register,
          tp: form.tp,
          cnss: form.cnss,
          ice: form.ice,
          capital: form.capital,
          web_reference: form.web_reference,
          logo: logoPath,
          adminUsername: form.adminUsername,
          adminPassword: form.adminPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la creation de l'auto-ecole");
      }

      toast.success('Auto-ecole creee avec succes');
      router.push('/super-admin/ecoles');
    } catch (err) {
      console.error('Error creating ecole:', err);
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (field) =>
    `w-full h-10 px-3 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-primary-500/20 transition-colors ${
      errors[field] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'
    }`;

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto">
      {/* Back Button */}
      <Link
        href="/super-admin/ecoles"
        className="inline-flex items-center gap-2 text-sm text-dark-muted hover:text-gray-700 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour aux auto-ecoles
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Nouvelle Auto-Ecole</h1>
        <p className="text-dark-muted mt-1">Creer une nouvelle auto-ecole avec toutes ses informations</p>
      </div>

      {apiError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identification */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'auto-ecole <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex: Auto-Ecole Atlas" className={inputClass('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="auto-ecole-atlas" className={`${inputClass('slug')} font-mono`} />
              <p className="mt-1 text-xs text-gray-400">Identifiant unique dans l'URL</p>
              {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="Ex: Casablanca" className={inputClass('city')} />
            </div>
          </div>
        </div>

        {/* Section 2: Logo */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Logo de l&apos;école
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className={`w-32 h-32 rounded-2xl flex items-center justify-center overflow-hidden transition-all ${logoPreview ? 'bg-gray-50 border-2 border-primary-200 shadow-lg' : 'bg-gray-100 border-2 border-dashed border-gray-300'}`}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">Aucun logo</span>
                </div>
              )}
            </div>
            {logoPreview && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-xl border border-purple-100 w-full">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #6C5CE7, #4834D4)' }}>
                  <div className="w-full h-full flex items-center justify-center p-0.5">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-lg bg-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-purple-700 truncate">{form.name || 'Auto-École'}</p>
                  <p className="text-[10px] text-purple-400">Aperçu dans la barre latérale</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 active:scale-95 transition-all cursor-pointer border border-primary-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {logoPreview ? 'Changer' : 'Choisir un logo'}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => { setLogo(null); setLogoPreview(null); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-all border border-red-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400">PNG, JPG ou SVG · Max 2 Mo</p>
          </div>
        </div>

        {/* Section 3: Contact */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Coordonnees
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input type="text" value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Adresse complete" className={inputClass('address')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
              <input type="text" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="06 XX XX XX XX" className={inputClass('phone')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSM</label>
              <input type="text" value={form.gsm} onChange={(e) => handleChange('gsm', e.target.value)} placeholder="Ex: 06 55 80 76 29" className={inputClass('gsm')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
              <input type="text" value={form.fax} onChange={(e) => handleChange('fax', e.target.value)} placeholder="05 XX XX XX XX" className={inputClass('fax')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="contact@auto-ecole.ma" className={inputClass('email')} />
            </div>
          </div>
        </div>

        {/* Section 4: Legal */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Informations legales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capital (SARL)</label>
              <input type="text" value={form.capital} onChange={(e) => handleChange('capital', e.target.value)} placeholder="Ex: 10.000,00 Dhs" className={inputClass('capital')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RC (Registre de commerce)</label>
              <input type="text" value={form.commercial_register} onChange={(e) => handleChange('commercial_register', e.target.value)} placeholder="Ex: 100775" className={inputClass('commercial_register')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">T.P (Taxe professionnelle)</label>
              <input type="text" value={form.tp} onChange={(e) => handleChange('tp', e.target.value)} placeholder="Ex: 47940305" className={inputClass('tp')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">I.F (Identifiant fiscal)</label>
              <input type="text" value={form.tax_register} onChange={(e) => handleChange('tax_register', e.target.value)} placeholder="Ex: 39405279" className={inputClass('tax_register')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNSS</label>
              <input type="text" value={form.cnss} onChange={(e) => handleChange('cnss', e.target.value)} placeholder="Ex: 1817556" className={inputClass('cnss')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ICE</label>
              <input type="text" value={form.ice} onChange={(e) => handleChange('ice', e.target.value)} placeholder="Ex: 002347009000081" className={inputClass('ice')} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference web</label>
              <input type="text" value={form.web_reference} onChange={(e) => handleChange('web_reference', e.target.value)} placeholder="Site web ou reference" className={inputClass('web_reference')} />
            </div>
          </div>
        </div>

        {/* Section 5: Admin */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Administrateur
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom d'utilisateur <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.adminUsername} onChange={(e) => handleChange('adminUsername', e.target.value)} placeholder="admin" className={inputClass('adminUsername')} />
              {errors.adminUsername && <p className="mt-1 text-xs text-red-600">{errors.adminUsername}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <input type="password" value={form.adminPassword} onChange={(e) => handleChange('adminPassword', e.target.value)} placeholder="Minimum 6 caracteres" className={inputClass('adminPassword')} />
              {errors.adminPassword && <p className="mt-1 text-xs text-red-600">{errors.adminPassword}</p>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/super-admin/ecoles" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creation en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Creer l'auto-ecole
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
