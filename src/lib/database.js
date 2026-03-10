const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

let pool = null;

function getPool() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

  return pool;
}

async function getDb() {
  return getPool();
}

async function query(sql, params = []) {
  const db = getPool();
  const result = await db.query(sql, params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const db = getPool();
  const result = await db.query(sql, params);
  return result;
}

// ==================== INIT DB ====================
async function initDb() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      license_type VARCHAR(50) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      description TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      qr_code VARCHAR(255) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      cin VARCHAR(100),
      phone VARCHAR(50),
      address TEXT,
      license_type VARCHAR(50) NOT NULL,
      registration_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'En formation',
      training_start_date DATE,
      training_duration_days INT DEFAULT 30,
      license_obtained BOOLEAN DEFAULT false,
      license_obtained_type VARCHAR(50),
      license_obtained_date DATE,
      offer_id INT REFERENCES offers(id) ON DELETE SET NULL,
      total_price DECIMAL(10,2) DEFAULT 0,
      interested_licenses VARCHAR(255),
      reminder_date DATE,
      internal_notes TEXT,
      payment_type VARCHAR(50) DEFAULT 'full',
      profile_image VARCHAR(500),
      cin_document VARCHAR(500),
      birth_place VARCHAR(255),
      birth_date DATE,
      web_reference VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      time_in VARCHAR(10),
      time_out VARCHAR(10),
      status VARCHAR(50) DEFAULT 'Présent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      payment_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY DEFAULT 1,
      school_name VARCHAR(255) DEFAULT 'Auto-École',
      address TEXT,
      phone VARCHAR(50),
      email VARCHAR(255),
      fax VARCHAR(50),
      city VARCHAR(100),
      default_training_days INT DEFAULT 30,
      license_number VARCHAR(100),
      tax_register VARCHAR(100),
      commercial_register VARCHAR(100),
      web_reference VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_schedules (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      installment_number INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      due_date DATE NOT NULL,
      paid BOOLEAN DEFAULT false,
      paid_date DATE,
      payment_id INT REFERENCES payments(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS stages (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      scheduled_date DATE NOT NULL,
      scheduled_time VARCHAR(10),
      duration_minutes INT DEFAULT 60,
      status VARCHAR(50) DEFAULT 'Planifié',
      result TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(100) UNIQUE NOT NULL,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      payment_id INT REFERENCES payments(id) ON DELETE SET NULL,
      amount DECIMAL(10,2) NOT NULL,
      issue_date DATE NOT NULL,
      due_date DATE,
      status VARCHAR(50) DEFAULT 'Émise',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(50),
      file_size INT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL,
      severity VARCHAR(50) NOT NULL DEFAULT 'Avertissement',
      description TEXT NOT NULL,
      date DATE NOT NULL,
      resolved BOOLEAN DEFAULT false,
      resolved_date DATE,
      resolved_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create trigger function for updated_at
  await db.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);

  // Create trigger for students table
  await db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_students_updated_at') THEN
        CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$
  `);

  // Create trigger for settings table
  await db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at') THEN
        CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$
  `);

  // Seed settings if empty
  const settingsResult = await db.query('SELECT COUNT(*) as count FROM settings');
  if (parseInt(settingsResult.rows[0].count) === 0) {
    await db.query("INSERT INTO settings (id, school_name) VALUES (1, 'Auto-École Maroc')");
  }

  // Seed admin if empty
  const bcrypt = require('bcryptjs');
  const adminResult = await db.query('SELECT COUNT(*) as count FROM admins');
  if (parseInt(adminResult.rows[0].count) === 0) {
    const hashedPassword = await bcrypt.hash('admin@2026', 10);
    await db.query('INSERT INTO admins (username, password) VALUES ($1, $2)', ['admin', hashedPassword]);
  }
}

// ==================== STUDENTS ====================
async function getAllStudents() {
  return query(`
    SELECT s.*, o.name as offer_name, o.price as offer_price,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id) as paid_amount,
      CASE WHEN s.total_price = 0 AND o.price IS NOT NULL THEN o.price ELSE s.total_price END as total_price
    FROM students s
    LEFT JOIN offers o ON s.offer_id = o.id
    ORDER BY s.created_at DESC
  `);
}

async function getStudentById(id) {
  const student = await queryOne(`
    SELECT s.*, o.name as offer_name, o.price as offer_price
    FROM students s
    LEFT JOIN offers o ON s.offer_id = o.id
    WHERE s.id = $1
  `, [id]);

  if (student) {
    student.payments = await getPaymentsByStudent(id);
    student.attendance = await getAttendanceByStudent(id);
    student.paid_amount = student.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    if (!student.total_price && student.offer_price) {
      student.total_price = student.offer_price;
    }
  }
  return student;
}

async function createStudent(student) {
  const qrCode = `STU-${uuidv4().substring(0, 8).toUpperCase()}`;
  const result = await queryOne(`
    INSERT INTO students (qr_code, full_name, cin, phone, address, license_type,
      registration_date, status, training_start_date, training_duration_days,
      offer_id, total_price, interested_licenses, reminder_date, internal_notes,
      profile_image, cin_document, birth_place, birth_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING id
  `, [
    qrCode,
    student.full_name,
    student.cin || null,
    student.phone || null,
    student.address || null,
    student.license_type,
    student.registration_date,
    student.status || 'En formation',
    student.training_start_date || student.registration_date,
    student.training_duration_days || 30,
    student.offer_id || null,
    student.total_price || 0,
    student.interested_licenses || null,
    student.reminder_date || null,
    student.internal_notes || null,
    student.profile_image || null,
    student.cin_document || null,
    student.birth_place || null,
    student.birth_date || null
  ]);

  return { id: result.id, qr_code: qrCode };
}

async function updateStudent(id, student) {
  return run(`
    UPDATE students SET
      full_name = $1, cin = $2, phone = $3, address = $4, license_type = $5,
      registration_date = $6, status = $7, training_start_date = $8, training_duration_days = $9,
      offer_id = $10, total_price = $11, interested_licenses = $12,
      reminder_date = $13, internal_notes = $14,
      birth_place = $15, birth_date = $16
    WHERE id = $17
  `, [
    student.full_name,
    student.cin || null,
    student.phone || null,
    student.address || null,
    student.license_type,
    student.registration_date,
    student.status,
    student.training_start_date,
    student.training_duration_days || 30,
    student.offer_id || null,
    student.total_price || 0,
    student.interested_licenses || null,
    student.reminder_date || null,
    student.internal_notes || null,
    student.birth_place || null,
    student.birth_date || null,
    id
  ]);
}

async function updateStudentImage(id, field, imagePath) {
  if (field !== 'profile_image' && field !== 'cin_document') {
    throw new Error('Invalid field');
  }
  return run(`UPDATE students SET ${field} = $1 WHERE id = $2`, [imagePath, id]);
}

async function deleteStudent(id) {
  return run('DELETE FROM students WHERE id = $1', [id]);
}

async function markLicenseObtained(id, licenseType, dateObtained) {
  return run(`
    UPDATE students SET
      license_obtained = true, license_obtained_type = $1, license_obtained_date = $2,
      status = 'Permis obtenu'
    WHERE id = $3
  `, [licenseType, dateObtained, id]);
}

async function updateStudentFollowUp(id, followUp) {
  return run(`
    UPDATE students SET
      interested_licenses = $1, reminder_date = $2, internal_notes = $3
    WHERE id = $4
  `, [followUp.interested_licenses, followUp.reminder_date, followUp.internal_notes, id]);
}

// ==================== ATTENDANCE ====================
async function recordAttendanceIn(studentId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const existing = await queryOne(
    'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND time_out IS NULL',
    [studentId, today]
  );

  if (existing) {
    return { success: false, message: 'Déjà présent', attendance: existing };
  }

  const result = await queryOne(
    "INSERT INTO attendance (student_id, date, time_in, status) VALUES ($1, $2, $3, 'Présent') RETURNING id",
    [studentId, today, now]
  );

  const student = await queryOne('SELECT full_name FROM students WHERE id = $1', [studentId]);

  return { success: true, message: 'Entrée enregistrée', id: result.id, student_name: student?.full_name, time_in: now };
}

async function recordAttendanceOut(studentId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const existing = await queryOne(
    'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND time_out IS NULL',
    [studentId, today]
  );

  if (!existing) {
    return { success: false, message: "Pas d'entrée enregistrée aujourd'hui" };
  }

  await run("UPDATE attendance SET time_out = $1, status = 'Sorti' WHERE id = $2", [now, existing.id]);
  const student = await queryOne('SELECT full_name FROM students WHERE id = $1', [studentId]);

  return { success: true, message: 'Sortie enregistrée', student_name: student?.full_name, time_out: now };
}

async function getAttendanceByStudent(studentId) {
  return query('SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC, time_in DESC', [studentId]);
}

async function getTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];
  return query(`
    SELECT a.*, s.full_name, s.qr_code FROM attendance a
    JOIN students s ON a.student_id = s.id WHERE a.date = $1 ORDER BY a.time_in DESC
  `, [today]);
}

