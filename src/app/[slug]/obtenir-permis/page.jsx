'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import Modal from '@/components/Modal';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { TablePageSkeleton } from '@/components/skeletons';
import { useTenant } from '@/contexts/TenantContext';

function ObtenirPermis() {
  const [students, setStudents] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLicense, setFilterLicense] = useState('');

  // Modal states
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sentOffers, setSentOffers] = useState([]);
  const { slug } = useTenant();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [studentsData, offersData] = await Promise.all([
        api.students.getAll(),
        api.offers.getAll()
      ]);
      // Filter students who obtained their license
      const studentsWithLicense = studentsData.filter(s => s.license_obtained === 1 || s.status === 'Permis obtenu');
      setStudents(studentsWithLicense);
      setOffers(offersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSendOffer(student) {
    setSelectedStudent(student);
    setSelectedOffer('');
    setOfferMessage(getDefaultMessage(student));
    setShowOfferModal(true);
  }

  function getDefaultMessage(student) {
    return `Bonjour ${student.full_name},

Félicitations pour l'obtention de votre permis ${student.license_obtained_type || student.license_type} !

Nous avons le plaisir de vous proposer une offre spéciale pour obtenir un nouveau permis. Contactez-nous pour plus d'informations.

Cordialement,
Auto-École`;
  }

  function handleOfferChange(offerId) {
    setSelectedOffer(offerId);
    if (offerId) {
      const offer = offers.find(o => o.id === parseInt(offerId));
      if (offer && selectedStudent) {
        setOfferMessage(`Bonjour ${selectedStudent.full_name},

Félicitations pour l'obtention de votre permis ${selectedStudent.license_obtained_type || selectedStudent.license_type} !

Nous vous proposons notre offre "${offer.name}" pour le permis ${offer.license_type} au prix de ${formatCurrency(offer.price)}.

${offer.description || ''}

Contactez-nous pour profiter de cette offre.

Cordialement,
Auto-École`);
      }
    }
  }

  async function handleConfirmOffer() {
    if (!selectedStudent || !selectedOffer) {
      alert('Veuillez sélectionner une offre');
      return;
    }

    // Save the sent offer record
    const offer = offers.find(o => o.id === parseInt(selectedOffer));
    const newSentOffer = {
      id: Date.now(),
      student_id: selectedStudent.id,
      student_name: selectedStudent.full_name,
      offer_id: selectedOffer,
      offer_name: offer?.name,
      message: offerMessage,
      sent_at: new Date().toISOString()
    };

    setSentOffers([...sentOffers, newSentOffer]);

    // Update student's interested_licenses
    try {
      await api.students.updateFollowUp(selectedStudent.id, {
        interested_licenses: offer?.license_type,
        reminder_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        internal_notes: `Offre envoyée: ${offer?.name} - ${new Date().toLocaleDateString('fr-FR')}\n${selectedStudent.internal_notes || ''}`
      });
    } catch (error) {
      console.error('Error updating student:', error);
    }

    alert(`Offre envoyée à ${selectedStudent.full_name} avec succès !`);
    setShowOfferModal(false);
    loadData();
  }

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.cin && student.cin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (student.phone && student.phone.includes(searchTerm));
    const matchesLicense = !filterLicense || student.license_obtained_type === filterLicense || student.license_type === filterLicense;
    return matchesSearch && matchesLicense;
  });

  if (loading) {
    return <TablePageSkeleton statsCount={0} columns={5} rows={6} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Permis Obtenus</h1>
          <p className="text-gray-500">Étudiants ayant obtenu leur permis - Envoyer de nouvelles offres</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
            <span className="font-bold text-xl">{students.length}</span>
            <span className="ml-2">permis obtenus</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card bg-blue-50">
          <div className="text-blue-600 text-sm font-medium">Permis A</div>
          <div className="text-2xl font-bold text-blue-800">
            {students.filter(s => (s.license_obtained_type || s.license_type) === 'A').length}
          </div>
        </div>
        <div className="card bg-green-50">
          <div className="text-green-600 text-sm font-medium">Permis B</div>
          <div className="text-2xl font-bold text-green-800">
            {students.filter(s => (s.license_obtained_type || s.license_type) === 'B').length}
          </div>
        </div>
        <div className="card bg-yellow-50">
          <div className="text-yellow-600 text-sm font-medium">Permis C</div>
          <div className="text-2xl font-bold text-yellow-800">
            {students.filter(s => (s.license_obtained_type || s.license_type) === 'C').length}
          </div>
        </div>
        <div className="card bg-purple-50">
          <div className="text-purple-600 text-sm font-medium">Permis D</div>
          <div className="text-2xl font-bold text-purple-800">
            {students.filter(s => (s.license_obtained_type || s.license_type) === 'D').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Rechercher par nom, CIN ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="w-48">
            <select
              value={filterLicense}
              onChange={(e) => setFilterLicense(e.target.value)}
              className="form-select"
            >
              <option value="">Tous les permis</option>
              <option value="A">Permis A</option>
              <option value="B">Permis B</option>
              <option value="C">Permis C</option>
              <option value="D">Permis D</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom Complet</th>
              <th>CIN</th>
              <th>Téléphone</th>
              <th>Permis Obtenu</th>
              <th>Date d'obtention</th>
              <th>Intéressé par</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  Aucun étudiant avec permis obtenu trouvé
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <Link
                      href={`/${slug}/students/${student.id}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {student.full_name}
                    </Link>
                  </td>
                  <td>{student.cin || '-'}</td>
                  <td>{student.phone || '-'}</td>
                  <td>
                    <span className="badge badge-success">
                      Permis {student.license_obtained_type || student.license_type}
                    </span>
                  </td>
                  <td>
                    {student.license_obtained_date
                      ? formatDate(student.license_obtained_date)
                      : '-'}
                  </td>
                  <td>
                    {student.interested_licenses ? (
                      <span className="badge badge-info">
                        Permis {student.interested_licenses}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendOffer(student)}
                        className="btn btn-primary btn-sm"
                        title="Envoyer une offre"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Envoyer Offre
                      </button>
                      <Link
                        href={`/${slug}/students/${student.id}`}
                        className="btn btn-secondary btn-sm"
                        title="Voir détails"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Available Offers Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Offres Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="card border-2 border-gray-200 hover:border-primary-300 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{offer.name}</h3>
                <span className="badge badge-info">Permis {offer.license_type}</span>
              </div>
              <p className="text-gray-600 text-sm mb-3">{offer.description || 'Aucune description'}</p>
              <div className="text-xl font-bold text-primary-600">
                {formatCurrency(offer.price)}
              </div>
            </div>
          ))}
          {offers.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              Aucune offre disponible. <Link href={`/${slug}/offers`} className="text-primary-600 hover:underline">Créer une offre</Link>
            </div>
          )}
        </div>
      </div>

      {/* Send Offer Modal */}
      <Modal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        title={`Envoyer une offre à ${selectedStudent?.full_name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sélectionner une offre
            </label>
            <select
              value={selectedOffer}
              onChange={(e) => handleOfferChange(e.target.value)}
              className="form-select"
            >
              <option value="">-- Choisir une offre --</option>
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.name} - Permis {offer.license_type} - {formatCurrency(offer.price)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message personnalisé
            </label>
            <textarea
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              rows={8}
              className="form-textarea w-full"
              placeholder="Rédigez votre message..."
            />
          </div>

          {selectedStudent?.phone && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Téléphone:</span> {selectedStudent.phone}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Vous pouvez copier ce message et l'envoyer par SMS ou WhatsApp
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowOfferModal(false)}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(offerMessage);
                alert('Message copié !');
              }}
              className="btn btn-secondary"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copier
            </button>
            <button
              onClick={handleConfirmOffer}
              className="btn btn-primary"
              disabled={!selectedOffer}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Confirmer l'envoi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ObtenirPermis;
