-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Storing plain text as per current app (Should upgrade to hash later)
    rank TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CADET', 'ANO', 'ADMIN')),
    regimental_number TEXT,
    batch_year INTEGER,
    camp_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    type TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadet_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    end_date DATE,
    category TEXT NOT NULL CHECK (category IN ('Camp', 'Sports', 'Cultural', 'Drill', 'Other')),
    location TEXT,
    description TEXT,
    certificate_url TEXT,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'VERIFIED', 'REJECTED')),
    is_verified BOOLEAN DEFAULT FALSE,
    ano_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cadet_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cadet_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    evidence_url TEXT,
    status TEXT DEFAULT 'PENDING_SUO', -- Can create Enum if needed
    suo_comment TEXT,
    ano_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Permission', 'OnDuty')),
    marked_by UUID, -- Can reference users(id)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 6. Enable Row Level Security (RLS) - Optional for now, but good practice
-- allowing public access for now to match current functionality, can restrict later
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read/write for demo purposes (Since we are using anon key for everything in the script)
-- IN PRODUCTION: You would restrict these!
CREATE POLICY "Public Access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON attendance FOR ALL USING (true) WITH CHECK (true);
