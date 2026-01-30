-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'employee',
    department TEXT,
    manager_id TEXT REFERENCES users(id),
    avatar_url TEXT,
    employee_code TEXT UNIQUE,
    work_location TEXT,
    job_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure job_title exists (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='job_title') THEN
        ALTER TABLE users ADD COLUMN job_title TEXT;
    END IF;
END $$;

-- 3. Create Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT REFERENCES users(id),
    type TEXT,
    from_date TIMESTAMP WITH TIME ZONE,
    to_date TIMESTAMP WITH TIME ZONE,
    duration FLOAT,
    status TEXT DEFAULT 'pending',
    reason TEXT,
    approved_by_name TEXT,
    exemption_note TEXT,
    request_details JSONB,
    days_annual FLOAT DEFAULT 0,
    days_unpaid FLOAT DEFAULT 0,
    days_exempt FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id TEXT REFERENCES users(id),
    actor_name TEXT,
    message TEXT,
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insert Default Admin User (Important for first login)
INSERT INTO users (name, email, role, department, employee_code, work_location, job_title)
VALUES ('Quản trị mẫu', 'admin@company.com', 'admin', 'Ban Giám Đốc', 'NV_0001', 'Văn phòng chính', 'Quản trị viên')
ON CONFLICT (email) DO NOTHING;

-- 6. Enable Row Level Security (Recommended but optional - Set generic policy)
-- 6. Enable Row Level Security (Recommended but optional - Set generic policy)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON users;
CREATE POLICY "Public Access" ON users FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON leave_requests;
CREATE POLICY "Public Access" ON leave_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON notifications;
CREATE POLICY "Public Access" ON notifications FOR ALL USING (true) WITH CHECK (true);
