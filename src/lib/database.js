const { Pool, types } = require('pg');
const { v4: uuidv4 } = require('uuid');

// PostgreSQL OID type constants
const PG_OID_DATE        = 1082;
const PG_OID_TIMESTAMP   = 1114;
const PG_OID_TIMESTAMPTZ = 1184;
const PG_OID_NUMERIC     = 1700;

const DEFAULT_TRAINING_DAYS = 30;
const TOKEN_EXPIRY_HOURS    = 24;
const BCRYPT_ROUNDS         = 10;

// Return dates as strings (not JS Date objects) to avoid timezone shifts
types.setTypeParser(PG_OID_DATE,        (val) => val); // 'YYYY-MM-DD'
types.setTypeParser(PG_OID_TIMESTAMP,   (val) => val);
types.setTypeParser(PG_OID_TIMESTAMPTZ, (val) => val);
// Return NUMERIC/DECIMAL as JS numbers (not strings)
types.setTypeParser(PG_OID_NUMERIC,     (val) => parseFloat(val));

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

// Transaction wrapper — ensures atomic multi-step operations
async function withTransaction(callback) {
  const db = getPool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Graceful shutdown — close pool on process exit to prevent connection leaks
process.on('beforeExit', async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
});

// ==================== INIT DB ====================
async function initDb() {
  const db = getPool();

  // Auto-ecoles table (multi-tenant)
  await db.query(`
    CREATE TABLE IF NOT EXISTS auto_ecoles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'admin',
      auto_ecole_id INT REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add role and auto_ecole_id columns if they don't exist (migration)
  await db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'role') THEN
        ALTER TABLE admins ADD COLUMN role VARCHAR(50) DEFAULT 'admin';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'auto_ecole_id') THEN
        ALTER TABLE admins ADD COLUMN auto_ecole_id INT REFERENCES auto_ecoles(id) ON DELETE CASCADE;
      END IF;
    END $$
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
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
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
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
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
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
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
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
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT UNIQUE NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      school_name VARCHAR(255) DEFAULT 'Auto-École',
      address TEXT,
      phone VARCHAR(50),
      gsm VARCHAR(50),
      email VARCHAR(255),
      fax VARCHAR(50),
      city VARCHAR(100),
      default_training_days INT DEFAULT 30,
      license_number VARCHAR(100),
      tax_register VARCHAR(100),
      commercial_register VARCHAR(100),
      tp VARCHAR(100),
      cnss VARCHAR(100),
      ice VARCHAR(100),
      capital VARCHAR(100),
      web_reference VARCHAR(255),
      logo TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_schedules (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
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
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
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
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      invoice_number VARCHAR(100) NOT NULL,
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
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(50),
      file_size INT,
      description TEXT,
      file_content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      auto_ecole_id INT NOT NULL REFERENCES auto_ecoles(id) ON DELETE CASCADE,
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

  // Migration: add auto_ecole_id to existing tables if missing
  const tables = ['offers', 'students', 'attendance', 'payments', 'payment_schedules', 'stages', 'invoices', 'documents', 'incidents'];
  for (const table of tables) {
    await db.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'auto_ecole_id') THEN
          ALTER TABLE ${table} ADD COLUMN auto_ecole_id INT REFERENCES auto_ecoles(id) ON DELETE CASCADE;
        END IF;
      END $$
    `);
  }

  // Migration: add file_content column to documents table if missing
  await db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'file_content') THEN
        ALTER TABLE documents ADD COLUMN file_content TEXT;
      END IF;
    END $$
  `);

  // Migration: add new settings columns if missing
  await db.query(`
    ALTER TABLE settings
      ADD COLUMN IF NOT EXISTS gsm VARCHAR(50),
      ADD COLUMN IF NOT EXISTS tp VARCHAR(100),
      ADD COLUMN IF NOT EXISTS cnss VARCHAR(100),
      ADD COLUMN IF NOT EXISTS ice VARCHAR(100),
      ADD COLUMN IF NOT EXISTS capital VARCHAR(100)
  `);

  // Migration for settings table
  await db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'auto_ecole_id') THEN
        ALTER TABLE settings ADD COLUMN auto_ecole_id INT REFERENCES auto_ecoles(id) ON DELETE CASCADE;
        ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
        ALTER TABLE settings ADD PRIMARY KEY (id);
      END IF;
    END $$
  `);

  // Migration: add logo column to settings if missing
  await db.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo TEXT");

  // Migration: ensure UNIQUE constraint on settings.auto_ecole_id (needed for ON CONFLICT)
  // First, remove orphan settings rows with NULL auto_ecole_id (would block UNIQUE)
  await db.query(`DELETE FROM settings WHERE auto_ecole_id IS NULL AND NOT EXISTS (SELECT 1 FROM settings WHERE auto_ecole_id IS NOT NULL HAVING COUNT(*) = 0)`);
  await db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'settings_auto_ecole_id_key'
      ) THEN
        -- Delete duplicate auto_ecole_id rows keeping lowest id
        DELETE FROM settings s1 USING settings s2
        WHERE s1.auto_ecole_id = s2.auto_ecole_id AND s1.id > s2.id;
        ALTER TABLE settings ADD CONSTRAINT settings_auto_ecole_id_key UNIQUE (auto_ecole_id);
      END IF;
    END $$
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

  // Create trigger for auto_ecoles table
  await db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_auto_ecoles_updated_at') THEN
        CREATE TRIGGER update_auto_ecoles_updated_at BEFORE UPDATE ON auto_ecoles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$
  `);

  // Seed default auto-ecole if empty
  const autoEcoleResult = await db.query('SELECT COUNT(*) as count FROM auto_ecoles');
  if (parseInt(autoEcoleResult.rows[0].count) === 0) {
    await db.query("INSERT INTO auto_ecoles (name, slug) VALUES ('Auto-École Maroc', 'auto-ecole-maroc')");
  }

  // Fix settings id column: ensure it has a sequence (SERIAL) for auto-increment
  await db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'settings_id_seq') THEN
        CREATE SEQUENCE settings_id_seq;
        PERFORM setval('settings_id_seq', COALESCE((SELECT MAX(id) FROM settings), 0) + 1, false);
        ALTER TABLE settings ALTER COLUMN id SET DEFAULT nextval('settings_id_seq');
        ALTER SEQUENCE settings_id_seq OWNED BY settings.id;
      ELSE
        PERFORM setval('settings_id_seq', COALESCE((SELECT MAX(id) FROM settings), 0) + 1, false);
      END IF;
    END $$
  `);

  // Seed settings for default auto-ecole if empty
  const settingsResult = await db.query('SELECT COUNT(*) as count FROM settings');
  if (parseInt(settingsResult.rows[0].count) === 0) {
    const defaultEcole = await queryOne('SELECT id FROM auto_ecoles ORDER BY id LIMIT 1');
    if (defaultEcole) {
      await db.query("INSERT INTO settings (auto_ecole_id, school_name) VALUES ($1, 'Auto-École Maroc')", [defaultEcole.id]);
    }
  }

  // Seed super admin if no admins exist
  const bcrypt = require('bcryptjs');
  const adminResult = await db.query('SELECT COUNT(*) as count FROM admins');
  if (parseInt(adminResult.rows[0].count) === 0) {
    const hashedPassword = await bcrypt.hash('Login@2026', BCRYPT_ROUNDS);
    await db.query('INSERT INTO admins (username, password, role, auto_ecole_id) VALUES ($1, $2, $3, NULL)', ['Login', hashedPassword, 'super_admin']);
  }

  // Migration: update existing admin to super_admin if they have no role set properly
  await db.query("UPDATE admins SET role = 'super_admin' WHERE username = 'admin' AND (role IS NULL OR role = 'admin') AND auto_ecole_id IS NULL");

  // Migration: assign existing data to default auto-ecole
  const defaultEcole = await queryOne('SELECT id FROM auto_ecoles ORDER BY id LIMIT 1');
  if (defaultEcole) {
    for (const table of tables) {
      await db.query(`UPDATE ${table} SET auto_ecole_id = $1 WHERE auto_ecole_id IS NULL`, [defaultEcole.id]);
    }
    // Also migrate settings
    await db.query('UPDATE settings SET auto_ecole_id = $1 WHERE auto_ecole_id IS NULL', [defaultEcole.id]);
  }

  // Create indexes for tenant filtering
  const indexTables = ['students', 'offers', 'attendance', 'payments', 'payment_schedules', 'stages', 'invoices', 'documents', 'incidents'];
  for (const table of indexTables) {
    await db.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_${table}_auto_ecole') THEN
          CREATE INDEX idx_${table}_auto_ecole ON ${table}(auto_ecole_id);
        END IF;
      END $$
    `);
  }

  // Migration: replace global UNIQUE on invoice_number with per-tenant unique
  await db.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_invoice_number_key') THEN
        ALTER TABLE invoices DROP CONSTRAINT invoices_invoice_number_key;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_auto_ecole_invoice_number_key') THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_auto_ecole_invoice_number_key UNIQUE (auto_ecole_id, invoice_number);
      END IF;
    END $$
  `);

  // Performance indexes
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
    CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
    CREATE INDEX IF NOT EXISTS idx_stages_date_status ON stages(scheduled_date, status);
    CREATE INDEX IF NOT EXISTS idx_payment_schedules_due ON payment_schedules(due_date, paid);
    CREATE INDEX IF NOT EXISTS idx_students_reminder ON students(reminder_date);
  `);
}

// ==================== AUTO-ECOLES ====================
async function getAllAutoEcoles() {
  return query(`
    SELECT ae.*,
      (SELECT COUNT(*) FROM students WHERE auto_ecole_id = ae.id) as student_count,
      (SELECT COUNT(*) FROM admins WHERE auto_ecole_id = ae.id) as admin_count
    FROM auto_ecoles ae ORDER BY ae.created_at DESC
  `);
}

async function getAutoEcoleById(id) {
  return queryOne('SELECT * FROM auto_ecoles WHERE id = $1', [id]);
}

async function getAutoEcoleBySlug(slug) {
  return queryOne('SELECT * FROM auto_ecoles WHERE slug = $1', [slug]);
}

async function createAutoEcole(data) {
  const result = await queryOne(
    'INSERT INTO auto_ecoles (name, slug) VALUES ($1, $2) RETURNING id',
    [data.name, data.slug]
  );
  return { id: result.id };
}

async function updateAutoEcole(id, data) {
  return run('UPDATE auto_ecoles SET name = $1, slug = $2, active = $3 WHERE id = $4',
    [data.name, data.slug, data.active !== false, id]);
}

async function deleteAutoEcole(id) {
  return run('DELETE FROM auto_ecoles WHERE id = $1', [id]);
}

async function getAdminsByAutoEcole(autoEcoleId) {
  return query('SELECT id, username, role, auto_ecole_id, created_at FROM admins WHERE auto_ecole_id = $1', [autoEcoleId]);
}

async function createTenantAdmin(autoEcoleId, username, password) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await queryOne(
    'INSERT INTO admins (username, password, role, auto_ecole_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [username, hashedPassword, 'admin', autoEcoleId]
  );
  return { id: result.id };
}

async function updateTenantAdminPassword(adminId, newPassword) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return run('UPDATE admins SET password = $1 WHERE id = $2', [hashedPassword, adminId]);
}

async function deleteTenantAdmin(adminId) {
  return run("DELETE FROM admins WHERE id = $1 AND role = 'admin'", [adminId]);
}

// ==================== STUDENTS ====================
async function getAllStudents(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const paginationClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`
    SELECT s.*, o.name as offer_name, o.price as offer_price,
      COALESCE(p.paid_amount, 0) as paid_amount,
      CASE WHEN s.total_price = 0 AND o.price IS NOT NULL THEN o.price ELSE s.total_price END as total_price
    FROM students s
    LEFT JOIN offers o ON s.offer_id = o.id
    LEFT JOIN (SELECT student_id, SUM(amount) as paid_amount FROM payments GROUP BY student_id) p ON p.student_id = s.id
    WHERE s.auto_ecole_id = $1
    ORDER BY s.created_at DESC
    ${paginationClause}
  `, [autoEcoleId]);
}

async function getStudentById(id, autoEcoleId) {
  const student = await queryOne(`
    SELECT s.*, o.name as offer_name, o.price as offer_price
    FROM students s
    LEFT JOIN offers o ON s.offer_id = o.id
    WHERE s.id = $1 AND s.auto_ecole_id = $2
  `, [id, autoEcoleId]);

  if (student) {
    student.payments = await getPaymentsByStudent(id, autoEcoleId);
    student.attendance = await getAttendanceByStudent(id, autoEcoleId);
    student.paid_amount = student.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    if ((student.total_price === null || student.total_price === undefined) && student.offer_price != null) {
      student.total_price = student.offer_price;
    }
  }
  return student;
}

async function createStudent(autoEcoleId, student) {
  const qrCode = `STU-${uuidv4().substring(0, 8).toUpperCase()}`;
  const result = await queryOne(`
    INSERT INTO students (auto_ecole_id, qr_code, full_name, cin, phone, address, license_type,
      registration_date, status, training_start_date, training_duration_days,
      offer_id, total_price, interested_licenses, reminder_date, internal_notes,
      profile_image, cin_document, birth_place, birth_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING id
  `, [
    autoEcoleId,
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

async function updateStudent(id, autoEcoleId, student) {
  return run(`
    UPDATE students SET
      full_name = $1, cin = $2, phone = $3, address = $4, license_type = $5,
      registration_date = $6, status = $7, training_start_date = $8, training_duration_days = $9,
      offer_id = $10, total_price = $11, interested_licenses = $12,
      reminder_date = $13, internal_notes = $14,
      birth_place = $15, birth_date = $16
    WHERE id = $17 AND auto_ecole_id = $18
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
    id,
    autoEcoleId
  ]);
}