async function cleanupDuplicateAttendance() {
  const today = new Date().toISOString().split('T')[0];
  const result = await run(`
    DELETE FROM attendance
    WHERE id IN (
      SELECT a1.id FROM attendance a1
      INNER JOIN attendance a2 ON a1.student_id = a2.student_id AND a1.date = a2.date
      WHERE a1.id > a2.id AND a1.date = $1
    )
  `, [today]);
  return { deleted: result.rowCount || 0 };
}

async function getStudentAttendanceStatus(studentId) {
  const today = new Date().toISOString().split('T')[0];
  const record = await queryOne(
    'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND time_out IS NULL',
    [studentId, today]
  );
  return record ? 'present' : 'absent';
}

// ==================== PAYMENTS ====================
async function createPayment(payment) {
  const result = await queryOne(
    'INSERT INTO payments (student_id, amount, payment_method, payment_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [payment.student_id, payment.amount, payment.payment_method || 'Cash', payment.payment_date, payment.notes || null]
  );
  return { id: result.id };
}

async function getPaymentsByStudent(studentId) {
  return query('SELECT * FROM payments WHERE student_id = $1 ORDER BY payment_date DESC', [studentId]);
}

async function getAllPayments() {
  return query(`
    SELECT p.*, s.full_name, s.cin FROM payments p
    JOIN students s ON p.student_id = s.id ORDER BY p.payment_date DESC
  `);
}

