export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function parseDate(dateString) {
  if (!dateString) return '';
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateString;
}

export function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '0 MAD';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 MAD';
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num) + ' MAD';
}

export function calculateRemainingDays(startDate, durationDays) {
  if (!startDate || !durationDays) return null;
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  const today = new Date();
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return diff;
}

export function getStatusBadgeVariant(status) {
  switch (status) {
    case 'En formation': return 'info';
    case 'Permis obtenu': return 'success';
    case 'Inactif': return 'gray';
    case 'Planifié': return 'info';
    case 'Terminé': return 'success';
    case 'Réussi': return 'success';
    case 'Échoué': return 'danger';
    case 'Annulé': return 'gray';
    case 'Présent': return 'success';
    case 'Sorti': return 'gray';
    default: return 'gray';
  }
}

export function getStatusBadgeClass(status) {
  const statusClasses = {
    'En formation': 'badge-info',
    'Permis obtenu': 'badge-success',
    'Inactif': 'badge-gray',
    'Présent': 'badge-success',
    'Sorti': 'badge-warning',
    'En cours': 'badge-info',
    'Terminé': 'badge-success',
  };
  return statusClasses[status] || 'badge-gray';
}

export function formatDuration(minutes) {
  if (!minutes) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export const LICENSE_TYPES = [
  { value: 'A', label: 'Permis A (Moto)' },
  { value: 'B', label: 'Permis B (Voiture)' },
  { value: 'C', label: 'Permis C (Camion)' },
  { value: 'D', label: 'Permis D (Bus)' },
  { value: 'E', label: 'Permis E' },
];

export const MOROCCAN_CITIES = [
  {
    region: 'Souss-Massa (Agadir)',
    cities: [
      'Agadir', 'Inezgane', 'Aït Melloul', 'Dcheira El Jihadia', 'Biougra',
      'Taroudant', 'Tiznit', 'Aourir', 'Taghazout', 'Temsia', 'Oulad Teima',
      'Chtouka Aït Baha', 'Massa', 'Sidi Ifni', 'Tafraout', 'Belfaa',
      'Lqliâa', 'Sebt El Guerdane', 'Ait Baha', 'Drarga',
    ],
  },
  {
    region: 'Marrakech-Safi',
    cities: [
      'Marrakech', 'Safi', 'Essaouira', 'El Kelaâ des Sraghna', 'Ben Guerir',
      'Chichaoua', 'Youssoufia', 'Tahanaout', 'Amizmiz', 'Ait Ourir',
      'Tamansourt', 'Laattaouia', 'Sidi Bouzid', 'Chemaia',
    ],
  },
  {
    region: 'Casablanca-Settat',
    cities: [
      'Casablanca', 'Mohammedia', 'El Jadida', 'Settat', 'Berrechid',
      'Benslimane', 'Khouribga', 'Bir Jdid', 'Médiouna', 'Nouaceur',
    ],
  },
  {
    region: 'Rabat-Salé-Kénitra',
    cities: [
      'Rabat', 'Salé', 'Kénitra', 'Témara', 'Skhirat', 'Khmisset',
      'Sidi Kacem', 'Sidi Slimane',
    ],
  },
  {
    region: 'Fès-Meknès',
    cities: [
      'Fès', 'Meknès', 'Taza', 'Ifrane', 'Sefrou', 'Boulemane',
      'El Hajeb', 'Moulay Idriss Zerhoun',
    ],
  },
  {
    region: 'Tanger-Tétouan-Al Hoceïma',
    cities: [
      'Tanger', 'Tétouan', 'Al Hoceïma', 'Larache', 'Asilah',
      'Chefchaouen', 'Fnideq', 'Mdiq',
    ],
  },
  {
    region: 'Oriental',
    cities: [
      'Oujda', 'Nador', 'Berkane', 'Taourirt', 'Jerada', 'Guercif',
    ],
  },
  {
    region: 'Béni Mellal-Khénifra',
    cities: [
      'Béni Mellal', 'Khénifra', 'Azilal', 'Fquih Ben Salah', 'Kasba Tadla',
    ],
  },
  {
    region: 'Drâa-Tafilalet',
    cities: [
      'Errachidia', 'Ouarzazate', 'Zagora', 'Tinghir', 'Midelt',
    ],
  },
  {
    region: 'Guelmim-Oued Noun',
    cities: [
      'Guelmim', 'Sidi Ifni', 'Tan-Tan', 'Assa', 'Zag',
    ],
  },
  {
    region: 'Laâyoune-Sakia El Hamra',
    cities: [
      'Laâyoune', 'Boujdour', 'Tarfaya', 'Es-Semara',
    ],
  },
  {
    region: 'Dakhla-Oued Ed-Dahab',
    cities: [
      'Dakhla', 'Aousserd',
    ],
  },
];

export const STUDENT_STATUSES = [
  { value: 'En formation', label: 'En formation' },
  { value: 'Permis obtenu', label: 'Permis obtenu' },
  { value: 'Inactif', label: 'Inactif' },
];

export const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Espèces' },
  { value: 'Transfer', label: 'Virement' },
  { value: 'Cheque', label: 'Chèque' },
  { value: 'TPE', label: 'TPE' },
];

export const STAGE_TYPES = [
  { value: 'Séance', label: 'Séance de conduite' },
  { value: 'Examen', label: 'Examen pratique' },
  { value: 'Code', label: 'Cours de code' },
];

export const STAGE_STATUSES = [
  { value: 'Planifié', label: 'Planifié' },
  { value: 'Terminé', label: 'Terminé' },
  { value: 'Annulé', label: 'Annulé' },
  { value: 'Réussi', label: 'Réussi' },
  { value: 'Échoué', label: 'Échoué' },
];
