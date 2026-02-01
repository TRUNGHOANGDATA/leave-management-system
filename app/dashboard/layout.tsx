import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from './DashboardLayoutClient'
import { User } from '@/context/AppContext'

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

    // 2. Fetch Profile for Hydration (Fix "Loading..." hang)
    let initialUser: User | null = null;
    try {
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', user.id)
            .single()

        if (profile) {
            initialUser = {
                id: profile.id,
                auth_id: profile.auth_id,
                email: profile.email,
                name: profile.name || profile.email?.split('@')[0] || "User",
                role: profile.role,
                department: profile.department || "",
                managerId: profile.manager_id,
                avatarUrl: profile.avatar_url,
                employeeCode: profile.employee_code,
                workLocation: profile.work_location,
                startDate: profile.start_date,
                jobTitle: profile.job_title,
                phone: profile.phone,
                annualLeaveRemaining: 0 // Placeholder, client will calculate with requests
            };
        }
    } catch (error) {
        console.error("Layout Profile Fetch Error:", error);
    }

    return <DashboardLayoutClient initialUser={initialUser}>{children}</DashboardLayoutClient>
}
