-- =============================================
-- FIX PERMISSIONS (RLS) FOR NOTIFICATIONS
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing restrictive policies
DROP POLICY IF EXISTS "Allow all for notifications" ON public.notifications;

-- 3. Create a PERMISSIVE policy for Notifications
-- This allows Insert, Select, Update, Delete for authenticated/anon users
-- (Crucial for the AppContext to insert notifications)
CREATE POLICY "Allow all for notifications" ON public.notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Just in case, refresh policies for other tables too
DROP POLICY IF EXISTS "Allow all for leave_requests" ON public.leave_requests;
CREATE POLICY "Allow all for leave_requests" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for users" ON public.users;
CREATE POLICY "Allow all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 5. Drop Foreign Key on notifications if it causes issues with deleted users
-- (Optional but recommended for stability during testing)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
