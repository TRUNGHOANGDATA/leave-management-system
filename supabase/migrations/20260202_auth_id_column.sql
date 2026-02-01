-- =============================================
-- SOLUTION: Add separate auth_id column
-- This avoids all ID swapping and FK issues
-- =============================================

-- 1. Add auth_id column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- 2. Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Create new, simpler trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- Check if user with this email already exists (from Excel import)
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE email = new.email
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    -- User exists: Just link the auth_id
    -- This preserves ALL existing data and FK references!
    UPDATE public.users
    SET 
      auth_id = new.id,  -- Link to Supabase Auth
      name = COALESCE(name, new.raw_user_meta_data->>'name') -- Keep existing name
    WHERE email = new.email;
  ELSE
    -- New user: Create fresh record
    INSERT INTO public.users (id, auth_id, email, name, role, department, "annualLeaveRemaining")
    VALUES (
      new.id,  -- Use auth.id as primary key for new users
      new.id,  -- Also set auth_id
      new.email,
      COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      'employee',
      'Chưa phân loại',
      12
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
