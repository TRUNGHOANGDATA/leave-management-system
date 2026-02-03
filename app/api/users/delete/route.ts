import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // Initialize Supabase Admin Client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 1. Delete from public.users (Cascades to leave_requests)
        const { error: dbError, count } = await supabase
            .from('users')
            .delete({ count: 'exact' })
            .eq('id', userId)

        if (count === 0) {
            console.warn(`User ${userId} not found or already deleted.`)
        }

        if (dbError) {
            console.error('Database Delete Error:', dbError)
            return NextResponse.json({ error: dbError.message }, { status: 500 })
        }

        // 2. Try to delete from auth.users (if linked) - Optional/Advanced
        // Usually requires fetching auth_id first.
        const { data: userData } = await supabase
            .from('users')
            .select('auth_id')
            .eq('id', userId)
            .single()

        if (userData?.auth_id) {
            const { error: authError } = await supabase.auth.admin.deleteUser(userData.auth_id)
            if (authError) {
                console.warn("Auth user delete failed (non-critical):", authError)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete User Exception:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
