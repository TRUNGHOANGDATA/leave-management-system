import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { requestId, status, approverName } = await request.json()
        const supabase = await createClient()

        // 1. Verify User Session
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Perform Update (RLS will be applied based on Server User)
        // If RLS is still an issue, we might need Service Role, but first try standard Server Client
        // Standard Server Client > Client SDK because it reliably has the cookie.
        const { data, error } = await supabase
            .from('leave_requests')
            .update({
                status: status,
                approved_by_name: approverName,
                approved_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .select()

        if (error) {
            console.error('Update Request Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data })

    } catch (error) {
        console.error('Update Request Exception:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
