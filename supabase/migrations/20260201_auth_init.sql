-- Enable Row Level Security (RLS) on the public.users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a function to handle new user creation
-- This function will be called by the Trigger whenever a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, department, "annualLeaveRemaining")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), -- Use metadata name or fallback to email prefix
    'employee', -- Default role
    'Chưa phân loại', -- Default department
    12 -- Default leave balance
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the Trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Admin/Manager can view all profiles (Adjust based on exact logic needed later)
-- For now, let's allow authenticated users to read basic info of others (needed for "Handover" or "Team" view)
CREATE POLICY "Authenticated users can view all profiles" ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);
