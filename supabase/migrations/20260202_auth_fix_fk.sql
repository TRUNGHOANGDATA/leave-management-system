-- Drop previous logic
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Updated Function: Handle Smart Linking with ID Swap and Foreign Key Updates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_user_id UUID;
  old_user_record public.users%ROWTYPE;
BEGIN
  -- 1. Find existing user by EMAIL
  SELECT * INTO old_user_record
  FROM public.users
  WHERE email = new.email
  LIMIT 1;

  IF old_user_record.id IS NOT NULL THEN
    -- 2. CASE: USER EXISTS (from Excel)
    -- We need to SWAP the old ID with the new Auth ID.
    -- Since 'id' is PK and referenced by other tables, we must update references first.
    
    -- A. Update related tables to point to the NEW ID (even though new ID row doesn't exist yet? No, FK constraint will fail)
    -- Wait, we can't update FK to a non-existent ID.
    -- Strategy:
    -- 1. Insert NEW row with new ID and old data.
    -- 2. Update FKs in child tables to point to NEW ID.
    -- 3. Delete OLD row.
    
    INSERT INTO public.users (
      id, email, name, role, department, manager_id, avatar_url, 
      employee_code, work_location, start_date, job_title, phone, "annualLeaveRemaining"
    ) VALUES (
      new.id, -- The Auth ID
      new.email, -- The Auth Email
      old_user_record.name, -- Keep old Name
      old_user_record.role, -- Keep old Role
      old_user_record.department, -- Keep old Dept
      old_user_record.manager_id,
      old_user_record.avatar_url,
      old_user_record.employee_code,
      old_user_record.work_location,
      old_user_record.start_date,
      old_user_record.job_title,
      old_user_record.phone,
      old_user_record."annualLeaveRemaining"
    );

    -- B. Move Foreign Key References
    -- Update Leave Requests
    UPDATE public.leave_requests
    SET user_id = new.id
    WHERE user_id = old_user_record.id;
    
    -- Update Notifications (Recipient)
    UPDATE public.notifications
    SET recipient_id = new.id
    WHERE recipient_id = old_user_record.id;
    
    -- Update As Manager? (If this user is a manager for others)
    UPDATE public.users
    SET manager_id = new.id
    WHERE manager_id = old_user_record.id;

    -- C. Delete Old Row
    DELETE FROM public.users WHERE id = old_user_record.id;
    
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
