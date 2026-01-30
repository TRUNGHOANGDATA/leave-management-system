-- =============================================
-- LEAVE MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Run this script in Supabase SQL Editor after creating a new project
-- =============================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: users (Employee profiles)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'director', 'manager', 'deputy_manager', 'team_leader', 'employee')),
    department TEXT,
    manager_id UUID REFERENCES public.users(id),
    avatar_url TEXT,
    employee_code TEXT UNIQUE,
    work_location TEXT,
    job_title TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: leave_requests
-- =============================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('annual', 'unpaid', 'mixed')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    duration NUMERIC DEFAULT 0,
    days_annual NUMERIC DEFAULT 0,
    days_unpaid NUMERIC DEFAULT 0,
    days_exempt NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reason TEXT,
    exemption_note TEXT,
    approved_by UUID REFERENCES public.users(id),
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    request_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: notifications
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    actor_name TEXT,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all for users" ON public.users;
DROP POLICY IF EXISTS "Allow all for leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow all for notifications" ON public.notifications;

-- Simple policies: Allow all operations (adjust for production security later)
CREATE POLICY "Allow all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for leave_requests" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- SEED DATA: Initial Admin User
-- =============================================
INSERT INTO public.users (id, email, name, role, department, employee_code)
VALUES 
    (uuid_generate_v4(), 'admin@company.com', 'System Admin', 'admin', 'Management', 'ADMIN_001')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_employee_code ON public.users(employee_code);

-- =============================================
-- DONE! Your database is ready.
-- =============================================