async function updateStudentImage(id, autoEcoleId, field, imagePath) {
  const allowedFields = { profile_image: 'profile_image', cin_document: 'cin_document' };
  const safeField = allowedFields[field];
  if (!safeField) throw new Error('Invalid field');
  return run(`UPDATE students SET ${safeField} = $1 WHERE id = $2 AND auto_ecole_id = $3`, [imagePath, id, autoEcoleId]);
}

async function deleteStudent(id, autoEcoleId) {
  return run('DELETE FROM students WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function markLicenseObtained(id, autoEcoleId, licenseType, dateObtained) {
  return run(`
    UPDATE students SET
      license_obtained = true, license_obtained_type = $1, license_obtained_date = $2,
      status = 'Permis obtenu'
    WHERE id = $3 AND auto_ecole_id = $4
  `, [licenseType, dateObtained, id, autoEcoleId]);
}

async function updateStudentFollowUp(id, autoEcoleId, followUp) {
  return run(`
    UPDATE students SET
      interested_licenses = $1, reminder_date = $2, internal_notes = $3
    WHERE id = $4 AND auto_ecole_id = $5
  `, [followUp.interested_licenses, followUp.reminder_date, followUp.internal_notes, id, autoEcoleId]);
}

// ==================== ATTENDANCE ====================
async function recordAttendanceIn(autoEcoleId, studentId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const existing = await queryOne(
    'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND time_out IS NULL AND auto_ecole_id = $3',
    [studentId, today, autoEcoleId]
  );

  if (existing) {
    return { success: false, message: 'Déjà présent', attendance: existing };
  }

  const result = await queryOne(
    "INSERT INTO attendance (auto_ecole_id, student_id, date, time_in, status) VALUES ($1, $2, $3, $4, 'Présent') RETURNING id",
    [autoEcoleId, studentId, today, now]
  );

  const student = await queryOne('SELECT full_name FROM students WHERE id = $1 AND auto_ecole_id = $2', [studentId, autoEcoleId]);

  return { success: true, message: 'Entrée enregistrée', id: result.id, student_name: student?.full_name, time_in: now };
}

async function recordAttendanceOut(autoEcoleId, studentId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const existing = await queryOne(
    'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND time_out IS NULL AND auto_ecole_id = $3',
    [studentId, today, autoEcoleId]
  );

  if (!existing) {
    return { success: false, message: "Pas d'entrée enregistrée aujourd'hui" };
  }

  await run("UPDATE attendance SET time_out = $1, status = 'Sorti' WHERE id = $2", [now, existing.id]);
  const student = await queryOne('SELECT full_name FROM students WHERE id = $1 AND auto_ecole_id = $2', [studentId, autoEcoleId]);

  return { success: true, message: 'Sortie enregistrée', student_name: student?.full_name, time_out: now };
}

async function getAttendanceByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM attendance WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY date DESC, time_in DESC', [studentId, autoEcoleId]);
}

