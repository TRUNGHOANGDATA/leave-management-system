
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email, otp, newPassword } = await request.json();

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Initialize Admin Client (Service Role)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        );

        // 1. Verify OTP
        const { data: resets, error: fetchError } = await supabaseAdmin
            .from('password_resets')
            .select('*')
            .eq('email', email)
            .eq('token', otp)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (fetchError || !resets || resets.length === 0) {
            return NextResponse.json({ error: "Mã xác nhận không hợp lệ hoặc đã hết hạn" }, { status: 400 });
        }

        const validReset = resets[0];

        // 2. Get User Auth ID
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('auth_id')
            .eq('email', email)
            .single();

        if (userError || !userData?.auth_id) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 3. Update Password in Supabase Auth
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userData.auth_id,
            { password: newPassword }
        );

        if (updateError) {
            console.error("Update Password Error:", updateError);
            return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
        }

        // 4. Mark OTP as used
        await supabaseAdmin
            .from('password_resets')
            .update({ used: true })
            .eq('id', validReset.id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Reset Password Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
