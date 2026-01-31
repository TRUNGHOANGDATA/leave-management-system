-- Create public_holidays table
CREATE TABLE IF NOT EXISTS public_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

-- Create Policy for all access (since this is an internal tool, public read/write is fine for now based on app logic, 
-- but ideally should be restricted. Following previous pattern of "Enable all access")
CREATE POLICY "Enable all access" ON public_holidays 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Grant permissions which are often needed for the interaction
GRANT ALL ON public_holidays TO postgres, anon, authenticated, service_role;
