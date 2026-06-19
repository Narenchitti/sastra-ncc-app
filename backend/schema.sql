-- SASTRA NCC Database DDL Schema (PostgreSQL / Supabase)

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Hashed password (bcrypt)
    rank VARCHAR(50) NOT NULL, -- 'Cadet', 'Lance Corporal', 'Corporal', 'Sergeant', 'CSM', 'CUO', 'SUO', 'ANO'
    role VARCHAR(50) NOT NULL DEFAULT 'cadet', -- 'cadet', 'ANO'
    batch_year INTEGER NOT NULL,
    regimental_number VARCHAR(100),
    registration_number VARCHAR(100),
    dob VARCHAR(50),
    year_branch VARCHAR(255),
    hostel_info VARCHAR(255),
    camp_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL', -- 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ── EVENTS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    date VARCHAR(50) NOT NULL, -- YYYY-MM-DD
    start_time VARCHAR(20) NOT NULL, -- HH:MM
    end_time VARCHAR(20) NOT NULL, -- HH:MM
    location VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL -- 'Parade', 'Theory', 'Camp', 'Event'
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- ── PERMISSIONS (LEAVE REQUESTS) TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadet_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cadet_name VARCHAR(255) NOT NULL,
    start_date VARCHAR(50) NOT NULL, -- YYYY-MM-DD
    end_date VARCHAR(50) NOT NULL, -- YYYY-MM-DD
    reason TEXT NOT NULL,
    evidence_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'FORWARDED_TO_ANO', 'REJECTED_BY_SUO', 'APPROVED', 'DECLINED_BY_ANO', 'MEET_ANO'
    suo_comment TEXT,
    ano_comment TEXT,
    ai_status VARCHAR(50), -- 'VERIFIED', 'FLAGGED', 'ERROR', 'NO_EVIDENCE'
    ai_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_cadet ON permissions(cadet_id);
CREATE INDEX IF NOT EXISTS idx_permissions_status ON permissions(status);

-- ── ACHIEVEMENTS REGISTRY TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadet_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    date VARCHAR(50) NOT NULL, -- YYYY-MM-DD
    end_date VARCHAR(50),
    category VARCHAR(100) NOT NULL, -- 'Camp', 'Award', 'Certificate', 'Other'
    location VARCHAR(255),
    description TEXT NOT NULL,
    certificate_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PENDING', 'VERIFIED', 'REJECTED'
    is_verified BOOLEAN DEFAULT FALSE,
    ano_comment TEXT
);

CREATE INDEX IF NOT EXISTS idx_achievements_cadet ON achievements(cadet_id);
CREATE INDEX IF NOT EXISTS idx_achievements_status ON achievements(status);

-- ── ATTENDANCE LOGS TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- 'Present', 'Absent', 'Late', 'Permission'
    marked_by VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);

-- ── UNIT CONFIGURATION TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS unit_config (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'singleton',
    permission_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS) policies on Supabase for data isolation
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_config ENABLE ROW LEVEL SECURITY;

-- Add general public read policies or full access bypass for basic operations 
-- Note: Adjust these in production depending on user role checks
CREATE POLICY "Allow all access users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access permissions" ON permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access achievements" ON achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access unit_config" ON unit_config FOR ALL USING (true) WITH CHECK (true);
