'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/contexts/ConfirmContext';

function PageSkeleton() {
  return (
    <div className="animate-pulse max-w-3xl mx-auto">
      <div className="h-4 w-40 bg-gray-200 rounded mb-6" />
      <div className="h-7 w-56 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-72 bg-gray-200 rounded mb-8" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-soft p-6 mb-6">
          <div className="h-5 w-48 bg-gray-200 rounded mb-6" />
          <div className="space-y-4">
            <div className="h-10 w-full bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EditEcolePage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { confirmDelete } = useConfirmDialog();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Ecole + settings form
  const [form, setForm] = useState({
    name: '', slug: '', active: true,
    school_name: '', address: '', phone: '', email: '', fax: '', city: '',
    tax_register: '', commercial_register: '', web_reference: '', logo: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Admins
  const [admins, setAdmins] = useState([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [newAdminErrors, setNewAdminErrors] = useState({});
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [resetPasswordAdminId, setResetPasswordAdminId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    fetchEcole();
  }, [id]);

  async function fetchEcole() {
    try {
      const res = await fetch(`/api/super-admin/ecoles?id=${id}`);
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const data = await res.json();

      setForm({
        name: data.name || '',
        slug: data.slug || '',
        active: Boolean(data.active),
        school_name: data.settings?.school_name || data.name || '',
        address: data.settings?.address || '',
        phone: data.settings?.phone || '',
        email: data.settings?.email || '',
        fax: data.settings?.fax || '',
        city: data.settings?.city || '',
        tax_register: data.settings?.tax_register || '',
        commercial_register: data.settings?.commercial_register || '',
        web_reference: data.settings?.web_reference || '',
        logo: data.settings?.logo || '',
      });

      if (data.settings?.logo) {
        try {
          const imgRes = await fetch(`/api/files?path=${encodeURIComponent(data.settings.logo)}`);
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            if (imgData.data) setLogoPreview(imgData.data);
          }
        } catch {}
      }

      setAdmins(data.admins || []);
    } catch (err) {
      console.error('Error fetching ecole:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Veuillez selectionner une image'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("L'image ne doit pas depasser 2 Mo"); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function validateForm() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (!form.slug.trim()) {
      errs.slug = 'Le slug est requis';
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) {
      errs.slug = 'Slug invalide';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);

    try {
      let logoPath = form.logo;
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('subfolder', 'logos');
        const uploadRes = await fetch('/api/files', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          logoPath = uploadData.path;
        }
      }

      const res = await fetch(`/api/super-admin/ecoles?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          active: form.active,
          settings: {
            school_name: form.school_name || form.name,
            address: form.address,
            phone: form.phone,
            email: form.email,
            fax: form.fax,
            city: form.city,
            tax_register: form.tax_register,
            commercial_register: form.commercial_register,
            web_reference: form.web_reference,
            logo: logoPath,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la mise a jour');
      }
      toast.success('Auto-ecole mise a jour avec succes');
      setLogoFile(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Admin CRUD
  function validateNewAdmin() {
    const errs = {};
    if (!newAdmin.username.trim()) errs.username = "Le nom d'utilisateur est requis";
    if (!newAdmin.password) errs.password = 'Le mot de passe est requis';
    else if (newAdmin.password.length < 6) errs.password = 'Min. 6 caracteres';
    setNewAdminErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleAddAdmin(e) {
    e.preventDefault();
    if (!validateNewAdmin()) return;
    setAddingAdmin(true);
    try {
      const res = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_ecole_id: Number(id), username: newAdmin.username, password: newAdmin.password }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Erreur"); }
      toast.success('Administrateur ajoute');
      setNewAdmin({ username: '', password: '' });
      setNewAdminErrors({});
      setShowAddAdmin(false);
      // Refresh admins
      const refreshRes = await fetch(`/api/super-admin/admins?ecoleId=${id}`);
      if (refreshRes.ok) setAdmins(await refreshRes.json());
    } catch (err) { toast.error(err.message); }
    finally { setAddingAdmin(false); }
  }

  async function handleResetPassword(adminId) {
    if (!newPassword || newPassword.length < 6) { toast.error('Min. 6 caracteres'); return; }
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/super-admin/admins?id=${adminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erreur'); }
      toast.success('Mot de passe reinitialise');
      setResetPasswordAdminId(null);
      setNewPassword('');
    } catch (err) { toast.error(err.message); }
    finally { setResettingPassword(false); }
  }

  async function handleDeleteAdmin(admin) {
    const confirmed = await confirmDelete(admin.username);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/super-admin/admins?id=${admin.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erreur'); }
      toast.success('Administrateur supprime');
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    } catch (err) { toast.error(err.message); }
  }

  const inputClass = (field) =>
    `w-full h-10 px-3 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-primary-500/20 transition-colors ${
      formErrors[field] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'
    }`;

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/super-admin/ecoles" className="inline-flex items-center gap-2 text-sm text-dark-muted hover:text-gray-700 mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Retour
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto">
      <Link href="/super-admin/ecoles" className="inline-flex items-center gap-2 text-sm text-dark-muted hover:text-gray-700 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Retour aux auto-ecoles
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">Modifier l'auto-ecole</h1>
          <p className="text-dark-muted mt-1">{form.name}</p>
        </div>
        <Link
          href={`/${form.slug}`}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors border border-primary-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Tableau de bord
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identification */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Identification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} className={inputClass('name')} />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
              <input type="text" value={form.slug} onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className={`${inputClass('slug')} font-mono`} />
              {formErrors.slug && <p className="mt-1 text-xs text-red-600">{formErrors.slug}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom affiche</label>
              <input type="text" value={form.school_name} onChange={(e) => handleChange('school_name', e.target.value)} className={inputClass('school_name')} placeholder="Nom sur les documents" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)} className={inputClass('city')} />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Statut actif</label>
                <p className="text-xs text-gray-400">Desactiver empeche l'acces a l'espace</p>
              </div>
              <button type="button" role="switch" aria-checked={form.active} onClick={() => handleChange('active', !form.active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${form.active ? 'bg-primary-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Logo
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded-xl object-contain shadow-soft bg-gray-50 p-1" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors cursor-pointer border border-primary-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {logoPreview ? 'Changer le logo' : 'Choisir un logo'}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              <p className="text-xs text-gray-400 mt-2">PNG, JPG ou SVG. Max 2 Mo.</p>
              {logoPreview && (
                <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); handleChange('logo', ''); }} className="text-xs text-red-500 hover:text-red-700 mt-1">
                  Supprimer le logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
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
              <input type="text" value={form.address} onChange={(e) => handleChange('address', e.target.value)} className={inputClass('address')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
              <input type="text" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className={inputClass('phone')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
              <input type="text" value={form.fax} onChange={(e) => handleChange('fax', e.target.value)} className={inputClass('fax')} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className={inputClass('email')} />
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Informations legales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registre fiscal (IF)</label>
              <input type="text" value={form.tax_register} onChange={(e) => handleChange('tax_register', e.target.value)} className={inputClass('tax_register')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registre de commerce (RC)</label>
              <input type="text" value={form.commercial_register} onChange={(e) => handleChange('commercial_register', e.target.value)} className={inputClass('commercial_register')} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference web</label>
              <input type="text" value={form.web_reference} onChange={(e) => handleChange('web_reference', e.target.value)} className={inputClass('web_reference')} />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Enregistrement...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>

      {/* Admins Section */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-dark flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Administrateurs
          </h2>
          <button onClick={() => { setShowAddAdmin(!showAddAdmin); setNewAdmin({ username: '', password: '' }); setNewAdminErrors({}); }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ajouter un admin
          </button>
        </div>

        {/* Add Admin Form */}
        {showAddAdmin && (
          <form onSubmit={handleAddAdmin} className="mb-6 p-4 bg-gray-50 rounded-lg shadow-soft">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Nouvel administrateur</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-muted mb-1">Nom d'utilisateur <span className="text-red-500">*</span></label>
                <input type="text" value={newAdmin.username} onChange={(e) => { setNewAdmin(p => ({ ...p, username: e.target.value })); if (newAdminErrors.username) setNewAdminErrors(p => ({ ...p, username: '' })); }}
                  placeholder="Nom d'utilisateur" className={`w-full h-9 px-3 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-primary-500/20 ${newAdminErrors.username ? 'border-red-300' : 'border-gray-300 focus:border-primary-500'}`} />
                {newAdminErrors.username && <p className="mt-1 text-xs text-red-600">{newAdminErrors.username}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-muted mb-1">Mot de passe <span className="text-red-500">*</span></label>
                <input type="password" value={newAdmin.password} onChange={(e) => { setNewAdmin(p => ({ ...p, password: e.target.value })); if (newAdminErrors.password) setNewAdminErrors(p => ({ ...p, password: '' })); }}
                  placeholder="Min. 6 caracteres" className={`w-full h-9 px-3 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-primary-500/20 ${newAdminErrors.password ? 'border-red-300' : 'border-gray-300 focus:border-primary-500'}`} />
                {newAdminErrors.password && <p className="mt-1 text-xs text-red-600">{newAdminErrors.password}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => { setShowAddAdmin(false); setNewAdmin({ username: '', password: '' }); setNewAdminErrors({}); }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
              <button type="submit" disabled={addingAdmin}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {addingAdmin ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </form>
        )}

        {/* Admins List */}
        {admins.length > 0 ? (
          <div className="space-y-3">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark">{admin.username}</p>
                    <p className="text-xs text-gray-400">Administrateur</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {resetPasswordAdminId === admin.id ? (
                    <div className="flex items-center gap-2">
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nouveau mot de passe" className="h-8 w-40 px-2 text-xs border border-gray-300 rounded-lg bg-white" autoFocus />
                      <button onClick={() => handleResetPassword(admin.id)} disabled={resettingPassword}
                        className="px-2 py-1 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                        {resettingPassword ? '...' : 'OK'}
                      </button>
                      <button onClick={() => { setResetPasswordAdminId(null); setNewPassword(''); }}
                        className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => { setResetPasswordAdminId(admin.id); setNewPassword(''); }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50" title="Reinitialiser le mot de passe">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Mot de passe
                      </button>
                      <button onClick={() => handleDeleteAdmin(admin)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50" title="Supprimer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm text-dark-muted">Aucun administrateur configure</p>
            <button onClick={() => setShowAddAdmin(true)} className="mt-3 text-sm text-primary-500 hover:text-primary-700 font-medium">
              Ajouter un administrateur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