async function deletePayment(id) {
  return run('DELETE FROM payments WHERE id = $1', [id]);
}

// ==================== PAYMENT SCHEDULES ====================
async function createPaymentSchedule(studentId, schedules) {
  await run('DELETE FROM payment_schedules WHERE student_id = $1', [studentId]);
  for (let i = 0; i < schedules.length; i++) {
    await run(
      'INSERT INTO payment_schedules (student_id, installment_number, amount, due_date) VALUES ($1, $2, $3, $4)',
      [studentId, i + 1, schedules[i].amount, schedules[i].due_date]
    );
  }
  return { success: true };
}

async function getPaymentSchedulesByStudent(studentId) {
  return query(`
    SELECT ps.*, p.payment_date as actual_payment_date FROM payment_schedules ps
    LEFT JOIN payments p ON ps.payment_id = p.id WHERE ps.student_id = $1 ORDER BY ps.installment_number
  `, [studentId]);
}

async function markScheduleAsPaid(scheduleId, paymentId) {
  const today = new Date().toISOString().split('T')[0];
  return run('UPDATE payment_schedules SET paid = true, paid_date = $1, payment_id = $2 WHERE id = $3', [today, paymentId, scheduleId]);
}

async function getOverduePayments() {
  const today = new Date().toISOString().split('T')[0];
  return query(`
    SELECT ps.*, s.full_name, s.phone, s.total_price FROM payment_schedules ps
    JOIN students s ON ps.student_id = s.id WHERE ps.paid = false AND ps.due_date < $1 ORDER BY ps.due_date
  `, [today]);
}

