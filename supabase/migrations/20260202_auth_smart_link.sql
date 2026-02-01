-- Drop previous trigger/function to update logic
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Updated Function: Handle Smart Linking
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- 1. Check if an employee record already exists with this email (from Excel import)
  -- We assume imported users might have a placeholder ID or independent ID, 
  -- but we match strictly on EMAIL.
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE email = new.email
  LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    -- 2. CASE: USER EXISTS (from Excel)
    -- Update the existing record with the real Auth ID.
    -- This effectively "claims" the pre-filled profile.
    -- We perform a "Soft Delete" of the old row and Insert a fresh one OR 
    -- simpler: Update the ID if Supabase allows (Keys are tricky).
    -- BETTTER APPROACH for UUID PKs: 
    -- Since PK usually can't be changed easily if referenced, 
    -- we might merge data. But standard Supabase Auth relies on Auth ID matching Public ID.
    
    -- STRATEGY: Update the pre-existing row to match the NEW Auth ID.
    -- Note: If 'id' in public.users is FK to auth.users, we can't have record before auth.
    -- However, we likely made 'id' just a UUID. 
    -- If we imported data, 'id' was random UUID. We need to SWAP it to the new `new.id`.
    
    UPDATE public.users
    SET 
      id = new.id, -- Critical: Sync ID with Auth
      name = COALESCE(name, new.raw_user_meta_data->>'name'), -- Keep existing name if present, else use new
      avatar_url = COALESCE(avatar_url, new.raw_user_meta_data->>'avatar_url'),
      "annualLeaveRemaining" = COALESCE("annualLeaveRemaining", 12) -- Keep balance if set
    WHERE email = new.email;
    
  ELSE
    -- 3. CASE: NEW USER
    INSERT INTO public.users (id, email, name, role, department, "annualLeaveRemaining")
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      'employee', -- Default role
      'Chưa phân loại', -- Default department
      12
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
