'use client';

import React, { useState, useEffect } from 'react';
import api from '@/utils/api';
import { FormPageSkeleton } from '@/components/skeletons';

function Settings() {
  const [settings, setSettings] = useState({
    school_name: '',
    address: '',
    phone: '',
    email: '',
    default_training_days: 30,
    tax_register: '',
    commercial_register: '',
    city: '',
    fax: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
          email: data.email || '',
          default_training_days: data.default_training_days || 30,
          tax_register: data.tax_register || '',
          commercial_register: data.commercial_register || '',
          city: data.city || '',
          fax: data.fax || '',
        });
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
      await api.settings.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setSaving(false);
    }
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Configuration de l'application</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          {/* School Information */}
          <div className="card mb-6">
            <h2 className="card-header">Informations de l'Auto-École</h2>

            <div className="form-group">
              <label className="form-label">Nom de l'Auto-École</label>
              <input
                type="text"
                name="school_name"
                value={settings.school_name}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex: Auto-École Excellence"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Adresse</label>
              <input
                type="text"
                name="address"
                value={settings.address}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex: 123 Avenue Mohammed V, Casablanca"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  value={settings.phone}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: 0522-123456"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={settings.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: contact@autoecole.ma"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ville</label>
              <input
                type="text"
                name="city"
                value={settings.city}
                onChange={handleChange}
                className="form-input"
                placeholder="Ex: Casablanca"
              />
            </div>
          </div>

          {/* Contract Fields */}
          <div className="card mb-6">
            <h2 className="card-header">Informations du Contrat</h2>
            <p className="text-sm text-gray-500 mb-4">Ces champs apparaissent dans les contrats et formulaires générés</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">{'\ا\ل\س\ج\ل \ا\ل\ض\ر\ي\ب\ي'} - Registre fiscal</label>
                <input
                  type="text"
                  name="tax_register"
                  value={settings.tax_register}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: 12345678"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{'\ا\ل\س\ج\ل \ا\ل\ت\ج\ا\ر\ي'} - Registre de commerce</label>
                <input
                  type="text"
                  name="commercial_register"
                  value={settings.commercial_register}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: RC-12345"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{'\ا\ل\ف\ا\ك\س'} - Fax</label>
                <input
                  type="text"
                  name="fax"
                  value={settings.fax || ''}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: 0522-654321"
                />
              </div>
            </div>
          </div>

          {/* Training Settings */}
          <div className="card mb-6">
            <h2 className="card-header">Paramètres de Formation</h2>

            <div className="form-group">
              <label className="form-label">Durée de formation par défaut (jours)</label>
              <input
                type="number"
                name="default_training_days"
                value={settings.default_training_days}
                onChange={handleChange}
                className="form-input"
                min="1"
                max="365"
              />
              <p className="text-sm text-gray-500 mt-1">
                Cette durée sera appliquée par défaut aux nouveaux étudiants
              </p>
            </div>
          </div>

          {/* About Section */}
          <div className="card mb-6">
            <h2 className="card-header">À Propos</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Application:</strong> Auto-École Maroc</p>
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Devise:</strong> MAD (Dirham Marocain)</p>
              <p><strong>Format de date:</strong> JJ/MM/AAAA</p>
              <p><strong>Langue:</strong> Français</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les paramètres'
              )}
            </button>

            {saved && (
              <span className="text-green-600 flex items-center">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