async function getUpcomingPayments(daysAhead = 7) {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const future = futureDate.toISOString().split('T')[0];
  return query(`
    SELECT ps.*, s.full_name, s.phone FROM payment_schedules ps
    JOIN students s ON ps.student_id = s.id WHERE ps.paid = false AND ps.due_date >= $1 AND ps.due_date <= $2 ORDER BY ps.due_date
  `, [today, future]);
}

// ==================== STAGES ====================
async function createStage(stage) {
  const result = await queryOne(`
    INSERT INTO stages (student_id, type, title, scheduled_date, scheduled_time, duration_minutes, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
  `, [stage.student_id, stage.type, stage.title, stage.scheduled_date, stage.scheduled_time || null, stage.duration_minutes || 60, stage.status || 'Planifié', stage.notes || null]);
  return { id: result.id };
}

async function updateStage(id, stage) {
  return run(`
    UPDATE stages SET type = $1, title = $2, scheduled_date = $3, scheduled_time = $4,
    duration_minutes = $5, status = $6, result = $7, notes = $8 WHERE id = $9
  `, [stage.type, stage.title, stage.scheduled_date, stage.scheduled_time || null, stage.duration_minutes || 60, stage.status, stage.result || null, stage.notes || null, id]);
}

async function deleteStage(id) {
  return run('DELETE FROM stages WHERE id = $1', [id]);
}

async function getStagesByStudent(studentId) {
  return query('SELECT * FROM stages WHERE student_id = $1 ORDER BY scheduled_date DESC', [studentId]);
}

async function getAllStages() {
  return query(`
    SELECT st.*, s.full_name, s.phone, s.license_type FROM stages st
    JOIN students s ON st.student_id = s.id ORDER BY st.scheduled_date
  `);
}

async function getUpcomingStages(daysAhead = 7) {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const future = futureDate.toISOString().split('T')[0];
  return query(`
    SELECT st.*, s.full_name, s.phone, s.license_type FROM stages st
    JOIN students s ON st.student_id = s.id
    WHERE st.status = 'Planifié' AND st.scheduled_date >= $1 AND st.scheduled_date <= $2 ORDER BY st.scheduled_date
  `, [today, future]);
}

async function getTodayStages() {
  const today = new Date().toISOString().split('T')[0];
  return query(`
    SELECT st.*, s.full_name, s.phone, s.license_type FROM stages st
    JOIN students s ON st.student_id = s.id WHERE st.scheduled_date = $1 ORDER BY st.scheduled_time
  `, [today]);
}

async function getSessionTimeStats() {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const weekStart = monday.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const buildQuery = (dateFilter) => `
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN duration_minutes ELSE 0 END), 0) as completed_minutes,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN duration_minutes ELSE 0 END), 0) as planned_minutes,
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN 1 ELSE 0 END), 0) as completed_count,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN 1 ELSE 0 END), 0) as planned_count,
      COALESCE(SUM(CASE WHEN type = 'Séance' AND status != 'Annulé' THEN duration_minutes ELSE 0 END), 0) as seance_minutes,
      COALESCE(SUM(CASE WHEN type = 'Examen' AND status != 'Annulé' THEN duration_minutes ELSE 0 END), 0) as examen_minutes,
      COALESCE(SUM(CASE WHEN type = 'Code' AND status != 'Annulé' THEN duration_minutes ELSE 0 END), 0) as code_minutes
    FROM stages WHERE status != 'Annulé' AND ${dateFilter}
  `;

  const day = await queryOne(buildQuery('scheduled_date = $1'), [today]);
  const week = await queryOne(buildQuery('scheduled_date >= $1'), [weekStart]);
  const month = await queryOne(buildQuery('scheduled_date >= $1'), [monthStart]);
  return { day, week, month };
}

