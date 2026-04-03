// Global tenant slug - set by TenantContext when navigating tenant pages
let currentTenantSlug = null;

export function setTenantSlug(slug) {
  currentTenantSlug = slug;
}

function tenantFetch(url, options = {}) {
  options.credentials = 'include';
  if (currentTenantSlug) {
    options.headers = {
      ...options.headers,
      'x-tenant-slug': currentTenantSlug,
    };
  }
  return fetch(url, options).then(r => r.json());
}

function tenantFetchWithHeaders(url, method, data) {
  return tenantFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

const api = {
  // Students
  students: {
    getAll: () => tenantFetch('/api/students'),
    getById: (id) => tenantFetch(`/api/students?id=${id}`),
    create: (data) => tenantFetchWithHeaders('/api/students', 'POST', data),
    update: (id, data) => tenantFetchWithHeaders(`/api/students?id=${id}`, 'PUT', data),
    delete: (id) => tenantFetch(`/api/students?id=${id}`, { method: 'DELETE' }),
    markLicenseObtained: (id, licenseType, dateObtained) => tenantFetchWithHeaders(`/api/students?id=${id}`, 'PUT', { action: 'markLicenseObtained', licenseType, dateObtained }),
    updateFollowUp: (id, followUp) => tenantFetchWithHeaders(`/api/students?id=${id}`, 'PUT', { action: 'updateFollowUp', ...followUp }),
    updateImage: (studentId, field, imagePath) => tenantFetchWithHeaders(`/api/students?id=${studentId}`, 'PUT', { action: 'updateImage', field, imagePath }),
  },

  // Attendance
  attendance: {
    scanIn: (studentId) => tenantFetchWithHeaders('/api/attendance', 'POST', { action: 'scanIn', studentId }),
    scanOut: (studentId) => tenantFetchWithHeaders('/api/attendance', 'POST', { action: 'scanOut', studentId }),
    getByStudent: (studentId) => tenantFetch(`/api/attendance?studentId=${studentId}`),
    getToday: () => tenantFetch('/api/attendance?action=today'),
    getStudentStatus: (studentId) => tenantFetch(`/api/attendance?action=status&studentId=${studentId}`),
    cleanupDuplicates: () => tenantFetchWithHeaders('/api/attendance', 'POST', { action: 'cleanup' }),
  },

  // Payments
  payments: {
    create: (data) => tenantFetchWithHeaders('/api/payments', 'POST', data),
    getByStudent: (studentId) => tenantFetch(`/api/payments?studentId=${studentId}`),
    getAll: () => tenantFetch('/api/payments'),
    delete: (id) => tenantFetch(`/api/payments?id=${id}`, { method: 'DELETE' }),
  },

  // Payment Schedules
  paymentSchedules: {
    create: (studentId, schedules) => tenantFetchWithHeaders('/api/payment-schedules', 'POST', { studentId, schedules }),
    getByStudent: (studentId) => tenantFetch(`/api/payment-schedules?studentId=${studentId}`),
    markPaid: (scheduleId, paymentId) => tenantFetchWithHeaders('/api/payment-schedules', 'POST', { action: 'markPaid', scheduleId, paymentId }),
    getOverdue: () => tenantFetch('/api/payment-schedules?action=overdue'),
    getUpcoming: (daysAhead) => tenantFetch(`/api/payment-schedules?action=upcoming&days=${daysAhead || 7}`),
  },

  // Stages
  stages: {
    create: (data) => tenantFetchWithHeaders('/api/stages', 'POST', data),
    update: (id, data) => tenantFetchWithHeaders(`/api/stages?id=${id}`, 'PUT', data),
    delete: (id) => tenantFetch(`/api/stages?id=${id}`, { method: 'DELETE' }),
    getByStudent: (studentId) => tenantFetch(`/api/stages?studentId=${studentId}`),
    getAll: () => tenantFetch('/api/stages'),
    getToday: () => tenantFetch('/api/stages?action=today'),
    getUpcoming: (daysAhead) => tenantFetch(`/api/stages?action=upcoming&days=${daysAhead || 7}`),
    getSessionTimeStats: () => tenantFetch('/api/stages?action=sessionTimeStats'),
    getStudentSessionTimeStats: (studentId) => tenantFetch(`/api/stages?action=studentSessionTimeStats&studentId=${studentId}`),
  },

  // Alerts
  alerts: {
    getAll: () => tenantFetch('/api/alerts'),
    getCounts: () => tenantFetch('/api/alerts?action=counts'),
  },

  // Offers
  offers: {
    getAll: () => tenantFetch('/api/offers'),
    create: (data) => tenantFetchWithHeaders('/api/offers', 'POST', data),
    update: (id, data) => tenantFetchWithHeaders(`/api/offers?id=${id}`, 'PUT', data),
    delete: (id) => tenantFetch(`/api/offers?id=${id}`, { method: 'DELETE' }),
  },

  // Dashboard
  dashboard: {
    getStats: () => tenantFetch('/api/dashboard'),
  },

  // Settings
  settings: {
    get: () => tenantFetch('/api/settings'),
    update: (data) => tenantFetchWithHeaders('/api/settings', 'PUT', data),
  },

  // Incidents
  incidents: {
    create: (data) => tenantFetchWithHeaders('/api/incidents', 'POST', data),
    getByStudent: (studentId) => tenantFetch(`/api/incidents?studentId=${studentId}`),
    getAll: () => tenantFetch('/api/incidents'),
    getUnresolved: () => tenantFetch('/api/incidents?action=unresolved'),
    resolve: (id, notes) => tenantFetchWithHeaders(`/api/incidents?id=${id}`, 'PUT', { notes }),
    delete: (id) => tenantFetch(`/api/incidents?id=${id}`, { method: 'DELETE' }),
    getStudentCount: (studentId) => tenantFetch(`/api/incidents?action=count&studentId=${studentId}`),
  },

  // Files
  files: {
    upload: (file, subfolder) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subfolder', subfolder || 'documents');
      const options = { method: 'POST', body: formData, credentials: 'include' };
      if (currentTenantSlug) {
        options.headers = { 'x-tenant-slug': currentTenantSlug };
      }
      return fetch('/api/files', options).then(r => r.json());
    },
    getBase64: (filePath) => tenantFetch(`/api/files?path=${encodeURIComponent(filePath)}`).then(r => r.data),
    deleteFile: (filePath) => tenantFetch(`/api/files?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' }),
  },

  // Invoices
  invoices: {
    create: (data) => tenantFetchWithHeaders('/api/invoices', 'POST', data),
    getById: (id) => tenantFetch(`/api/invoices?id=${id}`),
    getByStudent: (studentId) => tenantFetch(`/api/invoices?studentId=${studentId}`),
    getAll: () => tenantFetch('/api/invoices'),
    updateStatus: (id, status) => tenantFetchWithHeaders(`/api/invoices?id=${id}`, 'PUT', { status }),
    delete: (id) => tenantFetch(`/api/invoices?id=${id}`, { method: 'DELETE' }),
  },

  // Documents
  documents: {
    create: (data) => tenantFetchWithHeaders('/api/documents', 'POST', data),
    getByStudent: (studentId) => tenantFetch(`/api/documents?studentId=${studentId}`),
    getById: (id) => tenantFetch(`/api/documents?id=${id}`),
    getAll: () => tenantFetch('/api/documents'),
    delete: (id) => tenantFetch(`/api/documents?id=${id}`, { method: 'DELETE' }),
  },

  // Contracts
  contracts: {
    generate: (studentId, overrideData) => tenantFetchWithHeaders('/api/contracts', 'POST', { studentId, overrideData }),
  },

  // Demande 15j
  demande15: {
    generate: (studentId, overrideData) => tenantFetchWithHeaders('/api/demande15', 'POST', { studentId, overrideData }),
  },

  // Contrat d'Avancement
  contratAvancement: {
    generate: (studentId, overrideData) => tenantFetchWithHeaders('/api/contrat-avancement', 'POST', { studentId, overrideData }),
  },
};

export default api;
