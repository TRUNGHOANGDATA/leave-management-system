import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface DbUser {
    id: string;
    email: string;
    name: string;
    role: 'employee' | 'manager' | 'admin' | 'hr';
    department: string | null;
    manager_id: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface DbLeaveRequest {
    id: string;
    user_id: string;
    type: string;
    from_date: string;
    to_date: string;
    duration: number;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    reason: string | null;
    approved_by: string | null;
    approved_at: string | null;
    request_details: {
        date: string;
        session: 'morning' | 'afternoon' | 'full';
    }[] | null;
    created_at: string;
    updated_at: string;
}