async function getStudentSessionTimeStats(studentId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const weekStart = monday.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const buildQuery = (dateFilter) => `
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN duration_minutes ELSE 0 END), 0) as completed_minutes,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN duration_minutes ELSE 0 END), 0) as planned_minutes,
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN 1 ELSE 0 END), 0) as completed_count,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN 1 ELSE 0 END), 0) as planned_count
    FROM stages WHERE status != 'Annulé' AND student_id = $1 AND ${dateFilter}
  `;

  const day = await queryOne(buildQuery('scheduled_date = $2'), [studentId, today]);
  const week = await queryOne(buildQuery('scheduled_date >= $2'), [studentId, weekStart]);
  const month = await queryOne(buildQuery('scheduled_date >= $2'), [studentId, monthStart]);
  const total = await queryOne(`
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN duration_minutes ELSE 0 END), 0) as completed_minutes,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN duration_minutes ELSE 0 END), 0) as planned_minutes,
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN 1 ELSE 0 END), 0) as completed_count,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN 1 ELSE 0 END), 0) as planned_count
    FROM stages WHERE status != 'Annulé' AND student_id = $1
  `, [studentId]);

  return { day, week, month, total };
}

// ==================== ALERTS ====================
async function getAllAlerts() {
  const today = new Date().toISOString().split('T')[0];
  const alerts = [];

  const overduePaymentsData = await getOverduePayments();
  overduePaymentsData.forEach(p => {
    alerts.push({ type: 'payment_overdue', severity: 'danger', title: 'Paiement en retard', message: `${p.full_name} - Échéance ${p.installment_number}: ${p.amount} MAD`, date: p.due_date, student_id: p.student_id, related_id: p.id });
  });

  const upcomingPaymentsData = await getUpcomingPayments(7);
  upcomingPaymentsData.forEach(p => {
    alerts.push({ type: 'payment_upcoming', severity: 'warning', title: 'Paiement à venir', message: `${p.full_name} - Échéance ${p.installment_number}: ${p.amount} MAD`, date: p.due_date, student_id: p.student_id, related_id: p.id });
  });

  const trainingEnding = await query(`
    SELECT *, (training_start_date + (training_duration_days || ' days')::INTERVAL) as end_date
    FROM students WHERE status = 'En formation'
    AND (training_start_date + (training_duration_days || ' days')::INTERVAL) <= (CURRENT_DATE + INTERVAL '7 days')
    AND (training_start_date + (training_duration_days || ' days')::INTERVAL) >= CURRENT_DATE
  `);
  trainingEnding.forEach(s => {
    const endDate = s.end_date instanceof Date ? s.end_date.toISOString().split('T')[0] : s.end_date;
    alerts.push({ type: 'training_ending', severity: 'info', title: 'Formation se termine bientôt', message: `${s.full_name} - Fin prévue: ${endDate}`, date: endDate, student_id: s.id });
  });

  const trainingExpired = await query(`
    SELECT *, (training_start_date + (training_duration_days || ' days')::INTERVAL) as end_date
    FROM students WHERE status = 'En formation'
    AND (training_start_date + (training_duration_days || ' days')::INTERVAL) < CURRENT_DATE
  `);
  trainingExpired.forEach(s => {
    const endDate = s.end_date instanceof Date ? s.end_date.toISOString().split('T')[0] : s.end_date;
    alerts.push({ type: 'training_expired', severity: 'danger', title: 'Formation expirée', message: `${s.full_name} - Formation terminée depuis ${endDate}`, date: endDate, student_id: s.id });
  });

  const upcomingStagesData = await getUpcomingStages(7);
  upcomingStagesData.forEach(st => {
    const isExam = st.type === 'Examen';
    alerts.push({ type: isExam ? 'exam_upcoming' : 'session_upcoming', severity: isExam ? 'warning' : 'info', title: isExam ? 'Examen à venir' : 'Séance planifiée', message: `${st.full_name} - ${st.title} ${st.scheduled_time ? 'à ' + st.scheduled_time : ''}`, date: st.scheduled_date, student_id: st.student_id, related_id: st.id });
  });

  const todayStagesData = await getTodayStages();
  todayStagesData.forEach(st => {
    if (!alerts.find(a => a.related_id === st.id && a.type.includes('upcoming'))) {
      alerts.push({ type: 'stage_today', severity: 'success', title: "Aujourd'hui", message: `${st.full_name} - ${st.title} ${st.scheduled_time ? 'à ' + st.scheduled_time : ''}`, date: st.scheduled_date, student_id: st.student_id, related_id: st.id });
    }
  });

  const reminders = await query(`
    SELECT * FROM students WHERE reminder_date IS NOT NULL
    AND reminder_date >= CURRENT_DATE AND reminder_date <= (CURRENT_DATE + INTERVAL '7 days') ORDER BY reminder_date
  `);
  reminders.forEach(s => {
    const reminderDate = s.reminder_date instanceof Date ? s.reminder_date.toISOString().split('T')[0] : s.reminder_date;
    alerts.push({ type: 'reminder', severity: 'info', title: 'Rappel', message: `${s.full_name}${s.interested_licenses ? ' - Intéressé par: ' + s.interested_licenses : ''}`, date: reminderDate, student_id: s.id });
  });

  const severityOrder = { danger: 0, warning: 1, info: 2, success: 3 };
  alerts.sort((a, b) => {
    const dateA = typeof a.date === 'string' ? a.date : (a.date instanceof Date ? a.date.toISOString().split('T')[0] : '');
    const dateB = typeof b.date === 'string' ? b.date : (b.date instanceof Date ? b.date.toISOString().split('T')[0] : '');
    if (dateA === dateB) return severityOrder[a.severity] - severityOrder[b.severity];
    return dateA.localeCompare(dateB);
  });

  return alerts;
}

