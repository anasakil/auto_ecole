-- ================================================
-- Auto-École Maroc - PostgreSQL (Supabase) Database Setup
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- Admin table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offers table (must be before students due to foreign key)
CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  license_type VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
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
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_in VARCHAR(10),
  time_out VARCHAR(10),
  status VARCHAR(50) DEFAULT 'Présent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
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
);

-- Payment schedules table
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
);

-- Stages table
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
);

-- Invoices table
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
);

-- Documents table
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
);

-- Incidents table
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
);

-- Trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for students
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for settings
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO settings (id, school_name) VALUES (1, 'Auto-École Maroc') ON CONFLICT (id) DO NOTHING;

-- NOTE: The app will auto-create the admin with proper bcrypt hash on first visit to /api/init
-- Just visit: https://yourdomain.com/api/init after deployment