async function getTodayAttendance(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  return query(`
    SELECT a.*, s.full_name, s.qr_code FROM attendance a
    JOIN students s ON a.student_id = s.id WHERE a.date = $1 AND a.auto_ecole_id = $2 ORDER BY a.time_in DESC
  `, [today, autoEcoleId]);
}

async function cleanupDuplicateAttendance(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  const result = await run(`
    DELETE FROM attendance
    WHERE id IN (
      SELECT a1.id FROM attendance a1
      INNER JOIN attendance a2 ON a1.student_id = a2.student_id AND a1.date = a2.date AND a2.auto_ecole_id = $2
      WHERE a1.id > a2.id AND a1.date = $1 AND a1.auto_ecole_id = $2
    )
  `, [today, autoEcoleId]);
  return { deleted: result.rowCount || 0 };
}

async function getStudentAttendanceStatus(autoEcoleId, studentId) {
  const today = new Date().toISOString().split('T')[0];
  const record = await queryOne(
    'SELECT * FROM attendance WHERE student_id = $1 AND date = $2 AND time_out IS NULL AND auto_ecole_id = $3',
    [studentId, today, autoEcoleId]
  );
  return record ? 'present' : 'absent';
}

// ==================== PAYMENTS ====================
async function createPayment(autoEcoleId, payment) {
  const result = await queryOne(
    'INSERT INTO payments (auto_ecole_id, student_id, amount, payment_method, payment_date, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [autoEcoleId, payment.student_id, payment.amount, payment.payment_method || 'Cash', payment.payment_date, payment.notes || null]
  );
  return { id: result.id };
}