async function getAlertsCounts() {
  const alerts = await getAllAlerts();
  return { total: alerts.length, danger: alerts.filter(a => a.severity === 'danger').length, warning: alerts.filter(a => a.severity === 'warning').length, info: alerts.filter(a => a.severity === 'info').length };
}

// ==================== INVOICES ====================
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const lastInvoice = await queryOne(`SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 ORDER BY id DESC LIMIT 1`, [`FAC-${year}-%`]);
  let nextNum = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoice_number.split('-');
    nextNum = parseInt(parts[2]) + 1;
  }
  return `FAC-${year}-${String(nextNum).padStart(4, '0')}`;
}

async function createInvoice(invoice) {
  const invoiceNumber = await generateInvoiceNumber();
  const result = await queryOne(`
    INSERT INTO invoices (invoice_number, student_id, payment_id, amount, issue_date, due_date, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
  `, [invoiceNumber, invoice.student_id, invoice.payment_id || null, invoice.amount, invoice.issue_date || new Date().toISOString().split('T')[0], invoice.due_date || null, invoice.status || 'Émise', invoice.notes || null]);
  return { id: result.id, invoice_number: invoiceNumber };
}

async function getInvoiceById(id) {
  return queryOne(`
    SELECT i.*, s.full_name, s.cin, s.phone, s.address, s.license_type, p.payment_method, p.payment_date
    FROM invoices i JOIN students s ON i.student_id = s.id LEFT JOIN payments p ON i.payment_id = p.id WHERE i.id = $1
  `, [id]);
}

