import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { userId, email } = await request.json()

        if (!userId || !email) {
            return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })
        }

        // Check if Service Role Key is available
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Cannot link profile.");
            return NextResponse.json({ error: 'Server configuration error: Service Role Key missing' }, { status: 500 })
        }

        // Create Admin Client to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
        )

        // 1. Check if user with this email exists but has NO auth_id
        const { data: existingUser, error: searchError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (searchError && searchError.code !== 'PGRST116') { // PGRST116 is "not found"
            return NextResponse.json({ error: searchError.message }, { status: 500 })
        }

        if (!existingUser) {
            return NextResponse.json({ message: 'No matching user found by email to link.' }, { status: 404 })
        }

        // 2. Link the profile by updating auth_id
        if (existingUser.auth_id === userId) {
            return NextResponse.json({ message: 'User already linked.', user: existingUser }, { status: 200 })
        }

        // Update
        const { data: updatedUser, error: updateError } = await supabaseAdmin
            .from('users')
            .update({ auth_id: userId })
            .eq('id', existingUser.id)
            .select()
            .single()

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ message: 'Profile linked successfully', user: updatedUser }, { status: 200 })

    } catch (error: any) {
        console.error("Link Profile API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
