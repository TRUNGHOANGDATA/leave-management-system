import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    // 1. Find the user
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .ilike('name', '%Trần Hoàng Nam%')

    if (!users || users.length === 0) {
        return NextResponse.json({ message: "User not found" })
    }

    const user = users[0]

    // 2. Find requests
    const { data: requests } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)

    return NextResponse.json({
        user: {
            id: user.id,
            name: user.name,
            start_date: user.start_date,
            entitlement_calc_base: user.start_date
        },
        requests: requests
    })
}
