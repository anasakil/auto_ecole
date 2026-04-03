'use client';

import React, { useState, useEffect } from 'react';
import api from '@/utils/api';
import Modal from '@/components/Modal';
import ExportButton from '@/components/ExportButton';
import { formatCurrency, LICENSE_TYPES } from '@/utils/helpers';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/contexts/ConfirmContext';
import { CardPageSkeleton } from '@/components/skeletons';
import { useTenant } from '@/contexts/TenantContext';

function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const toast = useToast();
  const { confirmDelete } = useConfirmDialog();
  const { slug } = useTenant();

  const [formData, setFormData] = useState({
    name: '',
    license_type: 'B',
    price: 0,
    description: '',
  });

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    try {
      const data = await api.offers.getAll();
      setOffers(data);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingOffer(null);
    setFormData({
      name: '',
      license_type: 'B',
      price: 0,
      description: '',
    });
    setShowModal(true);
  }

  function handleEdit(offer) {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      license_type: offer.license_type,
      price: offer.price,
      description: offer.description || '',
    });
    setShowModal(true);
  }

  function validateForm() {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de l\'offre est requis';
    }
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Le prix doit être supérieur à 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      if (editingOffer) {
        await api.offers.update(editingOffer.id, formData);
        toast.success('Offre modifiée avec succès');
      } else {
        await api.offers.create(formData);
        toast.success('Offre créée avec succès');
      }
      setShowModal(false);
      setErrors({});
      loadOffers();
    } catch (error) {
      console.error('Error saving offer:', error);
      toast.error('Erreur lors de l\'enregistrement de l\'offre');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(offer) {
    const confirmed = await confirmDelete(offer.name);
    if (confirmed) {
      try {
        await api.offers.delete(offer.id);
        toast.success('Offre supprimée avec succès');
        loadOffers();
      } catch (error) {
        console.error('Error deleting offer:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  }

  // Export columns
  const exportColumns = [
    { key: 'name', label: 'Nom de l\'offre' },
    { key: 'license_type', label: 'Type de Permis', accessor: (o) => `Permis ${o.license_type}` },
    { key: 'price', label: 'Prix', accessor: (o) => formatCurrency(o.price) },
    { key: 'description', label: 'Description' },
  ];

  if (loading) {
    return <CardPageSkeleton cards={4} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offres</h1>
          <p className="text-gray-500">Gestion des offres de formation</p>
        </div>
        <div className="flex gap-3">
          <ExportButton
            data={offers}
            columns={exportColumns}
            filename="offres"
            title="Liste des Offres"
            subtitle={`${offers.length} offre(s)`}
          />
          <button onClick={handleAdd} className="btn btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Offre
          </button>
        </div>
      </div>

      {/* Offers Grid */}
      {offers.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-gray-500 mb-4">Aucune offre créée</p>
          <button onClick={handleAdd} className="btn btn-primary">
            Créer votre première offre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div key={offer.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{offer.name}</h3>
                  <span className="badge badge-info">Permis {offer.license_type}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(offer)}
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(offer)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-3xl font-bold text-primary-600 mb-3">
                {formatCurrency(offer.price)}
              </p>

              {offer.description && (
                <p className="text-gray-500 text-sm">{offer.description}</p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Offre active
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => !isSaving && setShowModal(false)}
        title={editingOffer ? 'Modifier l\'offre' : 'Nouvelle Offre'}
        size="sm"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nom de l'offre *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`form-input ${errors.name ? 'border-red-500 bg-red-50' : ''}`}
              placeholder="Ex: Formation Permis B Standard"
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.name}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Type de Permis *</label>
            <select
              value={formData.license_type}
              onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
              className="form-select"
              required
            >
              {LICENSE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Prix (MAD) *</label>
            <input
              type="number"
              value={formData.price || ''}
              onChange={(e) => {
                setFormData({ ...formData, price: parseFloat(e.target.value) || 0 });
                if (errors.price) setErrors({ ...errors, price: '' });
              }}
              className={`form-input ${errors.price ? 'border-red-500 bg-red-50' : ''}`}
              min="0"
              placeholder="Ex: 3500"
              step="0.01"
              required
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.price}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-textarea"
              rows="3"
              placeholder="Description de l'offre (optionnel)..."
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
                editingOffer ? 'Enregistrer' : 'Créer'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Offers;
