import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from './DashboardLayoutClient'
import { User, LeaveRequest } from '@/context/AppContext'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    // 1. Check Auth (Server Side Guard)
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Initialize Admin Client (Bypass RLS for Directory)
    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    // 2. Parallel Fetching for Hydration
    // We moved user profile fetch out for robustness, now just fetch users/requests
    const [usersRes, requestsRes] = await Promise.all([
        adminSupabase.from('users').select('*').order('name'),
        supabase.from('leave_requests').select('*').order('created_at', { ascending: false })
    ]);

    // 3. Map User Profile
    let initialUser: User | null = null;

    // Fetch profile with dual lookup (auth_id OR id)
    const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .or(`auth_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();

    if (profileData) {
        const p = profileData;
        initialUser = {
            id: p.id,
            auth_id: p.auth_id,
            email: p.email,
            name: p.name || p.email?.split('@')[0] || "User",
            role: p.role,
            department: p.department || "",
            managerId: p.manager_id,
            avatarUrl: p.avatar_url,
            employeeCode: p.employee_code,
            workLocation: p.work_location,
            startDate: p.start_date,
            jobTitle: p.job_title,
            phone: p.phone,
            annualLeaveRemaining: 0
        };
    }

    // 4. Map Users Directory
    const initialUsers: User[] = (usersRes.data || []).map((u: any) => ({
        id: u.id,
        auth_id: u.auth_id,
        name: u.name || u.email,
        email: u.email,
        role: u.role,
        department: u.department || "",
        managerId: u.manager_id,
        avatarUrl: u.avatar_url,
        employeeCode: u.employee_code,
        workLocation: u.work_location,
        startDate: u.start_date,
        jobTitle: u.job_title,
        phone: u.phone,
        annualLeaveRemaining: 0 // Client will calc
    }));

    // 5. Map Leave Requests
    const initialRequests: LeaveRequest[] = (requestsRes.data || []).map((r: any) => ({
        id: r.id,
        type: r.type,
        fromDate: r.from_date,
        toDate: r.to_date,
        duration: r.duration,
        daysAnnual: r.days_annual,
        daysUnpaid: r.days_unpaid,
        daysExempt: r.days_exempt,
        status: r.status,
        reason: r.reason,
        userId: r.user_id,
        approvedBy: r.approved_by,
        exemptionNote: r.exemption_note,
        requestDetails: r.request_details,
        createdAt: r.created_at // This was the missing field!
    }));

    return (
        <DashboardLayoutClient
            initialUser={initialUser}
            initialUsers={initialUsers}
            initialRequests={initialRequests}
        >
            {children}
        </DashboardLayoutClient>
    )
}
