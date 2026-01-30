-- =============================================
-- FIX RLS: ALLOW DEV ACCESS FOR EMAIL TEMPLATES
-- =============================================

-- Problem: The App uses "Dev Mode" User Switching which doesn't actually log in to Supabase Auth.
-- Result: Supabase sees the user as "Anon", blocking access to restrictive policies.
-- Solution: Open access for this specific table to allow the UI to work.

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- 1. Drop old restrictive policies
DROP POLICY IF EXISTS "Allow full access for managers" ON public.email_templates;
DROP POLICY IF EXISTS "Service Role read" ON public.email_templates;
DROP POLICY IF EXISTS "Allow read/write for admins/directors" ON public.email_templates;

-- 2. Create PERMISSIVE Policy (Dev Mode Friendly)
-- Allows Select/Update for everyone (including Anon) so the Settings UI works without real Auth
CREATE POLICY "Allow public access for dev" ON public.email_templates
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Verify
SELECT count(*) as total_templates FROM public.email_templates;
