const api = {
  // Students
  students: {
    getAll: () => fetch('/api/students').then(r => r.json()),
    getById: (id) => fetch(`/api/students?id=${id}`).then(r => r.json()),
    create: (data) => fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    update: (id, data) => fetch(`/api/students?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id) => fetch(`/api/students?id=${id}`, { method: 'DELETE' }).then(r => r.json()),
    markLicenseObtained: (id, licenseType, dateObtained) => fetch(`/api/students?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'markLicenseObtained', licenseType, dateObtained }) }).then(r => r.json()),
    updateFollowUp: (id, followUp) => fetch(`/api/students?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateFollowUp', ...followUp }) }).then(r => r.json()),
    updateImage: (studentId, field, imagePath) => fetch(`/api/students?id=${studentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateImage', field, imagePath }) }).then(r => r.json()),
  },

  // Attendance
  attendance: {
    scanIn: (studentId) => fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'scanIn', studentId }) }).then(r => r.json()),
    scanOut: (studentId) => fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'scanOut', studentId }) }).then(r => r.json()),
    getByStudent: (studentId) => fetch(`/api/attendance?studentId=${studentId}`).then(r => r.json()),
    getToday: () => fetch('/api/attendance?action=today').then(r => r.json()),
    getStudentStatus: (studentId) => fetch(`/api/attendance?action=status&studentId=${studentId}`).then(r => r.json()),
    cleanupDuplicates: () => fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cleanup' }) }).then(r => r.json()),
  },

  // Payments
  payments: {
    create: (data) => fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    getByStudent: (studentId) => fetch(`/api/payments?studentId=${studentId}`).then(r => r.json()),
    getAll: () => fetch('/api/payments').then(r => r.json()),
    delete: (id) => fetch(`/api/payments?id=${id}`, { method: 'DELETE' }).then(r => r.json()),
  },

  // Payment Schedules
  paymentSchedules: {
    create: (studentId, schedules) => fetch('/api/payment-schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, schedules }) }).then(r => r.json()),
    getByStudent: (studentId) => fetch(`/api/payment-schedules?studentId=${studentId}`).then(r => r.json()),
    markPaid: (scheduleId, paymentId) => fetch('/api/payment-schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'markPaid', scheduleId, paymentId }) }).then(r => r.json()),
    getOverdue: () => fetch('/api/payment-schedules?action=overdue').then(r => r.json()),
    getUpcoming: (daysAhead) => fetch(`/api/payment-schedules?action=upcoming&days=${daysAhead || 7}`).then(r => r.json()),
  },

  // Stages
  stages: {
    create: (data) => fetch('/api/stages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    update: (id, data) => fetch(`/api/stages?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id) => fetch(`/api/stages?id=${id}`, { method: 'DELETE' }).then(r => r.json()),
    getByStudent: (studentId) => fetch(`/api/stages?studentId=${studentId}`).then(r => r.json()),
    getAll: () => fetch('/api/stages').then(r => r.json()),
    getToday: () => fetch('/api/stages?action=today').then(r => r.json()),
    getUpcoming: (daysAhead) => fetch(`/api/stages?action=upcoming&days=${daysAhead || 7}`).then(r => r.json()),
    getSessionTimeStats: () => fetch('/api/stages?action=sessionTimeStats').then(r => r.json()),
    getStudentSessionTimeStats: (studentId) => fetch(`/api/stages?action=studentSessionTimeStats&studentId=${studentId}`).then(r => r.json()),
  },

  // Alerts
  alerts: {
    getAll: () => fetch('/api/alerts').then(r => r.json()),
    getCounts: () => fetch('/api/alerts?action=counts').then(r => r.json()),
  },

  // Offers
  offers: {
    getAll: () => fetch('/api/offers').then(r => r.json()),
    create: (data) => fetch('/api/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    update: (id, data) => fetch(`/api/offers?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    delete: (id) => fetch(`/api/offers?id=${id}`, { method: 'DELETE' }).then(r => r.json()),
  },

  // Dashboard
  dashboard: {
    getStats: () => fetch('/api/dashboard').then(r => r.json()),
  },

  // Settings
  settings: {
    get: () => fetch('/api/settings').then(r => r.json()),
    update: (data) => fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  },

  // Incidents
  incidents: {
    create: (data) => fetch('/api/incidents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    getByStudent: (studentId) => fetch(`/api/incidents?studentId=${studentId}`).then(r => r.json()),
    getAll: () => fetch('/api/incidents').then(r => r.json()),
    getUnresolved: () => fetch('/api/incidents?action=unresolved').then(r => r.json()),
    resolve: (id, notes) => fetch(`/api/incidents?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) }).then(r => r.json()),
    delete: (id) => fetch(`/api/incidents?id=${id}`, { method: 'DELETE' }).then(r => r.json()),
    getStudentCount: (studentId) => fetch(`/api/incidents?action=count&studentId=${studentId}`).then(r => r.json()),
  },

  // Files
  files: {
    upload: (file, subfolder) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subfolder', subfolder || 'documents');
      return fetch('/api/files', { method: 'POST', body: formData }).then(r => r.json());
    },
    getBase64: (filePath) => fetch(`/api/files?path=${encodeURIComponent(filePath)}`).then(r => r.json()).then(r => r.data),
    deleteFile: (filePath) => fetch(`/api/files?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' }).then(r => r.json()),
  },

  // Invoices
  invoices: {
    create: (data) => fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    getById: (id) => fetch(`/api/invoices?id=${id}`).then(r => r.json()),
    getByStudent: (studentId) => fetch(`/api/invoices?studentId=${studentId}`).then(r => r.json()),
    getAll: () => fetch('/api/invoices').then(r => r.json()),
    updateStatus: (id, status) => fetch(`/api/invoices?id=${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(r => r.json()),
    delete: (id) => fetch(`/api/invoices?id=${id}`, { method: 'DELETE' }).then(r => r.json()),
  },

  // Documents
  documents: {
    create: (data) => fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    getByStudent: (studentId) => fetch(`/api/documents?studentId=${studentId}`).then(r => r.json()),
    getById: (id) => fetch(`/api/documents?id=${id}`).then(r => r.json()),
    getAll: () => fetch('/api/documents').then(r => r.json()),
    delete: (id) => fetch(`/api/documents?id=${id}`, { method: 'DELETE' }).then(r => r.json()),
  },

  // Contracts
  contracts: {
    generate: (studentId, overrideData) => fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, overrideData }) }).then(r => r.json()),
  },

  // Demande 15j
  demande15: {
    generate: (studentId, overrideData) => fetch('/api/demande15', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, overrideData }) }).then(r => r.json()),
  },

  // Contrat d'Avancement
  contratAvancement: {
    generate: (studentId, overrideData) => fetch('/api/contrat-avancement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, overrideData }) }).then(r => r.json()),
  },
};

export default api;