async function getInvoicesByStudent(studentId) {
  return query('SELECT * FROM invoices WHERE student_id = $1 ORDER BY issue_date DESC', [studentId]);
}

async function getAllInvoices() {
  return query(`
    SELECT i.*, s.full_name, s.cin FROM invoices i
    JOIN students s ON i.student_id = s.id ORDER BY i.issue_date DESC
  `);
}

async function updateInvoiceStatus(id, status) {
  return run('UPDATE invoices SET status = $1 WHERE id = $2', [status, id]);
}

async function deleteInvoice(id) {
  return run('DELETE FROM invoices WHERE id = $1', [id]);
}

// ==================== DOCUMENTS ====================
async function createDocument(doc) {
  const result = await queryOne(
    'INSERT INTO documents (student_id, type, name, file_path, file_type, file_size, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
    [doc.student_id, doc.type, doc.name, doc.file_path, doc.file_type || null, doc.file_size || null, doc.description || null]
  );
  return { id: result.id };
}

async function getDocumentsByStudent(studentId) {
  return query('SELECT * FROM documents WHERE student_id = $1 ORDER BY created_at DESC', [studentId]);
}

async function getDocumentById(id) {
  return queryOne('SELECT * FROM documents WHERE id = $1', [id]);
}

async function deleteDocument(id) {
  return run('DELETE FROM documents WHERE id = $1', [id]);
}

async function getAllDocuments() {
  return query('SELECT d.*, s.full_name FROM documents d JOIN students s ON d.student_id = s.id ORDER BY d.created_at DESC');
}

// ==================== OFFERS ====================
async function getAllOffers() {
  return query('SELECT * FROM offers WHERE active = true ORDER BY name');
}

async function createOffer(offer) {
  const result = await queryOne('INSERT INTO offers (name, license_type, price, description) VALUES ($1, $2, $3, $4) RETURNING id', [offer.name, offer.license_type, offer.price, offer.description || null]);
  return { id: result.id };
}

async function updateOffer(id, offer) {
  return run('UPDATE offers SET name = $1, license_type = $2, price = $3, description = $4 WHERE id = $5', [offer.name, offer.license_type, offer.price, offer.description || null, id]);
}

async function deleteOffer(id) {
  return run('UPDATE offers SET active = false WHERE id = $1', [id]);
}

// ==================== DASHBOARD ====================
async function getDashboardStats() {
  const totalStudents = (await queryOne('SELECT COUNT(*) as count FROM students')).count;
  const activeStudents = (await queryOne("SELECT COUNT(*) as count FROM students WHERE status = 'En formation'")).count;
  const licensesObtained = (await queryOne("SELECT COUNT(*) as count FROM students WHERE license_obtained = true")).count;
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = (await queryOne('SELECT COUNT(*) as count FROM attendance WHERE date = $1', [today])).count;
  const totalRevenue = (await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments')).total;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const monthlyRevenue = (await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date >= $1', [monthStart])).total;
  const pendingPayments = (await queryOne("SELECT COUNT(*) as count FROM students s WHERE s.total_price > (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id)")).count;
  const upcomingReminders = await query("SELECT * FROM students WHERE reminder_date IS NOT NULL AND reminder_date >= CURRENT_DATE ORDER BY reminder_date LIMIT 5");
  const recentStudents = await query('SELECT * FROM students ORDER BY created_at DESC LIMIT 5');
  const recentPayments = await query('SELECT p.*, s.full_name FROM payments p JOIN students s ON p.student_id = s.id ORDER BY p.created_at DESC LIMIT 5');
  const alertsCounts = await getAlertsCounts();
  const todayStages = await getTodayStages();

  return { totalStudents, activeStudents, licensesObtained, todayAttendance, totalRevenue: parseFloat(totalRevenue), monthlyRevenue: parseFloat(monthlyRevenue), pendingPayments, upcomingReminders, recentStudents, recentPayments, alertsCounts, todayStages };
}

