import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
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

        // Fetch minimal user data for directory
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, department, role, manager_id, avatar_url, job_title')
            .order('name')

        if (error) {
            console.error('Directory Fetch Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ users })
    } catch (error) {
        console.error('Directory API Exception:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