async function getPaymentsByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM payments WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY payment_date DESC', [studentId, autoEcoleId]);
}

async function getAllPayments(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const paginationClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`
    SELECT p.*, s.full_name, s.cin FROM payments p
    JOIN students s ON p.student_id = s.id WHERE p.auto_ecole_id = $1 ORDER BY p.payment_date DESC
    ${paginationClause}
  `, [autoEcoleId]);
}

async function deletePayment(id, autoEcoleId) {
  return run('DELETE FROM payments WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

// ==================== PAYMENT SCHEDULES ====================
async function createPaymentSchedule(autoEcoleId, studentId, schedules) {
  await run('DELETE FROM payment_schedules WHERE student_id = $1 AND auto_ecole_id = $2', [studentId, autoEcoleId]);
  for (let i = 0; i < schedules.length; i++) {
    await run(
      'INSERT INTO payment_schedules (auto_ecole_id, student_id, installment_number, amount, due_date) VALUES ($1, $2, $3, $4, $5)',
      [autoEcoleId, studentId, i + 1, schedules[i].amount, schedules[i].due_date]
    );
  }
  return { success: true };
}

async function getPaymentSchedulesByStudent(studentId, autoEcoleId) {
  return query(`
    SELECT ps.*, p.payment_date as actual_payment_date FROM payment_schedules ps
    LEFT JOIN payments p ON ps.payment_id = p.id WHERE ps.student_id = $1 AND ps.auto_ecole_id = $2 ORDER BY ps.installment_number
  `, [studentId, autoEcoleId]);
}

async function markScheduleAsPaid(scheduleId, paymentId, autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  return run('UPDATE payment_schedules SET paid = true, paid_date = $1, payment_id = $2 WHERE id = $3 AND auto_ecole_id = $4', [today, paymentId, scheduleId, autoEcoleId]);
}

async function getOverduePayments(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  return query(`
    SELECT ps.*, s.full_name, s.phone, s.total_price FROM payment_schedules ps
    JOIN students s ON ps.student_id = s.id WHERE ps.paid = false AND ps.due_date < $1 AND ps.auto_ecole_id = $2 ORDER BY ps.due_date
  `, [today, autoEcoleId]);
}

async function getUpcomingPayments(autoEcoleId, daysAhead = 7) {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const future = futureDate.toISOString().split('T')[0];
  return query(`
    SELECT ps.*, s.full_name, s.phone FROM payment_schedules ps
    JOIN students s ON ps.student_id = s.id WHERE ps.paid = false AND ps.due_date >= $1 AND ps.due_date <= $2 AND ps.auto_ecole_id = $3 ORDER BY ps.due_date
  `, [today, future, autoEcoleId]);
}

// ==================== STAGES ====================
async function createStage(autoEcoleId, stage) {
  const result = await queryOne(`
    INSERT INTO stages (auto_ecole_id, student_id, type, title, scheduled_date, scheduled_time, duration_minutes, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
  `, [autoEcoleId, stage.student_id, stage.type, stage.title, stage.scheduled_date, stage.scheduled_time || null, stage.duration_minutes || 60, stage.status || 'Planifié', stage.notes || null]);
  return { id: result.id };
}

async function updateStage(id, autoEcoleId, stage) {
  return run(`
    UPDATE stages SET type = $1, title = $2, scheduled_date = $3, scheduled_time = $4,
    duration_minutes = $5, status = $6, result = $7, notes = $8 WHERE id = $9 AND auto_ecole_id = $10
  `, [stage.type, stage.title, stage.scheduled_date, stage.scheduled_time || null, stage.duration_minutes || 60, stage.status, stage.result || null, stage.notes || null, id, autoEcoleId]);
}

async function deleteStage(id, autoEcoleId) {
  return run('DELETE FROM stages WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function getStagesByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM stages WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY scheduled_date DESC', [studentId, autoEcoleId]);
}

async function getAllStages(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const paginationClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`
    SELECT st.*, s.full_name, s.phone, s.license_type FROM stages st
    JOIN students s ON st.student_id = s.id WHERE st.auto_ecole_id = $1 ORDER BY st.scheduled_date DESC
    ${paginationClause}
  `, [autoEcoleId]);
}

async function getUpcomingStages(autoEcoleId, daysAhead = 7) {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const future = futureDate.toISOString().split('T')[0];
  return query(`
    SELECT st.*, s.full_name, s.phone, s.license_type FROM stages st
    JOIN students s ON st.student_id = s.id
    WHERE st.status = 'Planifié' AND st.scheduled_date >= $1 AND st.scheduled_date <= $2 AND st.auto_ecole_id = $3 ORDER BY st.scheduled_date
  `, [today, future, autoEcoleId]);
}

async function getTodayStages(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  return query(`
    SELECT st.*, s.full_name, s.phone, s.license_type FROM stages st
    JOIN students s ON st.student_id = s.id WHERE st.scheduled_date = $1 AND st.auto_ecole_id = $2 ORDER BY st.scheduled_time
  `, [today, autoEcoleId]);
}

async function getSessionTimeStats(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const weekStart = monday.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const buildQuery = (dateFilter, paramOffset) => `
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN duration_minutes ELSE 0 END), 0) as completed_minutes,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN duration_minutes ELSE 0 END), 0) as planned_minutes,
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN 1 ELSE 0 END), 0) as completed_count,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN 1 ELSE 0 END), 0) as planned_count,
      COALESCE(SUM(CASE WHEN type = 'Séance' AND status != 'Annulé' THEN duration_minutes ELSE 0 END), 0) as seance_minutes,
      COALESCE(SUM(CASE WHEN type = 'Examen' AND status != 'Annulé' THEN duration_minutes ELSE 0 END), 0) as examen_minutes,
      COALESCE(SUM(CASE WHEN type = 'Code' AND status != 'Annulé' THEN duration_minutes ELSE 0 END), 0) as code_minutes
    FROM stages WHERE status != 'Annulé' AND auto_ecole_id = $1 AND ${dateFilter}
  `;

  const day = await queryOne(buildQuery('scheduled_date = $2'), [autoEcoleId, today]);
  const week = await queryOne(buildQuery('scheduled_date >= $2'), [autoEcoleId, weekStart]);
  const month = await queryOne(buildQuery('scheduled_date >= $2'), [autoEcoleId, monthStart]);
  return { day, week, month };
}

async function getStudentSessionTimeStats(studentId, autoEcoleId) {
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
    FROM stages WHERE status != 'Annulé' AND student_id = $1 AND auto_ecole_id = $2 AND ${dateFilter}
  `;

  const day = await queryOne(buildQuery('scheduled_date = $3'), [studentId, autoEcoleId, today]);
  const week = await queryOne(buildQuery('scheduled_date >= $3'), [studentId, autoEcoleId, weekStart]);
  const month = await queryOne(buildQuery('scheduled_date >= $3'), [studentId, autoEcoleId, monthStart]);
  const total = await queryOne(`
    SELECT
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN duration_minutes ELSE 0 END), 0) as completed_minutes,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN duration_minutes ELSE 0 END), 0) as planned_minutes,
      COALESCE(SUM(CASE WHEN status IN ('Terminé','Réussi','Échoué') THEN 1 ELSE 0 END), 0) as completed_count,
      COALESCE(SUM(CASE WHEN status = 'Planifié' THEN 1 ELSE 0 END), 0) as planned_count
    FROM stages WHERE status != 'Annulé' AND student_id = $1 AND auto_ecole_id = $2
  `, [studentId, autoEcoleId]);

  return { day, week, month, total };
}

// ==================== ALERTS ====================
async function getAllAlerts(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  const alerts = [];

  const overduePaymentsData = await getOverduePayments(autoEcoleId);
  overduePaymentsData.forEach(p => {
    alerts.push({ type: 'payment_overdue', severity: 'danger', title: 'Paiement en retard', message: `${p.full_name} - Échéance ${p.installment_number}: ${p.amount} MAD`, date: p.due_date, student_id: p.student_id, related_id: p.id });
  });

  const upcomingPaymentsData = await getUpcomingPayments(autoEcoleId, 7);
  upcomingPaymentsData.forEach(p => {
    alerts.push({ type: 'payment_upcoming', severity: 'warning', title: 'Paiement à venir', message: `${p.full_name} - Échéance ${p.installment_number}: ${p.amount} MAD`, date: p.due_date, student_id: p.student_id, related_id: p.id });
  });

  const trainingEnding = await query(`
    SELECT *, (training_start_date + (training_duration_days || ' days')::INTERVAL) as end_date
    FROM students WHERE status = 'En formation' AND auto_ecole_id = $1
    AND (training_start_date + (training_duration_days || ' days')::INTERVAL) <= (CURRENT_DATE + INTERVAL '7 days')
    AND (training_start_date + (training_duration_days || ' days')::INTERVAL) >= CURRENT_DATE
  `, [autoEcoleId]);
  trainingEnding.forEach(s => {
    const endDate = s.end_date instanceof Date ? s.end_date.toISOString().split('T')[0] : s.end_date;
    alerts.push({ type: 'training_ending', severity: 'info', title: 'Formation se termine bientôt', message: `${s.full_name} - Fin prévue: ${endDate}`, date: endDate, student_id: s.id });
  });

  const trainingExpired = await query(`
    SELECT *, (training_start_date + (training_duration_days || ' days')::INTERVAL) as end_date
    FROM students WHERE status = 'En formation' AND auto_ecole_id = $1
    AND (training_start_date + (training_duration_days || ' days')::INTERVAL) < CURRENT_DATE
  `, [autoEcoleId]);
  trainingExpired.forEach(s => {
    const endDate = s.end_date instanceof Date ? s.end_date.toISOString().split('T')[0] : s.end_date;
    alerts.push({ type: 'training_expired', severity: 'danger', title: 'Formation expirée', message: `${s.full_name} - Formation terminée depuis ${endDate}`, date: endDate, student_id: s.id });
  });

  const upcomingStagesData = await getUpcomingStages(autoEcoleId, 7);
  upcomingStagesData.forEach(st => {
    const isExam = st.type === 'Examen';
    alerts.push({ type: isExam ? 'exam_upcoming' : 'session_upcoming', severity: isExam ? 'warning' : 'info', title: isExam ? 'Examen à venir' : 'Séance planifiée', message: `${st.full_name} - ${st.title} ${st.scheduled_time ? 'à ' + st.scheduled_time : ''}`, date: st.scheduled_date, student_id: st.student_id, related_id: st.id });
  });

  const todayStagesData = await getTodayStages(autoEcoleId);
  todayStagesData.forEach(st => {
    if (!alerts.find(a => a.related_id === st.id && a.type.includes('upcoming'))) {
      alerts.push({ type: 'stage_today', severity: 'success', title: "Aujourd'hui", message: `${st.full_name} - ${st.title} ${st.scheduled_time ? 'à ' + st.scheduled_time : ''}`, date: st.scheduled_date, student_id: st.student_id, related_id: st.id });
    }
  });

  const reminders = await query(`
    SELECT * FROM students WHERE reminder_date IS NOT NULL AND auto_ecole_id = $1
    AND reminder_date >= CURRENT_DATE AND reminder_date <= (CURRENT_DATE + INTERVAL '7 days') ORDER BY reminder_date
  `, [autoEcoleId]);
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

async function getAlertsCounts(autoEcoleId) {
  const alerts = await getAllAlerts(autoEcoleId);
  return { total: alerts.length, danger: alerts.filter(a => a.severity === 'danger').length, warning: alerts.filter(a => a.severity === 'warning').length, info: alerts.filter(a => a.severity === 'info').length };
}

// ==================== INVOICES ====================
async function generateInvoiceNumber(autoEcoleId) {
  const year = new Date().getFullYear();
  const lastInvoice = await queryOne(`SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 AND auto_ecole_id = $2 ORDER BY id DESC LIMIT 1`, [`FAC-${year}-%`, autoEcoleId]);
  let nextNum = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoice_number.split('-');
    nextNum = parseInt(parts[2]) + 1;
  }
  return `FAC-${year}-${String(nextNum).padStart(4, '0')}`;
}

async function createInvoice(autoEcoleId, invoice) {
  const invoiceNumber = await generateInvoiceNumber(autoEcoleId);
  const result = await queryOne(`
    INSERT INTO invoices (auto_ecole_id, invoice_number, student_id, payment_id, amount, issue_date, due_date, status, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
  `, [autoEcoleId, invoiceNumber, invoice.student_id, invoice.payment_id || null, invoice.amount, invoice.issue_date || new Date().toISOString().split('T')[0], invoice.due_date || null, invoice.status || 'Émise', invoice.notes || null]);
  return { id: result.id, invoice_number: invoiceNumber };
}

async function getInvoiceById(id, autoEcoleId) {
  return queryOne(`
    SELECT i.*, s.full_name, s.cin, s.phone, s.address, s.license_type, p.payment_method, p.payment_date
    FROM invoices i JOIN students s ON i.student_id = s.id LEFT JOIN payments p ON i.payment_id = p.id WHERE i.id = $1 AND i.auto_ecole_id = $2
  `, [id, autoEcoleId]);
}

async function getInvoicesByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM invoices WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY issue_date DESC', [studentId, autoEcoleId]);
}

async function getAllInvoices(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const paginationClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`
    SELECT i.*, s.full_name, s.cin FROM invoices i
    JOIN students s ON i.student_id = s.id WHERE i.auto_ecole_id = $1 ORDER BY i.issue_date DESC
    ${paginationClause}
  `, [autoEcoleId]);
}

async function updateInvoiceStatus(id, autoEcoleId, status) {
  return run('UPDATE invoices SET status = $1 WHERE id = $2 AND auto_ecole_id = $3', [status, id, autoEcoleId]);
}

async function deleteInvoice(id, autoEcoleId) {
  return run('DELETE FROM invoices WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

// ==================== DOCUMENTS ====================
async function createDocument(autoEcoleId, doc) {
  const result = await queryOne(
    'INSERT INTO documents (auto_ecole_id, student_id, type, name, file_path, file_type, file_size, description, file_content) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
    [autoEcoleId, doc.student_id, doc.type, doc.name, doc.file_path, doc.file_type || null, doc.file_size || null, doc.description || null, doc.file_content || null]
  );
  return { id: result.id };
}

async function getDocumentByPath(filePath, autoEcoleId) {
  if (autoEcoleId) {
    return queryOne('SELECT * FROM documents WHERE file_path = $1 AND auto_ecole_id = $2', [filePath, autoEcoleId]);
  }
  // No tenant filter — search across all tenants (used as fallback for file serving)
  return queryOne('SELECT * FROM documents WHERE file_path = $1', [filePath]);
}

async function getDocumentsByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM documents WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY created_at DESC', [studentId, autoEcoleId]);
}

async function getDocumentById(id, autoEcoleId) {
  return queryOne('SELECT * FROM documents WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function deleteDocument(id, autoEcoleId) {
  return run('DELETE FROM documents WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function getAllDocuments(autoEcoleId) {
  return query('SELECT d.*, s.full_name FROM documents d JOIN students s ON d.student_id = s.id WHERE d.auto_ecole_id = $1 ORDER BY d.created_at DESC', [autoEcoleId]);
}

// ==================== OFFERS ====================
async function getAllOffers(autoEcoleId) {
  return query('SELECT * FROM offers WHERE active = true AND auto_ecole_id = $1 ORDER BY name', [autoEcoleId]);
}

async function createOffer(autoEcoleId, offer) {
  const result = await queryOne('INSERT INTO offers (auto_ecole_id, name, license_type, price, description) VALUES ($1, $2, $3, $4, $5) RETURNING id', [autoEcoleId, offer.name, offer.license_type, offer.price, offer.description || null]);
  return { id: result.id };
}

async function updateOffer(id, autoEcoleId, offer) {
  return run('UPDATE offers SET name = $1, license_type = $2, price = $3, description = $4 WHERE id = $5 AND auto_ecole_id = $6', [offer.name, offer.license_type, offer.price, offer.description || null, id, autoEcoleId]);
}

async function deleteOffer(id, autoEcoleId) {
  return run('UPDATE offers SET active = false WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

// ==================== DASHBOARD ====================
async function getDashboardStats(autoEcoleId) {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [
    totalStudentsRow, activeStudentsRow, licensesObtainedRow,
    todayAttendanceRow, totalRevenueRow, monthlyRevenueRow,
    pendingPaymentsRow, upcomingReminders, recentStudents, recentPayments
  ] = await Promise.all([
    queryOne('SELECT COUNT(*) as count FROM students WHERE auto_ecole_id = $1', [autoEcoleId]),
    queryOne("SELECT COUNT(*) as count FROM students WHERE status = 'En formation' AND auto_ecole_id = $1", [autoEcoleId]),
    queryOne("SELECT COUNT(*) as count FROM students WHERE license_obtained = true AND auto_ecole_id = $1", [autoEcoleId]),
    queryOne('SELECT COUNT(*) as count FROM attendance WHERE date = $1 AND auto_ecole_id = $2', [today, autoEcoleId]),
    queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE auto_ecole_id = $1', [autoEcoleId]),
    queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date >= $1 AND auto_ecole_id = $2', [monthStart, autoEcoleId]),
    queryOne("SELECT COUNT(*) as count FROM students s WHERE s.auto_ecole_id = $1 AND s.total_price > (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE student_id = s.id)", [autoEcoleId]),
    query("SELECT * FROM students WHERE reminder_date IS NOT NULL AND reminder_date >= CURRENT_DATE AND auto_ecole_id = $1 ORDER BY reminder_date LIMIT 5", [autoEcoleId]),
    query('SELECT * FROM students WHERE auto_ecole_id = $1 ORDER BY created_at DESC LIMIT 5', [autoEcoleId]),
    query('SELECT p.*, s.full_name FROM payments p JOIN students s ON p.student_id = s.id WHERE p.auto_ecole_id = $1 ORDER BY p.created_at DESC LIMIT 5', [autoEcoleId]),
  ]);

  const [alertsCounts, todayStages] = await Promise.all([
    getAlertsCounts(autoEcoleId),
    getTodayStages(autoEcoleId),
  ]);

  return {
    totalStudents: parseInt(totalStudentsRow.count),
    activeStudents: parseInt(activeStudentsRow.count),
    licensesObtained: parseInt(licensesObtainedRow.count),
    todayAttendance: parseInt(todayAttendanceRow.count),
    totalRevenue: parseFloat(totalRevenueRow.total),
    monthlyRevenue: parseFloat(monthlyRevenueRow.total),
    pendingPayments: parseInt(pendingPaymentsRow.count),
    upcomingReminders, recentStudents, recentPayments, alertsCounts, todayStages
  };
}

// Super admin dashboard stats
async function getSuperAdminDashboardStats() {
  const totalAutoEcoles = (await queryOne('SELECT COUNT(*) as count FROM auto_ecoles')).count;
  const activeAutoEcoles = (await queryOne("SELECT COUNT(*) as count FROM auto_ecoles WHERE active = true")).count;
  const totalStudents = (await queryOne('SELECT COUNT(*) as count FROM students')).count;
  const totalRevenue = (await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments')).total;
  const autoEcoles = await query(`
    SELECT ae.*,
      (SELECT COUNT(*) FROM students WHERE auto_ecole_id = ae.id) as student_count,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE auto_ecole_id = ae.id) as revenue,
      (SELECT username FROM admins WHERE auto_ecole_id = ae.id LIMIT 1) as admin_username
    FROM auto_ecoles ae ORDER BY ae.created_at DESC
  `);
  return { totalAutoEcoles: parseInt(totalAutoEcoles), activeAutoEcoles: parseInt(activeAutoEcoles), totalStudents: parseInt(totalStudents), totalRevenue: parseFloat(totalRevenue), autoEcoles: autoEcoles.map(ae => ({ ...ae, student_count: parseInt(ae.student_count), revenue: parseFloat(ae.revenue) })) };
}

// ==================== SETTINGS ====================
async function getSettings(autoEcoleId) {
  return queryOne('SELECT * FROM settings WHERE auto_ecole_id = $1', [autoEcoleId]);
}

async function updateSettings(autoEcoleId, settings) {
  return run(`
    UPDATE settings SET school_name = $1, address = $2, phone = $3, email = $4,
    default_training_days = $5, license_number = $6, tax_register = $7, commercial_register = $8,
    city = $9, web_reference = $10, fax = $11, logo = $12,
    gsm = $13, tp = $14, cnss = $15, ice = $16, capital = $17
    WHERE auto_ecole_id = $18
  `, [settings.school_name, settings.address || null, settings.phone || null, settings.email || null,
    settings.default_training_days || 30, settings.license_number || null, settings.tax_register || null,
    settings.commercial_register || null, settings.city || null, settings.web_reference || null,
    settings.fax || null, settings.logo || null,
    settings.gsm || null, settings.tp || null, settings.cnss || null, settings.ice || null,
    settings.capital || null, autoEcoleId]);
}

async function createSettingsForAutoEcole(autoEcoleId, settings = {}) {
  return run(`INSERT INTO settings (auto_ecole_id, school_name, address, phone, gsm, email, fax, city, tax_register, commercial_register, tp, cnss, ice, capital, web_reference, logo)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (auto_ecole_id) DO UPDATE SET
      school_name = EXCLUDED.school_name,
      address = EXCLUDED.address,
      phone = EXCLUDED.phone,
      gsm = EXCLUDED.gsm,
      email = EXCLUDED.email,
      fax = EXCLUDED.fax,
      city = EXCLUDED.city,
      tax_register = EXCLUDED.tax_register,
      commercial_register = EXCLUDED.commercial_register,
      tp = EXCLUDED.tp,
      cnss = EXCLUDED.cnss,
      ice = EXCLUDED.ice,
      capital = EXCLUDED.capital,
      web_reference = EXCLUDED.web_reference,
      logo = EXCLUDED.logo`,
    [autoEcoleId, settings.school_name || 'Auto-École', settings.address || null, settings.phone || null,
     settings.gsm || null, settings.email || null, settings.fax || null, settings.city || null,
     settings.tax_register || null, settings.commercial_register || null,
     settings.tp || null, settings.cnss || null, settings.ice || null, settings.capital || null,
     settings.web_reference || null, settings.logo || null]);
}

// ==================== INCIDENTS ====================
async function createIncident(autoEcoleId, incident) {
  const result = await queryOne('INSERT INTO incidents (auto_ecole_id, student_id, type, severity, description, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [autoEcoleId, incident.student_id, incident.type, incident.severity || 'Avertissement', incident.description, incident.date]);
  return { id: result.id };
}

async function getIncidentsByStudent(studentId, autoEcoleId) {
  return query('SELECT * FROM incidents WHERE student_id = $1 AND auto_ecole_id = $2 ORDER BY date DESC', [studentId, autoEcoleId]);
}

async function getAllIncidents(autoEcoleId, { limit = null, offset = 0 } = {}) {
  const paginationClause = limit ? `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}` : '';
  return query(`SELECT i.*, s.full_name, s.qr_code FROM incidents i JOIN students s ON i.student_id = s.id WHERE i.auto_ecole_id = $1 ORDER BY i.date DESC ${paginationClause}`, [autoEcoleId]);
}

async function getUnresolvedIncidents(autoEcoleId) {
  return query('SELECT i.*, s.full_name, s.qr_code FROM incidents i JOIN students s ON i.student_id = s.id WHERE i.resolved = false AND i.auto_ecole_id = $1 ORDER BY i.date DESC', [autoEcoleId]);
}

async function resolveIncident(id, autoEcoleId, notes) {
  const today = new Date().toISOString().split('T')[0];
  return run('UPDATE incidents SET resolved = true, resolved_date = $1, resolved_notes = $2 WHERE id = $3 AND auto_ecole_id = $4', [today, notes || null, id, autoEcoleId]);
}

async function deleteIncident(id, autoEcoleId) {
  return run('DELETE FROM incidents WHERE id = $1 AND auto_ecole_id = $2', [id, autoEcoleId]);
}

async function getStudentIncidentsCount(studentId, autoEcoleId) {
  return queryOne(`
    SELECT COUNT(*) as total,
    SUM(CASE WHEN resolved = false THEN 1 ELSE 0 END) as unresolved,
    SUM(CASE WHEN severity = 'Grave' THEN 1 ELSE 0 END) as serious
    FROM incidents WHERE student_id = $1 AND auto_ecole_id = $2
  `, [studentId, autoEcoleId]);
}

// ==================== AUTH ====================
async function getAdminByUsername(username) {
  return queryOne(`
    SELECT a.*, ae.slug
    FROM admins a
    LEFT JOIN auto_ecoles ae ON a.auto_ecole_id = ae.id
    WHERE a.username = $1
  `, [username]);
}

module.exports = {
  getDb, initDb, withTransaction, getAdminByUsername,
  // Auto-ecoles
  getAllAutoEcoles, getAutoEcoleById, getAutoEcoleBySlug, createAutoEcole, updateAutoEcole, deleteAutoEcole,
  getAdminsByAutoEcole, createTenantAdmin, updateTenantAdminPassword, deleteTenantAdmin,
  createSettingsForAutoEcole, getSuperAdminDashboardStats,
  // Students
  getAllStudents, getStudentById, createStudent, updateStudent, updateStudentImage,
  deleteStudent, markLicenseObtained, updateStudentFollowUp,
  // Attendance
  recordAttendanceIn, recordAttendanceOut, getAttendanceByStudent, getTodayAttendance,
  cleanupDuplicateAttendance, getStudentAttendanceStatus,
  // Payments
  createPayment, getPaymentsByStudent, getAllPayments, deletePayment,
  createPaymentSchedule, getPaymentSchedulesByStudent, markScheduleAsPaid, getOverduePayments, getUpcomingPayments,
  // Stages
  createStage, updateStage, deleteStage, getStagesByStudent, getAllStages, getUpcomingStages, getTodayStages,
  getSessionTimeStats, getStudentSessionTimeStats,
  // Alerts
  getAllAlerts, getAlertsCounts,
  // Invoices
  generateInvoiceNumber, createInvoice, getInvoiceById, getInvoicesByStudent, getAllInvoices, updateInvoiceStatus, deleteInvoice,
  // Documents
  createDocument, getDocumentsByStudent, getDocumentById, getDocumentByPath, deleteDocument, getAllDocuments,
  // Offers
  getAllOffers, createOffer, updateOffer, deleteOffer,
  // Dashboard & Settings
  getDashboardStats, getSettings, updateSettings,
  // Incidents
  createIncident, getIncidentsByStudent, getAllIncidents, getUnresolvedIncidents, resolveIncident, deleteIncident, getStudentIncidentsCount,
};