// ==================== SETTINGS ====================
async function getSettings() {
  return queryOne('SELECT * FROM settings WHERE id = 1');
}

async function updateSettings(settings) {
  return run(`
    UPDATE settings SET school_name = $1, address = $2, phone = $3, email = $4,
    default_training_days = $5, license_number = $6, tax_register = $7, commercial_register = $8,
    city = $9, web_reference = $10, fax = $11 WHERE id = 1
  `, [settings.school_name, settings.address || null, settings.phone || null, settings.email || null,
    settings.default_training_days || 30, settings.license_number || null, settings.tax_register || null,
    settings.commercial_register || null, settings.city || null, settings.web_reference || null, settings.fax || null]);
}

// ==================== INCIDENTS ====================
async function createIncident(incident) {
  const result = await queryOne('INSERT INTO incidents (student_id, type, severity, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING id', [incident.student_id, incident.type, incident.severity || 'Avertissement', incident.description, incident.date]);
  return { id: result.id };
}

async function getIncidentsByStudent(studentId) {
  return query('SELECT * FROM incidents WHERE student_id = $1 ORDER BY date DESC', [studentId]);
}

async function getAllIncidents() {
  return query('SELECT i.*, s.full_name, s.qr_code FROM incidents i JOIN students s ON i.student_id = s.id ORDER BY i.date DESC');
}

async function getUnresolvedIncidents() {
  return query('SELECT i.*, s.full_name, s.qr_code FROM incidents i JOIN students s ON i.student_id = s.id WHERE i.resolved = false ORDER BY i.date DESC');
}

async function resolveIncident(id, notes) {
  const today = new Date().toISOString().split('T')[0];
  return run('UPDATE incidents SET resolved = true, resolved_date = $1, resolved_notes = $2 WHERE id = $3', [today, notes || null, id]);
}

async function deleteIncident(id) {
  return run('DELETE FROM incidents WHERE id = $1', [id]);
}

async function getStudentIncidentsCount(studentId) {
  return queryOne(`
    SELECT COUNT(*) as total,
    SUM(CASE WHEN resolved = false THEN 1 ELSE 0 END) as unresolved,
    SUM(CASE WHEN severity = 'Grave' THEN 1 ELSE 0 END) as serious
    FROM incidents WHERE student_id = $1
  `, [studentId]);
}

// ==================== AUTH ====================
async function getAdminByUsername(username) {
  return queryOne('SELECT * FROM admins WHERE username = $1', [username]);
}

module.exports = {
  getDb, initDb, getAdminByUsername,
  getAllStudents, getStudentById, createStudent, updateStudent, updateStudentImage,
  deleteStudent, markLicenseObtained, updateStudentFollowUp,
  recordAttendanceIn, recordAttendanceOut, getAttendanceByStudent, getTodayAttendance,
  cleanupDuplicateAttendance, getStudentAttendanceStatus,
  createPayment, getPaymentsByStudent, getAllPayments, deletePayment,
  createPaymentSchedule, getPaymentSchedulesByStudent, markScheduleAsPaid, getOverduePayments, getUpcomingPayments,
  createStage, updateStage, deleteStage, getStagesByStudent, getAllStages, getUpcomingStages, getTodayStages,
  getSessionTimeStats, getStudentSessionTimeStats,
  getAllAlerts, getAlertsCounts,
  generateInvoiceNumber, createInvoice, getInvoiceById, getInvoicesByStudent, getAllInvoices, updateInvoiceStatus, deleteInvoice,
  createDocument, getDocumentsByStudent, getDocumentById, deleteDocument, getAllDocuments,
  getAllOffers, createOffer, updateOffer, deleteOffer,
  getDashboardStats, getSettings, updateSettings,
  createIncident, getIncidentsByStudent, getAllIncidents, getUnresolvedIncidents, resolveIncident, deleteIncident, getStudentIncidentsCount,
};
